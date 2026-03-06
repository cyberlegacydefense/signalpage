/**
 * SignalPage.ai — Interviewer Model: Practice Session Manager
 *
 * Manages the stateful multi-turn conversation between candidate
 * and the AI interviewer persona. Handles:
 * - Session initialization (builds persona from briefing)
 * - Turn-by-turn conversation with state tracking
 * - Automatic interview pacing
 * - Post-interview debrief generation
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  buildPersonaPrompt,
  buildOpeningPrompt,
  buildDebriefPrompt,
  type PracticeSessionConfig,
  type PracticeMessage,
  type PracticeSession,
} from "./persona-engine";

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────

const MODEL = "claude-haiku-4-5-20251001"; // Haiku for fast responses
const MAX_TOKENS = 1024;       // Per-turn limit (interviewer responses should be concise)
const DEBRIEF_MAX_TOKENS = 4096;
const TEMPERATURE = 0.6;       // Slightly higher than briefing — we want natural, varied speech

// ─────────────────────────────────────────────
// SESSION MANAGER
// ─────────────────────────────────────────────

export class PracticeSessionManager {
  private client: Anthropic;
  private session: PracticeSession;
  private systemPrompt: string;

  constructor(config: PracticeSessionConfig) {
    this.client = new Anthropic();
    this.systemPrompt = buildPersonaPrompt(config);
    this.session = {
      sessionId: crypto.randomUUID(),
      config,
      messages: [],
      status: "active",
    };
  }

  // ── Start the interview ──
  async startInterview(): Promise<InterviewerTurn> {
    const openingPrompt = buildOpeningPrompt(this.session.config);

    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      system: this.systemPrompt,
      messages: [{ role: "user", content: openingPrompt }],
    });

    const parsed = this.parseResponse(response);

    this.session.messages.push({
      role: "interviewer",
      content: parsed.dialogue,
      meta: {
        question_category: "opening",
        assessment_note: parsed.internal_assessment,
        turn_number: 1,
      },
    });

    return {
      dialogue: parsed.dialogue,
      emotionalTone: parsed.emotional_tone,
      turnNumber: 1,
      sessionStatus: "active",
    };
  }

  // ── Candidate responds, interviewer replies ──
  async respondToCandidate(candidateMessage: string): Promise<InterviewerTurn> {
    const turnNumber = this.session.messages.length + 1;
    const maxTurns = this.session.config.maxTurns || 20;

    // Record candidate's message
    this.session.messages.push({
      role: "candidate",
      content: candidateMessage,
      meta: { turn_number: turnNumber },
    });

    // Check if we should wrap up
    const isNearEnd = turnNumber >= maxTurns - 2;
    const shouldWrapUp = turnNumber >= maxTurns;

    // Build conversation history for Claude
    const claudeMessages = this.buildClaudeMessages(isNearEnd, shouldWrapUp);

    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      system: this.systemPrompt,
      messages: claudeMessages,
    });

    const parsed = this.parseResponse(response);

    // Record interviewer's response
    this.session.messages.push({
      role: "interviewer",
      content: parsed.dialogue,
      meta: {
        question_category: parsed.next_move,
        assessment_note: parsed.internal_assessment,
        turn_number: turnNumber + 1,
      },
    });

    // Check if interview is complete
    if (shouldWrapUp || parsed.next_move === "wrap_up") {
      this.session.status = "completed";
    }

    return {
      dialogue: parsed.dialogue,
      emotionalTone: parsed.emotional_tone,
      turnNumber: turnNumber + 1,
      sessionStatus: this.session.status,
      nextMove: parsed.next_move,
    };
  }

  // ── Generate post-interview debrief ──
  async generateDebrief(): Promise<DebriefResult> {
    this.session.status = "debriefing";

    const debriefPrompt = buildDebriefPrompt(
      this.session.config,
      this.session.messages
    );

    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: DEBRIEF_MAX_TOKENS,
      temperature: 0.3, // Lower temp for analytical debrief
      system: "You are a post-interview debrief engine. Analyze the practice interview and provide actionable feedback.",
      messages: [{ role: "user", content: debriefPrompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No debrief response");
    }

    const cleaned = textBlock.text
      .replace(/^```json\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    return JSON.parse(cleaned);
  }

  // ── Get internal assessments (hidden during interview, available after) ──
  getAssessments(): Array<{ turn: number; assessment: string }> {
    return this.session.messages
      .filter((m) => m.role === "interviewer" && m.meta?.assessment_note)
      .map((m) => ({
        turn: m.meta!.turn_number,
        assessment: m.meta!.assessment_note!,
      }));
  }

  // ── Get session state ──
  getSession(): PracticeSession {
    return { ...this.session };
  }

  // ─────────────────────────────────────────
  // INTERNAL HELPERS
  // ─────────────────────────────────────────

  private buildClaudeMessages(
    isNearEnd: boolean,
    shouldWrapUp: boolean
  ): Array<{ role: "user" | "assistant"; content: string }> {
    const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

    // Opening instruction
    messages.push({
      role: "user",
      content: buildOpeningPrompt(this.session.config),
    });

    // Reconstruct conversation history
    for (const msg of this.session.messages) {
      if (msg.role === "interviewer") {
        // Reconstruct as JSON format the model expects
        messages.push({
          role: "assistant",
          content: JSON.stringify({
            dialogue: msg.content,
            internal_assessment: msg.meta?.assessment_note || "",
            next_move: msg.meta?.question_category || "new_question",
            emotional_tone: "neutral",
            turn_number: msg.meta?.turn_number || 0,
          }),
        });
      } else {
        // Candidate messages get pacing cues appended
        let content = msg.content;
        if (shouldWrapUp) {
          content += "\n\n[SYSTEM: This is the final exchange. Wrap up the interview naturally — ask if they have questions, then close.]";
        } else if (isNearEnd) {
          content += "\n\n[SYSTEM: The interview is nearing its end. Begin transitioning toward closing — 1-2 more questions max, then ask for candidate questions.]";
        }
        messages.push({ role: "user", content });
      }
    }

    return messages;
  }

  private parseResponse(response: Anthropic.Message): PersonaResponse {
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No response from interviewer persona");
    }

    const cleaned = textBlock.text
      .replace(/^```json\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      // If JSON parsing fails, treat the whole response as dialogue
      // (graceful degradation — the persona sometimes breaks format)
      return {
        dialogue: textBlock.text,
        internal_assessment: "Unable to parse structured response",
        next_move: "new_question",
        emotional_tone: "neutral",
        turn_number: this.session.messages.length + 1,
      };
    }
  }
}

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface PersonaResponse {
  dialogue: string;
  internal_assessment: string;
  next_move: string;
  emotional_tone: string;
  turn_number: number;
}

export interface InterviewerTurn {
  dialogue: string;
  emotionalTone: string;
  turnNumber: number;
  sessionStatus: PracticeSession["status"];
  nextMove?: string;
}

export interface DebriefResult {
  overall_performance: {
    score: number;
    hiring_decision: "STRONG_YES" | "LEAN_YES" | "LEAN_NO" | "STRONG_NO";
    one_line_summary: string;
  };
  moment_by_moment: Array<{
    turn: number;
    what_you_said: string;
    what_worked: string;
    what_missed: string;
    what_interviewer_was_thinking: string;
  }>;
  strengths: Array<{
    strength: string;
    evidence: string;
    impact: string;
  }>;
  improvement_areas: Array<{
    area: string;
    specific_moment: string;
    better_approach: string;
    practice_tip: string;
  }>;
  mirror_language_usage: {
    terms_you_used: string[];
    terms_you_missed: string[];
    impact: string;
  };
  vulnerability_handling: Array<{
    vulnerability: string;
    how_you_handled_it: string;
    effectiveness: string;
    alternative_approach: string;
  }>;
  next_session_focus: string;
}
