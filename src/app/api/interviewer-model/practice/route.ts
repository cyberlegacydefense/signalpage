/**
 * SignalPage.ai — Interviewer Model: Practice Session API
 *
 * POST /api/interviewer-model/practice
 *
 * Actions:
 *   { action: "start" }           → Initialize session, get interviewer's opening
 *   { action: "respond" }         → Send candidate message, get interviewer reply
 *   { action: "debrief" }         → End interview, get performance analysis
 *   { action: "generate_avatar" } → Create visual avatar from photo
 *
 * The session is stateful — pass session state back and forth
 * between client and server (or use server-side session storage).
 */

import { NextRequest, NextResponse } from "next/server";
import { PracticeSessionManager } from "@/lib/interviewer-model/session-manager";
import {
  AvatarEngine,
  inferVoiceProfile,
  estimateAvatarCost,
} from "@/lib/interviewer-model/avatar-engine";
import type { PracticeSessionConfig } from "@/lib/interviewer-model/persona-engine";
import type { AvatarConfig, GeneratedAvatar } from "@/lib/interviewer-model/avatar-engine";

// ─────────────────────────────────────────────
// In-memory session store (swap for Redis/Supabase in production)
// ─────────────────────────────────────────────

const sessions = new Map<string, PracticeSessionManager>();
const avatars = new Map<string, { engine: AvatarEngine; avatar: GeneratedAvatar }>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "start":
        return handleStart(body);
      case "respond":
        return handleRespond(body);
      case "debrief":
        return handleDebrief(body);
      case "generate_avatar":
        return handleGenerateAvatar(body);
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    console.error("Practice session error:", error);
    const err = error as { message?: string };
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────
// ACTION: START
// ─────────────────────────────────────────────

async function handleStart(body: {
  briefing?: PracticeSessionConfig["briefing"];
  interviewerIndex?: number;
  mode?: PracticeSessionConfig["mode"];
  difficulty?: PracticeSessionConfig["difficulty"];
  candidateNotes?: string;
  maxTurns?: number;
  avatarConfig?: { cacheKey?: string };
}) {
  const { briefing, interviewerIndex, mode, difficulty, candidateNotes, maxTurns, avatarConfig } = body;

  if (!briefing) {
    return NextResponse.json(
      { error: "Missing briefing. Generate an Interviewer Model first." },
      { status: 400 }
    );
  }

  const config: PracticeSessionConfig = {
    briefing,
    interviewerIndex: interviewerIndex || 0,
    mode: mode || "full_interview",
    difficulty: difficulty || "neutral",
    candidateNotes,
    maxTurns: maxTurns || 20,
  };

  // Initialize session
  const manager = new PracticeSessionManager(config);
  const opening = await manager.startInterview();

  // Store session
  const session = manager.getSession();
  sessions.set(session.sessionId, manager);

  // Generate avatar speaking clip if avatar is configured
  let speakingClip = null;
  if (avatarConfig?.cacheKey) {
    const avatarData = avatars.get(avatarConfig.cacheKey);
    if (avatarData) {
      speakingClip = await avatarData.engine.speak(opening.dialogue);
    }
  }

  return NextResponse.json({
    success: true,
    sessionId: session.sessionId,
    interviewer: {
      name: briefing.interviewer_models[interviewerIndex || 0]?.name,
      role: briefing.interviewer_models[interviewerIndex || 0]?.current_role,
      company: briefing.interviewer_models[interviewerIndex || 0]?.company,
    },
    turn: {
      dialogue: opening.dialogue,
      emotionalTone: opening.emotionalTone,
      turnNumber: opening.turnNumber,
      speakingClip,
    },
    sessionStatus: opening.sessionStatus,
    config: {
      mode: config.mode,
      difficulty: config.difficulty,
      maxTurns: config.maxTurns,
    },
  });
}

// ─────────────────────────────────────────────
// ACTION: RESPOND
// ─────────────────────────────────────────────

async function handleRespond(body: {
  sessionId?: string;
  message?: string;
  avatarCacheKey?: string;
}) {
  const { sessionId, message, avatarCacheKey } = body;

  if (!sessionId || !message) {
    return NextResponse.json(
      { error: "Missing sessionId or message" },
      { status: 400 }
    );
  }

  const manager = sessions.get(sessionId);
  if (!manager) {
    return NextResponse.json(
      { error: "Session not found. Start a new practice session." },
      { status: 404 }
    );
  }

  // Get interviewer's response
  const turn = await manager.respondToCandidate(message);

  // Generate speaking clip if avatar exists
  let speakingClip = null;
  if (avatarCacheKey) {
    const avatarData = avatars.get(avatarCacheKey);
    if (avatarData) {
      speakingClip = await avatarData.engine.speak(turn.dialogue);
    }
  }

  return NextResponse.json({
    success: true,
    sessionId,
    turn: {
      dialogue: turn.dialogue,
      emotionalTone: turn.emotionalTone,
      turnNumber: turn.turnNumber,
      nextMove: turn.nextMove,
      speakingClip,
    },
    sessionStatus: turn.sessionStatus,
  });
}

// ─────────────────────────────────────────────
// ACTION: DEBRIEF
// ─────────────────────────────────────────────

async function handleDebrief(body: { sessionId?: string }) {
  const { sessionId } = body;

  if (!sessionId) {
    return NextResponse.json(
      { error: "Missing sessionId" },
      { status: 400 }
    );
  }

  const manager = sessions.get(sessionId);
  if (!manager) {
    return NextResponse.json(
      { error: "Session not found." },
      { status: 404 }
    );
  }

  // Generate comprehensive debrief
  const debrief = await manager.generateDebrief();

  // Also expose the per-turn internal assessments
  const assessments = manager.getAssessments();

  // Clean up session
  sessions.delete(sessionId);

  return NextResponse.json({
    success: true,
    sessionId,
    debrief,
    turnAssessments: assessments,
    sessionStatus: "debriefing",
  });
}

// ─────────────────────────────────────────────
// ACTION: GENERATE AVATAR
// ─────────────────────────────────────────────

async function handleGenerateAvatar(body: {
  sourceImage?: string;
  interviewerName?: string;
  fidelity?: AvatarConfig["fidelity"];
  avatarProvider?: AvatarConfig["avatarProvider"];
  ttsProvider?: AvatarConfig["ttsProvider"];
  voiceProfile?: AvatarConfig["voiceProfile"];
  interviewer?: { name: string; current_role: string; communication_style: { formality?: string; pace_preference?: string } };
}) {
  const {
    sourceImage,
    interviewerName,
    fidelity,
    avatarProvider,
    ttsProvider,
    voiceProfile,
    interviewer, // Optional: pass the interviewer model for voice inference
  } = body;

  if (!sourceImage || !interviewerName) {
    return NextResponse.json(
      { error: "Missing sourceImage or interviewerName" },
      { status: 400 }
    );
  }

  // Infer voice profile from interviewer model if not provided
  const resolvedVoiceProfile = voiceProfile ||
    (interviewer ? inferVoiceProfile(interviewer) : undefined);

  const config: AvatarConfig = {
    sourceImage,
    interviewerName,
    fidelity: fidelity || "stylized",
    avatarProvider: avatarProvider || "placeholder",
    ttsProvider: ttsProvider || "browser_native",
    voiceProfile: resolvedVoiceProfile,
  };

  const engine = new AvatarEngine(config);
  const avatar = await engine.generateAvatar();

  // Cache the avatar engine for the session
  avatars.set(avatar.meta.cacheKey, { engine, avatar });

  // Estimate costs for the session
  const costEstimate = estimateAvatarCost(config.avatarProvider, 20);

  return NextResponse.json({
    success: true,
    avatar: {
      staticImageUrl: avatar.staticImageUrl,
      avatarId: avatar.avatarId,
      provider: avatar.provider,
      fidelity: avatar.fidelity,
      cacheKey: avatar.meta.cacheKey,
    },
    voiceProfile: resolvedVoiceProfile,
    costEstimate,
  });
}

// ─────────────────────────────────────────────
// GET — Usage documentation
// ─────────────────────────────────────────────

export async function GET() {
  return NextResponse.json({
    feature: "Interviewer Model — Practice Mode",
    tagline: "Prepare with an AI model that thinks like your interviewer.",
    actions: {
      generate_avatar: {
        description: "Create a visual avatar from a public photo",
        required: ["sourceImage", "interviewerName"],
        optional: ["fidelity", "avatarProvider", "ttsProvider", "voiceProfile"],
        providers: ["heygen", "d-id", "simli", "placeholder"],
      },
      start: {
        description: "Begin a practice interview session",
        required: ["briefing"],
        optional: ["interviewerIndex", "mode", "difficulty", "candidateNotes", "maxTurns", "avatarConfig"],
        modes: ["full_interview", "rapid_fire", "stress_test", "rapport_only"],
        difficulties: ["friendly", "neutral", "tough"],
      },
      respond: {
        description: "Send a candidate response, receive interviewer reply",
        required: ["sessionId", "message"],
        optional: ["avatarCacheKey"],
      },
      debrief: {
        description: "End the interview and get performance analysis",
        required: ["sessionId"],
      },
    },
    flow: [
      "1. Generate Interviewer Model (POST /api/interviewer-model/generate)",
      "2. Generate Avatar (POST /api/interviewer-model/practice { action: 'generate_avatar' })",
      "3. Start Practice (POST /api/interviewer-model/practice { action: 'start', briefing: ... })",
      "4. Candidate responds → Interviewer replies (loop { action: 'respond' })",
      "5. Debrief (POST /api/interviewer-model/practice { action: 'debrief' })",
    ],
  });
}
