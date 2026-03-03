/**
 * SignalPage.ai — Interviewer Model API Route
 *
 * "Prepare with an AI model that thinks like your interviewer."
 *
 * This route delegates to a Supabase Edge Function for longer timeout.
 */

import { NextRequest, NextResponse } from "next/server";

// Inline LinkedIn parser to avoid import issues
function parseLinkedInPaste(rawText: string): {
  name: string;
  headline: string;
  rawCleaned: string;
} {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const sections: Record<string, string[]> = {};
  let currentSection = "header";
  sections[currentSection] = [];

  const sectionHeaders = [
    "experience",
    "education",
    "skills",
    "recommendations",
    "about",
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
    rawCleaned: lines.join("\n"),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ── Validate required fields ──
    const { resume, jobDescription, interviewers } = body;

    if (!resume || !jobDescription || !interviewers?.length) {
      return NextResponse.json(
        { error: "Missing required fields: resume, jobDescription, interviewers" },
        { status: 400 }
      );
    }

    // ── Parse interviewer profiles ──
    const parsedInterviewers = interviewers.map(
      (interviewer: {
        name?: string;
        currentRole?: string;
        company?: string;
        linkedinPaste?: string;
        linkedinText?: string;
        additionalContext?: string;
      }) => {
        const profile: {
          name: string;
          currentRole?: string;
          company?: string;
          linkedinText?: string;
          additionalContext?: string;
        } = {
          name: interviewer.name || "Unknown",
          currentRole: interviewer.currentRole,
          company: interviewer.company,
          additionalContext: interviewer.additionalContext,
        };

        // If they pasted LinkedIn text, parse it
        if (interviewer.linkedinPaste) {
          const parsed = parseLinkedInPaste(interviewer.linkedinPaste);
          profile.linkedinText = parsed.rawCleaned;
          if (!profile.name || profile.name === "Unknown") profile.name = parsed.name;
          if (!profile.currentRole) profile.currentRole = parsed.headline;
        }

        if (interviewer.linkedinText) {
          profile.linkedinText = interviewer.linkedinText;
        }

        return profile;
      }
    );

    // ── Call Supabase Edge Function (has longer timeout) ──
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("[Interviewer Model] Missing Supabase config");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    console.log("[Interviewer Model] Calling Supabase Edge Function...");

    const edgeResponse = await fetch(
      `${supabaseUrl}/functions/v1/generate-interviewer-model`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseAnonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resume,
          jobDescription,
          interviewers: parsedInterviewers,
        }),
      }
    );

    if (!edgeResponse.ok) {
      const errorText = await edgeResponse.text();
      console.error("[Interviewer Model] Edge function error:", errorText);
      return NextResponse.json(
        { error: "Failed to generate Interviewer Model" },
        { status: edgeResponse.status }
      );
    }

    const result = await edgeResponse.json();

    return NextResponse.json({
      success: true,
      briefing: result.briefing,
      panelDynamics: null,
    });
  } catch (error: unknown) {
    console.error("Interviewer Model generation failed:", error);

    return NextResponse.json(
      { error: "Failed to generate Interviewer Model." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    feature: "Interviewer Model",
    tagline: "Prepare with an AI model that thinks like your interviewer.",
    usage: "POST to this endpoint with { resume, jobDescription, interviewers }",
  });
}
