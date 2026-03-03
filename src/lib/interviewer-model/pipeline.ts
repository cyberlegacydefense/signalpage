/**
 * SignalPage.ai — Interviewer Model API Pipeline
 *
 * "Prepare with an AI model that thinks like your interviewer."
 *
 * Handles the Claude API call, response parsing, and error recovery.
 * Designed for use in Next.js API routes or server actions.
 *
 * Usage:
 *   import { generateInterviewerModel } from './pipeline'
 *   const briefing = await generateInterviewerModel({ resume, jobDescription, interviewerProfiles })
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  buildInterviewerModelPrompt,
  type InterviewerModelInput,
} from "./system-prompt";

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────

// Use Haiku for speed (critical for serverless timeout limits)
// Switch to Sonnet for higher quality if timeout issues are resolved
const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 8192;
const TEMPERATURE = 0.3; // Low temp for structured, consistent output

// ─────────────────────────────────────────────
// MAIN PIPELINE
// ─────────────────────────────────────────────

export async function generateInterviewerModel(
  input: InterviewerModelInput
): Promise<InterviewerModelBriefing> {
  const client = new Anthropic(); // Uses ANTHROPIC_API_KEY env var

  const { system, user } = buildInterviewerModelPrompt(input);

  // Step 1: Build the model
  const response = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    system,
    messages: [{ role: "user", content: user }],
  });

  // Step 2: Extract text content
  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude API");
  }

  // Step 3: Parse JSON (with cleanup for any accidental markdown wrapping)
  const cleaned = textBlock.text
    .replace(/^```json\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let briefing: InterviewerModelBriefing;
  try {
    briefing = JSON.parse(cleaned);
  } catch (parseError) {
    console.error("JSON parse failed. Raw response:", textBlock.text);
    throw new Error(
      `Failed to parse Interviewer Model response: ${parseError}`
    );
  }

  // Step 4: Validate minimum structure
  validateBriefing(briefing);

  return briefing;
}

// ─────────────────────────────────────────────
// STREAMING VARIANT (for real-time UI updates)
// ─────────────────────────────────────────────

export async function generateInterviewerModelStream(
  input: InterviewerModelInput,
  onChunk: (chunk: string) => void
): Promise<InterviewerModelBriefing> {
  const client = new Anthropic();
  const { system, user } = buildInterviewerModelPrompt(input);

  let fullText = "";

  const stream = await client.messages.stream({
    model: ANTHROPIC_MODEL,
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    system,
    messages: [{ role: "user", content: user }],
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      fullText += event.delta.text;
      onChunk(event.delta.text);
    }
  }

  const cleaned = fullText
    .replace(/^```json\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return JSON.parse(cleaned);
}

// ─────────────────────────────────────────────
// ENRICHMENT: LinkedIn Profile Text Extractor
// ─────────────────────────────────────────────

/**
 * Extracts structured text from a pasted LinkedIn profile.
 * Users paste their interviewer's LinkedIn page content;
 * this cleans it into a usable format for the prompt.
 */
export function parseLinkedInPaste(rawText: string): {
  name: string;
  headline: string;
  summary: string;
  experience: string;
  education: string;
  skills: string;
  recommendations: string;
  rawCleaned: string;
} {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // LinkedIn profiles when copied have a somewhat predictable structure.
  // This is a best-effort parser — the AI will handle messy input gracefully.
  const sections: Record<string, string[]> = {};
  let currentSection = "header";
  sections[currentSection] = [];

  const sectionHeaders = [
    "experience",
    "education",
    "skills",
    "recommendations",
    "about",
    "licenses & certifications",
    "volunteer experience",
    "publications",
    "projects",
    "honors & awards",
    "activity",
  ];

  for (const line of lines) {
    const lower = line.toLowerCase();
    const matchedSection = sectionHeaders.find(
      (h) => lower === h || lower === h + ":"
    );
    if (matchedSection) {
      currentSection = matchedSection;
      sections[currentSection] = [];
    } else {
      if (!sections[currentSection]) sections[currentSection] = [];
      sections[currentSection].push(line);
    }
  }

  return {
    name: sections["header"]?.[0] || "Unknown",
    headline: sections["header"]?.[1] || "",
    summary: (sections["about"] || []).join("\n"),
    experience: (sections["experience"] || []).join("\n"),
    education: (sections["education"] || []).join("\n"),
    skills: (sections["skills"] || []).join(", "),
    recommendations: (sections["recommendations"] || []).join("\n"),
    rawCleaned: lines.join("\n"),
  };
}

// ─────────────────────────────────────────────
// MULTI-INTERVIEWER PANEL STRATEGY
// ─────────────────────────────────────────────

/**
 * For panel interviews, generates individual models
 * then a unified panel dynamics analysis via a second API call.
 */
export async function generatePanelStrategy(
  input: InterviewerModelInput
): Promise<{
  interviewerModels: InterviewerModelBriefing;
  panelDynamics: PanelDynamics;
}> {
  // First pass: full model with all interviewers
  const interviewerModels = await generateInterviewerModel(input);

  // Second pass: panel dynamics analysis
  const client = new Anthropic();

  const panelResponse = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 2048,
    temperature: TEMPERATURE,
    system: PANEL_DYNAMICS_PROMPT,
    messages: [
      {
        role: "user",
        content: `<interviewer_models>\n${JSON.stringify(interviewerModels, null, 2)}\n</interviewer_models>\n\nAnalyze the panel dynamics across these interviewer models and generate a unified strategy.`,
      },
    ],
  });

  const textBlock = panelResponse.content.find((b) => b.type === "text");
  const panelDynamics = JSON.parse(
    (textBlock as { type: "text"; text: string })?.text
      ?.replace(/^```json\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim() || "{}"
  );

  return { interviewerModels, panelDynamics };
}

const PANEL_DYNAMICS_PROMPT = `You are a panel interview strategist. Given individual interviewer models, analyze the GROUP dynamics — how these specific people interact, where they'll agree and disagree on a candidate, and how the candidate should navigate the room.

Respond ONLY with valid JSON:
{
  "panel_power_map": {
    "decision_maker": "Who likely has final say and why",
    "influencer": "Who shapes the decision-maker's opinion",
    "evaluator": "Who's checking specific boxes (technical, cultural, etc.)"
  },
  "potential_tensions": [
    {
      "between": ["Interviewer A", "Interviewer B"],
      "tension": "What they might disagree on regarding the candidate",
      "your_play": "How to navigate it"
    }
  ],
  "unified_narrative": "The one story that resonates with ALL panelists — find the common thread across their models",
  "attention_strategy": {
    "who_to_address_most": "string",
    "eye_contact_pattern": "How to distribute attention",
    "when_to_pivot": "Signals that you should shift focus to a different panelist"
  },
  "danger_scenarios": [
    {
      "scenario": "A realistic bad moment in the panel",
      "recovery": "How to recover"
    }
  ]
}`;

// ─────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────

function validateBriefing(briefing: any): asserts briefing is InterviewerModelBriefing {
  if (!briefing.meta) throw new Error("Missing meta in briefing");
  if (!briefing.interviewer_models?.length)
    throw new Error("Missing interviewer_models");
  if (!briefing.predicted_questions?.length)
    throw new Error("Missing predicted_questions");
  if (!briefing.rapport_strategy)
    throw new Error("Missing rapport_strategy");
  if (!briefing.strategic_positioning)
    throw new Error("Missing strategic_positioning");
}

// ─────────────────────────────────────────────
// TYPES (Briefing output)
// ─────────────────────────────────────────────

export interface InterviewerModelBriefing {
  meta: {
    generated_at: string;
    candidate_name: string;
    target_role: string;
    target_company: string;
    interview_type: string;
    model_confidence: "HIGH" | "MEDIUM" | "LOW";
    data_sources_used: string[];
  };
  interviewer_models: InterviewerAnalysis[];
  predicted_questions: PredictedQuestion[];
  rapport_strategy: RapportStrategy;
  strategic_positioning: StrategicPositioning;
  pre_interview_checklist: PreInterviewChecklist;
}

export interface InterviewerAnalysis {
  name: string;
  current_role: string;
  company: string;
  career_archetype: {
    label: string;
    description: string;
    confidence: "HIGH" | "MEDIUM" | "LOW";
  };
  thinking_style: {
    primary_mode: string;
    decision_making: string;
    what_impresses_them: string;
    what_concerns_them: string;
    confidence: "HIGH" | "MEDIUM" | "LOW";
  };
  communication_style: {
    pace_preference: string;
    formality: string;
    language_patterns: string[];
    evidence: string;
    confidence: "HIGH" | "MEDIUM" | "LOW";
  };
  values_and_priorities: {
    stated_values: string[];
    inferred_values: string[];
    hot_buttons: string[];
    likely_dealbreakers: string[];
    confidence: "HIGH" | "MEDIUM" | "LOW";
  };
  interview_behavior_model: {
    likely_opening_style: string;
    question_depth: string;
    likely_focus_areas: string[];
    power_dynamics: string;
    red_flags_they_watch_for: string[];
    hiring_lens: string;
    confidence: "HIGH" | "MEDIUM" | "LOW";
  };
}

export interface PredictedQuestion {
  question: string;
  category: string;
  why_this_interviewer_asks_it: string;
  what_theyre_really_assessing: string;
  recommended_approach: {
    framework: string;
    key_points_to_hit: string[];
    tone: string;
    mirror_language: string[];
    time_target_seconds: number;
  };
  sample_answer_scaffold: string;
  danger_zone: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
}

export interface RapportStrategy {
  shared_ground: Array<{
    topic: string;
    your_angle: string;
    source: string;
  }>;
  opening_moves: {
    if_they_lead_with_rapport: string;
    if_they_lead_with_business: string;
  };
  topics_to_avoid: string[];
  cultural_alignment_signals: string[];
}

export interface StrategicPositioning {
  your_narrative_arc: string;
  key_differentiators: Array<{
    differentiator: string;
    why_this_interviewer_cares: string;
    how_to_surface_it: string;
  }>;
  vulnerability_management: Array<{
    potential_concern: string;
    why_theyll_notice: string;
    reframe_strategy: string;
  }>;
  closing_questions_to_ask_them: Array<{
    question: string;
    strategic_intent: string;
    personalization: string;
  }>;
}

export interface PreInterviewChecklist {
  "60_min_before": string[];
  "15_min_before": string[];
  mindset_anchor: string;
}

export interface PanelDynamics {
  panel_power_map: {
    decision_maker: string;
    influencer: string;
    evaluator: string;
  };
  potential_tensions: Array<{
    between: string[];
    tension: string;
    your_play: string;
  }>;
  unified_narrative: string;
  attention_strategy: {
    who_to_address_most: string;
    eye_contact_pattern: string;
    when_to_pivot: string;
  };
  danger_scenarios: Array<{
    scenario: string;
    recovery: string;
  }>;
}
