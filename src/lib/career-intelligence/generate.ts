import { SupabaseClient } from '@supabase/supabase-js';
import { getLLMClient } from '@/lib/llm';
import {
  CAREER_INTELLIGENCE_SYSTEM_PROMPT,
  CAREER_INTELLIGENCE_PROMPT,
  buildCareerIntelligenceContext,
} from '@/lib/llm/career-intelligence-prompts';
import type {
  CareerIntelligenceContext,
  CareerIntelligenceOutput,
  CareerAsset,
  CareerNarrative,
  ApplicationBrain,
} from '@/types';

// Helper to extract JSON from LLM response
function extractJSON(content: string): string {
  const jsonBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    return jsonBlockMatch[1].trim();
  }
  return content.trim();
}

/**
 * Generate Career Intelligence for a job application
 * This can be called from API routes or triggered in background
 */
export async function generateCareerIntelligence(
  jobId: string,
  userId: string,
  supabase: SupabaseClient
): Promise<{
  applicationBrain: ApplicationBrain | null;
  careerNarrative: CareerNarrative | null;
  careerAssets: CareerAsset[];
}> {
  console.log(`[Career Intelligence] Starting generation for job ${jobId}`);

  // Get job data
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single();

  if (jobError || !job) {
    throw new Error('Job not found');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, headline, about_me')
    .eq('id', userId)
    .single();

  // Get resume data
  let resume = null;
  if (job.resume_id) {
    const { data: selectedResume } = await supabase
      .from('resumes')
      .select('parsed_data')
      .eq('id', job.resume_id)
      .eq('user_id', userId)
      .maybeSingle();
    resume = selectedResume;
  }
  if (!resume) {
    const { data: primaryResume } = await supabase
      .from('resumes')
      .select('parsed_data')
      .eq('user_id', userId)
      .eq('is_primary', true)
      .maybeSingle();
    resume = primaryResume;
  }

  if (!resume?.parsed_data) {
    throw new Error('No resume found');
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
    .eq('user_id', userId)
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
  console.log(`[Career Intelligence] Calling LLM for job ${jobId}`);
  const llm = getLLMClient();
  const result = await llm.complete({
    messages: [
      { role: 'system', content: CAREER_INTELLIGENCE_SYSTEM_PROMPT },
      { role: 'user', content: `${CAREER_INTELLIGENCE_PROMPT}\n\n${contextStr}` },
    ],
    config: { provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.5, maxTokens: 3000 },
  });

  // Parse response
  let output: CareerIntelligenceOutput;
  try {
    const extracted = extractJSON(result.content);
    output = JSON.parse(extracted);
  } catch (parseError) {
    console.error('[Career Intelligence] Failed to parse LLM response:', result.content);
    throw new Error('Failed to parse career intelligence');
  }

  // Save Application Brain
  const { data: savedBrain, error: brainError } = await supabase
    .from('application_brain')
    .insert({
      user_id: userId,
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
    .eq('user_id', userId)
    .eq('is_active', true);

  // Get current version
  const { data: currentNarrative } = await supabase
    .from('career_narratives')
    .select('version')
    .eq('user_id', userId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  const newVersion = (currentNarrative?.version || 0) + 1;

  const { data: savedNarrative, error: narrativeError } = await supabase
    .from('career_narratives')
    .insert({
      user_id: userId,
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
        user_id: userId,
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

  console.log(`[Career Intelligence] Generation complete for job ${jobId}: brain=${!!savedBrain}, narrative=${!!savedNarrative}, assets=${savedAssets.length}`);

  return {
    applicationBrain: savedBrain,
    careerNarrative: savedNarrative,
    careerAssets: savedAssets,
  };
}
