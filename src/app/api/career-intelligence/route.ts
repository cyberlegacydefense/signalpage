import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getLLMClient } from '@/lib/llm';
import { hasProAccess } from '@/lib/stripe';
import {
  CAREER_INTELLIGENCE_SYSTEM_PROMPT,
  CAREER_INTELLIGENCE_PROMPT,
  buildCareerIntelligenceContext,
} from '@/lib/llm/career-intelligence-prompts';
import type {
  CareerIntelligenceContext,
  CareerIntelligenceOutput,
  ApplicationBrain,
  CareerNarrative,
  CareerAsset,
} from '@/types';

export const maxDuration = 60;

// Helper to extract JSON from LLM response
function extractJSON(content: string): string {
  const jsonBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    return jsonBlockMatch[1].trim();
  }
  return content.trim();
}

// POST - Generate career intelligence for a job application
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check subscription tier
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, full_name, headline, about_me')
      .eq('id', user.id)
      .single();

    if (!hasProAccess(profile?.subscription_tier || 'free')) {
      return NextResponse.json(
        { error: 'Career Intelligence requires a Pro or Coach subscription' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    console.log(`[Career Intelligence] Job ${jobId}: Starting generation`);

    // Get job data
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Get resume data
    let resume = null;
    if (job.resume_id) {
      const { data: selectedResume } = await supabase
        .from('resumes')
        .select('parsed_data')
        .eq('id', job.resume_id)
        .eq('user_id', user.id)
        .maybeSingle();
      resume = selectedResume;
    }
    if (!resume) {
      const { data: primaryResume } = await supabase
        .from('resumes')
        .select('parsed_data')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .maybeSingle();
      resume = primaryResume;
    }

    if (!resume?.parsed_data) {
      return NextResponse.json(
        { error: 'Please upload a resume before generating career intelligence' },
        { status: 400 }
      );
    }

    // Get existing SignalPage content if any
    const { data: signalPage } = await supabase
      .from('signal_pages')
      .select('hero, match_score')
      .eq('job_id', jobId)
      .maybeSingle();

    // Get application history
    const { data: applicationHistory } = await supabase
      .from('application_brain')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    // Build context
    const context: CareerIntelligenceContext = {
      resume: resume.parsed_data,
      job: job,
      user: {
        full_name: profile?.full_name || null,
        headline: profile?.headline || null,
        about_me: profile?.about_me || null,
      },
      signalPageContent: signalPage || null,
      applicationHistory: applicationHistory || [],
    };

    const contextStr = buildCareerIntelligenceContext(context);

    // Generate career intelligence
    const llm = getLLMClient();
    const result = await llm.complete({
      messages: [
        { role: 'system', content: CAREER_INTELLIGENCE_SYSTEM_PROMPT },
        { role: 'user', content: `${CAREER_INTELLIGENCE_PROMPT}\n\n${contextStr}` },
      ],
      config: { provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.7, maxTokens: 4000 },
    });

    // Parse response
    let output: CareerIntelligenceOutput;
    try {
      const extracted = extractJSON(result.content);
      output = JSON.parse(extracted);
    } catch (parseError) {
      console.error('[Career Intelligence] Failed to parse LLM response:', result.content);
      return NextResponse.json({ error: 'Failed to parse career intelligence' }, { status: 500 });
    }

    // Save Application Brain
    const { data: savedBrain, error: brainError } = await supabase
      .from('application_brain')
      .insert({
        user_id: user.id,
        job_id: jobId,
        role_seniority: output.applicationBrain.role_seniority,
        role_expectations: output.applicationBrain.role_expectations,
        skill_themes: output.applicationBrain.skill_themes || [],
        overlap_with_history: output.applicationBrain.overlap_with_history,
        interview_focus_areas: output.applicationBrain.interview_focus_areas || [],
        risk_areas: output.applicationBrain.risk_areas || [],
        strengths: output.applicationBrain.strengths || [],
        gaps: output.applicationBrain.gaps || [],
        recommendations: output.applicationBrain.recommendations || [],
        raw_analysis: output.applicationBrain,
      })
      .select()
      .single();

    if (brainError) {
      console.error('[Career Intelligence] Failed to save application brain:', brainError);
    }

    // Deactivate old narrative and save new one
    await supabase
      .from('career_narratives')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('is_active', true);

    // Get current version
    const { data: currentNarrative } = await supabase
      .from('career_narratives')
      .select('version')
      .eq('user_id', user.id)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    const newVersion = (currentNarrative?.version || 0) + 1;

    const { data: savedNarrative, error: narrativeError } = await supabase
      .from('career_narratives')
      .insert({
        user_id: user.id,
        core_identity: output.careerNarrative.core_identity,
        career_throughline: output.careerNarrative.career_throughline,
        impact_emphasis: output.careerNarrative.impact_emphasis,
        leadership_signals: output.careerNarrative.leadership_signals,
        version: newVersion,
        is_active: true,
        source_job_id: jobId,
      })
      .select()
      .single();

    if (narrativeError) {
      console.error('[Career Intelligence] Failed to save career narrative:', narrativeError);
    }

    // Save Career Assets
    const savedAssets: CareerAsset[] = [];
    for (const asset of output.careerAssets || []) {
      const { data: savedAsset, error: assetError } = await supabase
        .from('career_assets')
        .insert({
          user_id: user.id,
          asset_type: asset.asset_type,
          title: asset.title,
          content: asset.content,
          situation: asset.situation || null,
          task: asset.task || null,
          action: asset.action || null,
          result: asset.result || null,
          tags: asset.tags || [],
          source_job_id: jobId,
          source_company: asset.source_company || null,
          source_role: asset.source_role || null,
          is_active: true,
        })
        .select()
        .single();

      if (assetError) {
        console.error('[Career Intelligence] Failed to save asset:', assetError);
      } else if (savedAsset) {
        savedAssets.push(savedAsset);
      }
    }

    console.log(`[Career Intelligence] Job ${jobId}: Generation complete`);

    return NextResponse.json({
      success: true,
      applicationBrain: savedBrain,
      careerNarrative: savedNarrative,
      careerAssets: savedAssets,
    });

  } catch (error) {
    console.error('[Career Intelligence] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate career intelligence' },
      { status: 500 }
    );
  }
}

// GET - Retrieve career intelligence data
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const type = searchParams.get('type'); // 'brain', 'narrative', 'assets', 'all'

    // Get active narrative
    const { data: narrative } = await supabase
      .from('career_narratives')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    // Get career assets
    const { data: assets } = await supabase
      .from('career_assets')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // Get application brain (optionally filtered by job)
    let brainQuery = supabase
      .from('application_brain')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (jobId) {
      brainQuery = brainQuery.eq('job_id', jobId);
    }

    const { data: brainSnapshots } = await brainQuery;

    // Get user settings
    const { data: settings } = await supabase
      .from('user_career_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    return NextResponse.json({
      narrative,
      assets: assets || [],
      brainSnapshots: brainSnapshots || [],
      settings: settings || {
        auto_generate_on_application: true,
        auto_extract_from_resume: true,
      },
    });

  } catch (error) {
    console.error('[Career Intelligence] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch career intelligence' },
      { status: 500 }
    );
  }
}
