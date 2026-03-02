/**
 * SignalPage.ai — Interviewer Model API Route
 *
 * "Prepare with an AI model that thinks like your interviewer."
 *
 * Next.js App Router API route.
 * POST /api/interviewer-model/generate
 */

import { NextRequest, NextResponse } from "next/server";
import {
  generateInterviewerModel,
  generatePanelStrategy,
  parseLinkedInPaste,
} from "@/lib/interviewer-model/pipeline";
import type { InterviewerModelInput, InterviewerProfile } from "@/lib/interviewer-model/system-prompt";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ── Validate required fields ──
    const { resume, jobDescription, interviewers, interviewType, candidateNotes } = body;

    if (!resume || !jobDescription || !interviewers?.length) {
      return NextResponse.json(
        { error: "Missing required fields: resume, jobDescription, interviewers" },
        { status: 400 }
      );
    }

    // ── Parse interviewer profiles ──
    const interviewerProfiles: InterviewerProfile[] = interviewers.map(
      (interviewer: {
        name?: string;
        currentRole?: string;
        company?: string;
        linkedinPaste?: string;
        linkedinText?: string;
        publishedContent?: string[];
        githubBio?: string;
        additionalContext?: string;
      }) => {
        const profile: InterviewerProfile = {
          name: interviewer.name || "Unknown",
          currentRole: interviewer.currentRole,
          company: interviewer.company,
          additionalContext: interviewer.additionalContext,
        };

        // If they pasted LinkedIn text, parse it
        if (interviewer.linkedinPaste) {
          const parsed = parseLinkedInPaste(interviewer.linkedinPaste);
          profile.linkedinText = parsed.rawCleaned;
          profile.careerHistory = parsed.experience;
          if (!profile.name || profile.name === "Unknown") profile.name = parsed.name;
          if (!profile.currentRole) profile.currentRole = parsed.headline;
        }

        if (interviewer.linkedinText) {
          profile.linkedinText = interviewer.linkedinText;
        }

        if (interviewer.publishedContent) {
          profile.publishedContent = interviewer.publishedContent;
        }

        if (interviewer.githubBio) {
          profile.githubBio = interviewer.githubBio;
        }

        return profile;
      }
    );

    const input: InterviewerModelInput = {
      resume,
      jobDescription,
      interviewerProfiles,
      interviewType: interviewType || undefined,
      candidateNotes: candidateNotes || undefined,
    };

    // ── Generate model ──
    // Use panel strategy for 2+ interviewers
    let result;
    if (interviewerProfiles.length > 1) {
      result = await generatePanelStrategy(input);
    } else {
      result = {
        interviewerModels: await generateInterviewerModel(input),
        panelDynamics: null,
      };
    }

    return NextResponse.json({
      success: true,
      briefing: result.interviewerModels,
      panelDynamics: result.panelDynamics,
    });
  } catch (error: unknown) {
    console.error("Interviewer Model generation failed:", error);

    const err = error as { status?: number };
    if (err.status === 429) {
      return NextResponse.json(
        { error: "Rate limited. Please try again in a moment." },
        { status: 429 }
      );
    }

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
    example: {
      resume: "Full resume text...",
      jobDescription: "Full job description text...",
      interviewers: [
        {
          name: "Jane Smith",
          currentRole: "VP of Engineering",
          company: "TechCorp",
          linkedinPaste: "Paste the full LinkedIn profile page content here...",
          publishedContent: [
            "Full text of an article they wrote...",
            "Transcript of a podcast they appeared on...",
          ],
          additionalContext: "She spoke at QCon 2024 about scaling engineering teams.",
        },
      ],
      interviewType: "executive",
      candidateNotes: "I'm concerned about my gap year — want to address it proactively.",
    },
  });
}
