/**
 * SignalPage.ai — Interviewer Model: Practice Session API
 *
 * Sessions are persisted to database for durability across refreshes.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  buildPersonaPrompt,
  buildOpeningPrompt,
  buildDebriefPrompt,
  type PracticeSessionConfig,
} from "@/lib/interviewer-model/persona-engine";

const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 1024;
const DEBRIEF_MAX_TOKENS = 4096;
const TEMPERATURE = 0.6;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "start":
        return handleStart(supabase, user.id, body);
      case "respond":
        return handleRespond(supabase, user.id, body);
      case "debrief":
        return handleDebrief(supabase, user.id, body);
      case "list":
        return handleList(supabase, user.id, body);
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error("Practice session error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────
// ACTION: START
// ─────────────────────────────────────────────

async function handleStart(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  body: {
    jobId?: string;
    briefing?: PracticeSessionConfig["briefing"];
    interviewerIndex?: number;
    mode?: PracticeSessionConfig["mode"];
    difficulty?: PracticeSessionConfig["difficulty"];
    maxTurns?: number;
  }
) {
  const { jobId, briefing, interviewerIndex = 0, mode = "full_interview", difficulty = "neutral", maxTurns = 20 } = body;

  if (!briefing) {
    return NextResponse.json({ error: "Missing briefing" }, { status: 400 });
  }

  // Build system prompt
  const config: PracticeSessionConfig = {
    briefing,
    interviewerIndex,
    mode,
    difficulty,
    maxTurns,
  };
  const systemPrompt = buildPersonaPrompt(config);
  const openingPrompt = buildOpeningPrompt(config);

  // Call Claude for opening
  const client = new Anthropic();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    system: systemPrompt,
    messages: [{ role: "user", content: openingPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const responseText = textBlock?.type === "text" ? textBlock.text : "";

  // Parse response
  let parsed;
  try {
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : responseText.trim();
    parsed = JSON.parse(jsonStr);
  } catch {
    parsed = { dialogue: responseText, emotional_tone: "professional" };
  }

  // Create session in database
  const messages = [
    {
      role: "interviewer",
      content: parsed.dialogue,
      turn_number: 1,
      emotional_tone: parsed.emotional_tone,
    },
  ];

  const { data: session, error } = await supabase
    .from("practice_sessions")
    .insert({
      user_id: userId,
      job_id: jobId,
      mode,
      difficulty,
      interviewer_index: interviewerIndex,
      max_turns: maxTurns,
      status: "active",
      messages,
      system_prompt: systemPrompt,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create session:", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    sessionId: session.id,
    interviewer: {
      name: briefing.interviewer_models[interviewerIndex]?.name,
      role: briefing.interviewer_models[interviewerIndex]?.current_role,
      company: briefing.interviewer_models[interviewerIndex]?.company,
    },
    turn: {
      dialogue: parsed.dialogue,
      emotionalTone: parsed.emotional_tone,
      turnNumber: 1,
    },
    config: { mode, difficulty, maxTurns },
  });
}

// ─────────────────────────────────────────────
// ACTION: RESPOND
// ─────────────────────────────────────────────

async function handleRespond(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  body: { sessionId?: string; message?: string }
) {
  const { sessionId, message } = body;

  if (!sessionId || !message) {
    return NextResponse.json({ error: "Missing sessionId or message" }, { status: 400 });
  }

  // Load session
  const { data: session, error } = await supabase
    .from("practice_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();

  if (error || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.status !== "active") {
    return NextResponse.json({ error: "Session is not active" }, { status: 400 });
  }

  // Build message history for Claude
  const messages = session.messages || [];
  const turnNumber = messages.length + 1;

  // Add candidate message
  messages.push({
    role: "candidate",
    content: message,
    turn_number: turnNumber,
  });

  // Build Claude messages
  const claudeMessages = messages.map((m: { role: string; content: string }) => ({
    role: m.role === "interviewer" ? "assistant" : "user",
    content: m.content,
  }));

  // Add a user message prompting for next response if last was assistant
  if (claudeMessages[claudeMessages.length - 1]?.role === "user") {
    // Good, we have a user message last
  }

  // Call Claude
  const client = new Anthropic();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    system: session.system_prompt,
    messages: claudeMessages,
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const responseText = textBlock?.type === "text" ? textBlock.text : "";

  // Parse response
  let parsed;
  try {
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : responseText.trim();
    parsed = JSON.parse(jsonStr);
  } catch {
    parsed = { dialogue: responseText, emotional_tone: "professional" };
  }

  // Add interviewer response
  messages.push({
    role: "interviewer",
    content: parsed.dialogue,
    turn_number: turnNumber + 1,
    emotional_tone: parsed.emotional_tone,
  });

  // Check if interview should end
  const shouldEnd = messages.length >= session.max_turns * 2;
  const status = shouldEnd ? "ended" : "active";

  // Update session
  await supabase
    .from("practice_sessions")
    .update({
      messages,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  return NextResponse.json({
    success: true,
    sessionId,
    turn: {
      dialogue: parsed.dialogue,
      emotionalTone: parsed.emotional_tone,
      turnNumber: turnNumber + 1,
    },
    sessionStatus: status,
  });
}

// ─────────────────────────────────────────────
// ACTION: DEBRIEF
// ─────────────────────────────────────────────

async function handleDebrief(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  body: { sessionId?: string }
) {
  const { sessionId } = body;

  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  // Load session
  const { data: session, error } = await supabase
    .from("practice_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();

  if (error || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Build transcript
  const messages = session.messages || [];
  const transcript = messages
    .map((m: { role: string; content: string }) =>
      `${m.role === "interviewer" ? "INTERVIEWER" : "CANDIDATE"}: ${m.content}`
    )
    .join("\n\n");

  // Generate debrief
  const debriefPrompt = `Analyze this practice interview and provide a comprehensive debrief.

TRANSCRIPT:
${transcript}

Provide your analysis as JSON:
{
  "overall_score": 1-10,
  "hiring_prediction": "likely_hire" | "maybe" | "unlikely",
  "strengths": ["list of things done well"],
  "areas_for_improvement": ["specific areas to work on"],
  "key_moments": [
    { "turn": 1, "what_happened": "...", "impact": "positive/negative", "suggestion": "..." }
  ],
  "next_session_focus": "What to practice next time"
}`;

  const client = new Anthropic();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: DEBRIEF_MAX_TOKENS,
    temperature: 0.3,
    messages: [{ role: "user", content: debriefPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const responseText = textBlock?.type === "text" ? textBlock.text : "";

  let debrief;
  try {
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : responseText.trim();
    debrief = JSON.parse(jsonStr);
  } catch {
    debrief = { raw_analysis: responseText };
  }

  // Update session status
  await supabase
    .from("practice_sessions")
    .update({
      status: "debriefed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  return NextResponse.json({
    success: true,
    sessionId,
    debrief,
  });
}

// ─────────────────────────────────────────────
// ACTION: LIST (get user's sessions)
// ─────────────────────────────────────────────

async function handleList(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  body: { jobId?: string }
) {
  const { jobId } = body;

  let query = supabase
    .from("practice_sessions")
    .select("id, job_id, mode, difficulty, status, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (jobId) {
    query = query.eq("job_id", jobId);
  }

  const { data: sessions, error } = await query.limit(20);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }

  return NextResponse.json({ sessions });
}

// ─────────────────────────────────────────────
// GET — Resume a session
// ─────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const { data: session, error } = await supabase
      .from("practice_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (error || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({
      session: {
        id: session.id,
        mode: session.mode,
        difficulty: session.difficulty,
        status: session.status,
        messages: session.messages,
        createdAt: session.created_at,
      },
    });
  } catch (error) {
    console.error("Get session error:", error);
    return NextResponse.json({ error: "Failed to get session" }, { status: 500 });
  }
}
