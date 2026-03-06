/**
 * SignalPage.ai — Interviewer Model API Route
 *
 * "Prepare with an AI model that thinks like your interviewer."
 *
 * Supports multiple interviewers per job.
 * Uses fire-and-forget pattern like Interview Prep to avoid timeouts.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Inline LinkedIn parser
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

  const sectionHeaders = ["experience", "education", "skills", "recommendations", "about"];

  for (const line of lines) {
    const lower = line.toLowerCase();
    const matchedSection = sectionHeaders.find((h) => lower === h || lower === h + ":");
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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { jobId, resume, jobDescription, interviewers } = body;

    if (!jobId || !resume || !jobDescription || !interviewers?.length) {
      return NextResponse.json(
        { error: "Missing required fields: jobId, resume, jobDescription, interviewers" },
        { status: 400 }
      );
    }

    // Parse interviewer profiles (expecting single interviewer per request now)
    const interviewer = interviewers[0];
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

    if (interviewer.linkedinPaste) {
      const parsed = parseLinkedInPaste(interviewer.linkedinPaste);
      profile.linkedinText = parsed.rawCleaned;
      if (!profile.name || profile.name === "Unknown") profile.name = parsed.name;
      if (!profile.currentRole) profile.currentRole = parsed.headline;
    }

    if (interviewer.linkedinText) {
      profile.linkedinText = interviewer.linkedinText;
    }

    const interviewerName = profile.name;

    // Check for existing record for this specific interviewer
    const { data: existing } = await supabase
      .from("interviewer_models")
      .select("status, briefing")
      .eq("job_id", jobId)
      .eq("user_id", user.id)
      .eq("interviewer_name", interviewerName)
      .maybeSingle();

    // If already completed, return it
    if (existing?.status === "completed" && existing.briefing) {
      return NextResponse.json({
        success: true,
        status: "completed",
        briefing: existing.briefing,
        interviewerName,
      });
    }

    // If already generating, return status
    if (existing?.status === "generating") {
      return NextResponse.json({
        success: true,
        status: "generating",
        message: "Generation in progress",
        interviewerName,
      });
    }

    // Create or update record to 'generating' status
    const { error: upsertError } = await supabase
      .from("interviewer_models")
      .upsert({
        job_id: jobId,
        user_id: user.id,
        interviewer_name: interviewerName,
        status: "generating",
        briefing: null,
        error_message: null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "job_id,user_id,interviewer_name",
      });

    if (upsertError) {
      console.error("[Interviewer Model] Failed to create record:", upsertError);
      return NextResponse.json({ error: "Failed to start generation" }, { status: 500 });
    }

    // Fire and forget - trigger edge function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    console.log("[Interviewer Model] Triggering edge function for:", interviewerName);

    fetch(`${supabaseUrl}/functions/v1/clever-api`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jobId,
        userId: user.id,
        resume,
        jobDescription,
        interviewerName,
        interviewers: [profile],
      }),
    }).catch((err) => {
      console.error("[Interviewer Model] Edge function trigger error:", err);
    });

    return NextResponse.json({
      success: true,
      status: "generating",
      message: "Generation started",
      interviewerName,
    });
  } catch (error: unknown) {
    console.error("Interviewer Model generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate Interviewer Model." },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch all interviewers for a job
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");
    const interviewerName = searchParams.get("interviewerName");

    if (!jobId) {
      return NextResponse.json({ error: "jobId required" }, { status: 400 });
    }

    // If specific interviewer requested, return just that one
    if (interviewerName) {
      const { data, error } = await supabase
        .from("interviewer_models")
        .select("id, interviewer_name, status, briefing, error_message, created_at")
        .eq("job_id", jobId)
        .eq("user_id", user.id)
        .eq("interviewer_name", interviewerName)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: "Failed to fetch interviewer" }, { status: 500 });
      }

      if (!data) {
        return NextResponse.json({ status: "not_found" });
      }

      return NextResponse.json({
        status: data.status,
        briefing: data.briefing,
        errorMessage: data.error_message,
        interviewerName: data.interviewer_name,
      });
    }

    // Return all interviewers for the job
    const { data: interviewers, error } = await supabase
      .from("interviewer_models")
      .select("id, interviewer_name, status, briefing, error_message, created_at")
      .eq("job_id", jobId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch interviewers" }, { status: 500 });
    }

    return NextResponse.json({ interviewers: interviewers || [] });
  } catch (error) {
    console.error("Interviewer Model fetch failed:", error);
    return NextResponse.json({ error: "Failed to fetch interviewers" }, { status: 500 });
  }
}

// DELETE endpoint to remove a specific interviewer
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");
    const interviewerName = searchParams.get("interviewerName");

    if (!jobId || !interviewerName) {
      return NextResponse.json({ error: "jobId and interviewerName required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("interviewer_models")
      .delete()
      .eq("job_id", jobId)
      .eq("user_id", user.id)
      .eq("interviewer_name", interviewerName);

    if (error) {
      console.error("[Interviewer Model] Delete failed:", error);
      return NextResponse.json({ error: "Failed to delete interviewer" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Interviewer Model delete failed:", error);
    return NextResponse.json({ error: "Failed to delete interviewer" }, { status: 500 });
  }
}
