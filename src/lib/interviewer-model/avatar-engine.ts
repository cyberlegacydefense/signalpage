/**
 * SignalPage.ai — Interviewer Model: Avatar Engine (Layer 2)
 *
 * Generates a visual representation of the interviewer from public photos.
 * Three fidelity tiers: Illustrated → Stylized → Realistic
 *
 * Provider-agnostic design — swap between HeyGen, D-ID, Simli,
 * or a self-hosted solution without changing the interface.
 *
 * IMPORTANT: This does NOT create deepfakes. It creates recognizable
 * but clearly AI-generated representations. The psychological benefit
 * (brain registers "that's Bob") works even with stylized avatars.
 */

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export type AvatarFidelity = "illustrated" | "stylized" | "realistic";

export type AvatarProvider = "heygen" | "d-id" | "simli" | "placeholder";

export type TTSProvider = "elevenlabs" | "openai" | "browser_native";

export interface AvatarConfig {
  /** Public photo URL or base64 image of the interviewer */
  sourceImage: string;
  /** Name for labeling and cache keys */
  interviewerName: string;
  /** Visual fidelity level */
  fidelity: AvatarFidelity;
  /** Avatar generation provider */
  avatarProvider: AvatarProvider;
  /** Text-to-speech provider for speaking avatar */
  ttsProvider: TTSProvider;
  /** Voice characteristics to aim for (gender, age range, tone) */
  voiceProfile?: VoiceProfile;
}

export interface VoiceProfile {
  gender: "male" | "female" | "neutral";
  ageRange: "young" | "middle" | "senior";
  tone: "warm" | "authoritative" | "conversational" | "formal";
  pace: "slow" | "moderate" | "fast";
}

export interface GeneratedAvatar {
  /** Static avatar image URL */
  staticImageUrl: string;
  /** Avatar ID from provider (for generating video clips) */
  avatarId: string;
  /** Provider used */
  provider: AvatarProvider;
  /** Fidelity level */
  fidelity: AvatarFidelity;
  /** Voice ID for TTS (if configured) */
  voiceId?: string;
  /** Metadata */
  meta: {
    generatedAt: string;
    interviewerName: string;
    cacheKey: string;
  };
}

export interface SpeakingClip {
  /** Video URL of avatar speaking */
  videoUrl: string;
  /** Audio-only URL (fallback) */
  audioUrl: string;
  /** Duration in seconds */
  durationSeconds: number;
  /** The text that was spoken */
  transcript: string;
}

// ─────────────────────────────────────────────
// AVATAR GENERATOR (Provider-Agnostic Interface)
// ─────────────────────────────────────────────

export class AvatarEngine {
  private config: AvatarConfig;
  private avatar: GeneratedAvatar | null = null;

  constructor(config: AvatarConfig) {
    this.config = config;
  }

  /**
   * Step 1: Generate the static avatar from a source photo.
   * Call this once per interviewer, then cache the result.
   */
  async generateAvatar(): Promise<GeneratedAvatar> {
    const provider = this.getProvider();
    this.avatar = await provider.createAvatar(
      this.config.sourceImage,
      this.config.fidelity,
      this.config.interviewerName
    );
    return this.avatar;
  }

  /**
   * Step 2: Generate a speaking clip from text.
   * Called per-turn during the practice interview.
   */
  async speak(text: string): Promise<SpeakingClip> {
    if (!this.avatar) {
      throw new Error("Avatar not generated yet. Call generateAvatar() first.");
    }

    const provider = this.getProvider();
    return provider.generateSpeakingClip(
      this.avatar.avatarId,
      text,
      this.avatar.voiceId
    );
  }

  /**
   * Step 3: Generate idle/listening animation.
   * Shows the avatar "listening" while candidate speaks.
   */
  async getIdleAnimation(): Promise<string> {
    if (!this.avatar) {
      throw new Error("Avatar not generated yet.");
    }

    const provider = this.getProvider();
    return provider.getIdleVideoUrl(this.avatar.avatarId);
  }

  /**
   * Get the current avatar (if generated)
   */
  getAvatar(): GeneratedAvatar | null {
    return this.avatar;
  }

  /**
   * Set avatar from cache
   */
  setAvatar(avatar: GeneratedAvatar): void {
    this.avatar = avatar;
  }

  // ─────────────────────────────────────────
  // PROVIDER ROUTING
  // ─────────────────────────────────────────

  private getProvider(): AvatarProviderInterface {
    switch (this.config.avatarProvider) {
      case "heygen":
        return new HeyGenProvider(this.config);
      case "d-id":
        return new DIDProvider(this.config);
      case "simli":
        return new SimliProvider(this.config);
      case "placeholder":
        return new PlaceholderProvider(this.config);
      default:
        throw new Error(`Unknown avatar provider: ${this.config.avatarProvider}`);
    }
  }
}

// ─────────────────────────────────────────────
// PROVIDER INTERFACE
// ─────────────────────────────────────────────

interface AvatarProviderInterface {
  createAvatar(
    sourceImage: string,
    fidelity: AvatarFidelity,
    name: string
  ): Promise<GeneratedAvatar>;

  generateSpeakingClip(
    avatarId: string,
    text: string,
    voiceId?: string
  ): Promise<SpeakingClip>;

  getIdleVideoUrl(avatarId: string): Promise<string>;
}

// ─────────────────────────────────────────────
// HEYGEN PROVIDER
// ─────────────────────────────────────────────

class HeyGenProvider implements AvatarProviderInterface {
  private apiKey: string;
  private baseUrl = "https://api.heygen.com/v2";
  private config: AvatarConfig;

  constructor(config: AvatarConfig) {
    this.apiKey = process.env.HEYGEN_API_KEY || "";
    this.config = config;
  }

  async createAvatar(
    sourceImage: string,
    fidelity: AvatarFidelity,
    name: string
  ): Promise<GeneratedAvatar> {
    // HeyGen's Photo Avatar API
    // Docs: https://docs.heygen.com/reference/create-photo-avatar
    const response = await fetch(`${this.baseUrl}/photo_avatar`, {
      method: "POST",
      headers: {
        "X-Api-Key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: sourceImage,
        name: `interviewer-${name.toLowerCase().replace(/\s+/g, "-")}`,
        // Fidelity maps to HeyGen's quality settings
        ...(fidelity === "realistic" ? { quality: "high" } : {}),
      }),
    });

    const data = await response.json();

    // Select a voice based on the voice profile
    const voiceId = await this.selectVoice();

    return {
      staticImageUrl: data.data?.photo_url || sourceImage,
      avatarId: data.data?.avatar_id || "",
      provider: "heygen",
      fidelity,
      voiceId,
      meta: {
        generatedAt: new Date().toISOString(),
        interviewerName: name,
        cacheKey: `heygen-${name}-${fidelity}`,
      },
    };
  }

  async generateSpeakingClip(
    avatarId: string,
    text: string,
    voiceId?: string
  ): Promise<SpeakingClip> {
    // HeyGen's Video Generation API
    const response = await fetch(`${this.baseUrl}/video/generate`, {
      method: "POST",
      headers: {
        "X-Api-Key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        video_inputs: [
          {
            character: {
              type: "avatar",
              avatar_id: avatarId,
            },
            voice: {
              type: "text",
              input_text: text,
              voice_id: voiceId,
            },
          },
        ],
        dimension: { width: 512, height: 512 },
      }),
    });

    const data = await response.json();
    const videoId = data.data?.video_id;

    // Poll for completion
    const videoUrl = await this.pollForVideo(videoId);

    return {
      videoUrl,
      audioUrl: "", // Extract from video if needed
      durationSeconds: Math.ceil(text.length / 15), // Rough estimate
      transcript: text,
    };
  }

  async getIdleVideoUrl(avatarId: string): Promise<string> {
    // Generate a short idle/breathing loop
    return `${this.baseUrl}/avatar/${avatarId}/idle`;
  }

  private async selectVoice(): Promise<string> {
    const profile = this.config.voiceProfile;
    if (!profile) return "default";

    // Fetch available voices and match to profile
    const response = await fetch(`${this.baseUrl}/voices`, {
      headers: { "X-Api-Key": this.apiKey },
    });
    const data = await response.json();
    const voices = data.data?.voices || [];

    // Simple matching — production version would use more sophisticated matching
    const match = voices.find(
      (v: { gender?: string; language?: string; voice_id?: string }) =>
        v.gender?.toLowerCase() === profile.gender &&
        v.language === "en"
    );

    return match?.voice_id || "default";
  }

  private async pollForVideo(
    videoId: string,
    maxAttempts = 30
  ): Promise<string> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 2000));

      const response = await fetch(
        `${this.baseUrl}/video_status.get?video_id=${videoId}`,
        { headers: { "X-Api-Key": this.apiKey } }
      );
      const data = await response.json();

      if (data.data?.status === "completed") {
        return data.data.video_url;
      }
      if (data.data?.status === "failed") {
        throw new Error(`Video generation failed: ${data.data.error}`);
      }
    }
    throw new Error("Video generation timed out");
  }
}

// ─────────────────────────────────────────────
// D-ID PROVIDER
// ─────────────────────────────────────────────

class DIDProvider implements AvatarProviderInterface {
  private apiKey: string;
  private baseUrl = "https://api.d-id.com";
  private config: AvatarConfig;

  constructor(config: AvatarConfig) {
    this.apiKey = process.env.DID_API_KEY || "";
    this.config = config;
  }

  async createAvatar(
    sourceImage: string,
    fidelity: AvatarFidelity,
    name: string
  ): Promise<GeneratedAvatar> {
    // D-ID uses the source image directly — no separate avatar creation step
    // The image is sent with each talk/clip request
    return {
      staticImageUrl: sourceImage,
      avatarId: sourceImage, // D-ID uses the image URL as the avatar reference
      provider: "d-id",
      fidelity,
      voiceId: this.getDefaultVoice(),
      meta: {
        generatedAt: new Date().toISOString(),
        interviewerName: name,
        cacheKey: `did-${name}-${fidelity}`,
      },
    };
  }

  async generateSpeakingClip(
    avatarId: string,
    text: string,
    voiceId?: string
  ): Promise<SpeakingClip> {
    // D-ID Talks API
    const response = await fetch(`${this.baseUrl}/talks`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_url: avatarId, // In D-ID, this is the photo URL
        script: {
          type: "text",
          input: text,
          provider: {
            type: "microsoft",
            voice_id: voiceId || this.getDefaultVoice(),
          },
        },
        config: {
          stitch: true, // Better quality stitching
          result_format: "mp4",
        },
      }),
    });

    const data = await response.json();
    const talkId = data.id;

    // Poll for completion
    const resultUrl = await this.pollForTalk(talkId);

    return {
      videoUrl: resultUrl,
      audioUrl: "",
      durationSeconds: Math.ceil(text.length / 15),
      transcript: text,
    };
  }

  async getIdleVideoUrl(_avatarId: string): Promise<string> {
    // D-ID doesn't have native idle — return static image as fallback
    return _avatarId;
  }

  private getDefaultVoice(): string {
    const profile = this.config.voiceProfile;
    if (!profile) return "en-US-GuyNeural";

    // Map voice profile to Microsoft Neural voices
    const voiceMap: Record<string, Record<string, string>> = {
      male: {
        young: "en-US-JasonNeural",
        middle: "en-US-GuyNeural",
        senior: "en-US-TonyNeural",
      },
      female: {
        young: "en-US-JennyNeural",
        middle: "en-US-AriaNeural",
        senior: "en-US-NancyNeural",
      },
    };

    return voiceMap[profile.gender]?.[profile.ageRange] || "en-US-GuyNeural";
  }

  private async pollForTalk(
    talkId: string,
    maxAttempts = 30
  ): Promise<string> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 2000));

      const response = await fetch(`${this.baseUrl}/talks/${talkId}`, {
        headers: { Authorization: `Basic ${this.apiKey}` },
      });
      const data = await response.json();

      if (data.status === "done") {
        return data.result_url;
      }
      if (data.status === "error") {
        throw new Error(`D-ID talk generation failed: ${data.error?.description}`);
      }
    }
    throw new Error("D-ID talk generation timed out");
  }
}

// ─────────────────────────────────────────────
// SIMLI PROVIDER (Real-time streaming avatar)
// ─────────────────────────────────────────────

class SimliProvider implements AvatarProviderInterface {
  private apiKey: string;
  private config: AvatarConfig;

  constructor(config: AvatarConfig) {
    this.apiKey = process.env.SIMLI_API_KEY || "";
    this.config = config;
  }

  async createAvatar(
    sourceImage: string,
    fidelity: AvatarFidelity,
    name: string
  ): Promise<GeneratedAvatar> {
    // Simli creates a face from a single photo for real-time animation
    const response = await fetch("https://api.simli.ai/createFace", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageUrl: sourceImage,
        name: `interviewer-${name}`,
      }),
    });

    const data = await response.json();

    return {
      staticImageUrl: sourceImage,
      avatarId: data.faceId || "",
      provider: "simli",
      fidelity,
      meta: {
        generatedAt: new Date().toISOString(),
        interviewerName: name,
        cacheKey: `simli-${name}-${fidelity}`,
      },
    };
  }

  async generateSpeakingClip(
    avatarId: string,
    text: string,
    _voiceId?: string
  ): Promise<SpeakingClip> {
    // Simli is designed for real-time streaming, not pre-rendered clips.
    // For real-time mode, use the SimliClient in the React component instead.
    // This method provides a fallback for non-streaming contexts.
    const response = await fetch("https://api.simli.ai/textToVideoStream", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        faceId: avatarId,
        ttsAPIKey: process.env.ELEVENLABS_API_KEY || "",
        voiceId: _voiceId || "pFZP5JQG7iQjIQuC4Bku", // ElevenLabs default
        text,
      }),
    });

    const data = await response.json();

    return {
      videoUrl: data.videoUrl || "",
      audioUrl: data.audioUrl || "",
      durationSeconds: Math.ceil(text.length / 15),
      transcript: text,
    };
  }

  async getIdleVideoUrl(avatarId: string): Promise<string> {
    return `https://api.simli.ai/face/${avatarId}/idle`;
  }
}

// ─────────────────────────────────────────────
// PLACEHOLDER PROVIDER (for development/testing)
// ─────────────────────────────────────────────

class PlaceholderProvider implements AvatarProviderInterface {
  private config: AvatarConfig;

  constructor(config: AvatarConfig) {
    this.config = config;
  }

  async createAvatar(
    sourceImage: string,
    fidelity: AvatarFidelity,
    name: string
  ): Promise<GeneratedAvatar> {
    // Returns a placeholder — use the original image with an overlay badge
    return {
      staticImageUrl: sourceImage,
      avatarId: `placeholder-${Date.now()}`,
      provider: "placeholder",
      fidelity,
      voiceId: "browser_native",
      meta: {
        generatedAt: new Date().toISOString(),
        interviewerName: name,
        cacheKey: `placeholder-${name}`,
      },
    };
  }

  async generateSpeakingClip(
    _avatarId: string,
    text: string,
    _voiceId?: string
  ): Promise<SpeakingClip> {
    // In placeholder mode, the frontend uses browser-native TTS
    // and displays the static image with a "speaking" animation
    return {
      videoUrl: "",
      audioUrl: "",
      durationSeconds: Math.ceil(text.length / 15),
      transcript: text,
    };
  }

  async getIdleVideoUrl(_avatarId: string): Promise<string> {
    return "";
  }
}

// ─────────────────────────────────────────────
// VOICE PROFILE INFERENCE
// ─────────────────────────────────────────────

/**
 * Infer a voice profile from the interviewer model.
 * Uses name patterns, role seniority, and communication style
 * to select appropriate voice characteristics.
 *
 * This is a best-guess — the candidate can override in the UI.
 */
export function inferVoiceProfile(
  interviewer: { name: string; current_role: string; communication_style: { formality?: string; pace_preference?: string } }
): VoiceProfile {
  const role = interviewer.current_role.toLowerCase();
  const formality = interviewer.communication_style?.formality || "professional";

  // Seniority-based age inference
  let ageRange: VoiceProfile["ageRange"] = "middle";
  if (role.includes("chief") || role.includes("vp") || role.includes("director") || role.includes("partner")) {
    ageRange = "senior";
  } else if (role.includes("associate") || role.includes("junior") || role.includes("analyst")) {
    ageRange = "young";
  }

  // Formality-based tone inference
  let tone: VoiceProfile["tone"] = "conversational";
  if (formality === "executive") tone = "authoritative";
  else if (formality === "casual") tone = "warm";
  else if (formality === "professional") tone = "formal";

  // Pace from communication style
  let pace: VoiceProfile["pace"] = "moderate";
  const pacePreference = interviewer.communication_style?.pace_preference || "";
  if (pacePreference.includes("brief") || pacePreference.includes("punchy")) pace = "fast";
  else if (pacePreference.includes("measured") || pacePreference.includes("thorough")) pace = "slow";

  return {
    gender: "neutral", // Default to neutral — candidate overrides in UI
    ageRange,
    tone,
    pace,
  };
}

// ─────────────────────────────────────────────
// COST ESTIMATION
// ─────────────────────────────────────────────

/**
 * Estimate per-session cost for avatar generation.
 * Helps with pricing tier decisions.
 */
export function estimateAvatarCost(
  provider: AvatarProvider,
  estimatedTurns: number
): { avatarCreation: number; perTurnSpeaking: number; totalEstimate: number; currency: string } {
  const costs: Record<AvatarProvider, { creation: number; perTurn: number }> = {
    heygen: { creation: 0.00, perTurn: 0.10 },      // ~$0.10 per video clip
    "d-id": { creation: 0.00, perTurn: 0.08 },      // ~$0.08 per talk
    simli: { creation: 0.00, perTurn: 0.02 },        // Real-time streaming, lower per-unit
    placeholder: { creation: 0.00, perTurn: 0.00 },  // Free (browser TTS)
  };

  const providerCost = costs[provider];
  const interviewerTurns = Math.ceil(estimatedTurns / 2); // Only interviewer turns need video

  return {
    avatarCreation: providerCost.creation,
    perTurnSpeaking: providerCost.perTurn,
    totalEstimate: providerCost.creation + providerCost.perTurn * interviewerTurns,
    currency: "USD",
  };
}
