/**
 * SignalPage.ai — Interviewer Model
 *
 * "Prepare with an AI model that thinks like your interviewer."
 *
 * Public exports for the Interviewer Model feature.
 */

// ── Briefing Generation (builds the interviewer model from data) ──
export {
  generateInterviewerModel,
  generateInterviewerModelStream,
  generatePanelStrategy,
  parseLinkedInPaste,
  type InterviewerModelBriefing,
  type InterviewerAnalysis,
  type PredictedQuestion,
  type RapportStrategy,
  type StrategicPositioning,
  type PreInterviewChecklist,
  type PanelDynamics,
} from "./pipeline";

export {
  buildInterviewerModelPrompt,
  type InterviewerProfile,
  type InterviewerModelInput,
} from "./system-prompt";

// ── Practice Session (conversational simulation - Layer 1) ──
export {
  PracticeSessionManager,
  type InterviewerTurn,
  type DebriefResult,
} from "./session-manager";

export {
  buildPersonaPrompt,
  buildDebriefPrompt,
  buildOpeningPrompt,
  type PracticeSessionConfig,
  type PracticeMessage,
  type PracticeSession,
} from "./persona-engine";

// ── Avatar Generation (visual avatar - Layer 2) ──
export {
  AvatarEngine,
  inferVoiceProfile,
  estimateAvatarCost,
  type AvatarConfig,
  type AvatarFidelity,
  type AvatarProvider,
  type TTSProvider,
  type VoiceProfile,
  type GeneratedAvatar,
  type SpeakingClip,
} from "./avatar-engine";
