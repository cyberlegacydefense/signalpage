import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getLLMClient } from '@/lib/llm';
import { hasProAccess } from '@/lib/stripe';
import {
  CAREER_INTELLIGENCE_SYSTEM_PROMPT,
  EXTRACT_ASSETS_FROM_RESUME_PROMPT,
  buildResumeExtractionContext,
} from '@/lib/llm/career-intelligence-prompts';
import type { CareerAsset, CareerNarrative } from '@/types';

export const maxDuration = 60;

// Helper to extract JSON from LLM response
function extractJSON(content: string): string {
  const jsonBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    return jsonBlockMatch[1].trim();
  }
  return content.trim();
}

interface ExtractionOutput {
  careerAssets: Array<{
    asset_type: string;
    title: string;
    content: string;
    situation?: string;
    task?: string;
    action?: string;
    result?: string;
    tags: string[];
    source_company: string;
    source_role: string;
  }>;
  initialNarrative: {
    core_identity: string;
    career_throughline: string;
    impact_emphasis: string;
    leadership_signals: string;
  };
}

// POST - Extract career assets and initial narrative from resume
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check subscription
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, full_name')
      .eq('id', user.id)
      .single();

    if (!hasProAccess(profile?.subscription_tier || 'free')) {
      return NextResponse.json(
        { error: 'Career Intelligence requires a Pro or Coach subscription' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { resumeId } = body;

    console.log(`[Career Intelligence] Extracting assets from resume ${resumeId || 'primary'}`);

    // Get resume data
    let resume = null;
    if (resumeId) {
      const { data: selectedResume } = await supabase
        .from('resumes')
        .select('parsed_data')
        .eq('id', resumeId)
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
        { error: 'No resume found. Please upload a resume first.' },
        { status: 400 }
      );
    }

    // Build context
    const contextStr = buildResumeExtractionContext(resume.parsed_data, profile?.full_name || null);

    // Generate extraction
    const llm = getLLMClient();
    const result = await llm.complete({
      messages: [
        { role: 'system', content: CAREER_INTELLIGENCE_SYSTEM_PROMPT },
        { role: 'user', content: `${EXTRACT_ASSETS_FROM_RESUME_PROMPT}\n\n${contextStr}` },
      ],
      config: { provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.7, maxTokens: 4000 },
    });

    // Parse response
    let output: ExtractionOutput;
    try {
      const extracted = extractJSON(result.content);
      output = JSON.parse(extracted);
    } catch (parseError) {
      console.error('[Career Intelligence] Failed to parse extraction response:', result.content);
      return NextResponse.json({ error: 'Failed to parse extraction results' }, { status: 500 });
    }

    // Check if user already has a narrative
    const { data: existingNarrative } = await supabase
      .from('career_narratives')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    let savedNarrative: CareerNarrative | null = null;

    // Only create narrative if none exists
    if (!existingNarrative && output.initialNarrative) {
      const { data: narrative, error: narrativeError } = await supabase
        .from('career_narratives')
        .insert({
          user_id: user.id,
          core_identity: output.initialNarrative.core_identity,
          career_throughline: output.initialNarrative.career_throughline,
          impact_emphasis: output.initialNarrative.impact_emphasis,
          leadership_signals: output.initialNarrative.leadership_signals,
          version: 1,
          is_active: true,
        })
        .select()
        .single();

      if (narrativeError) {
        console.error('[Career Intelligence] Failed to save initial narrative:', narrativeError);
      } else {
        savedNarrative = narrative;
      }
    }

    // Save career assets
    const savedAssets: CareerAsset[] = [];
    for (const asset of output.careerAssets || []) {
      // Check for duplicate by title and source
      const { data: existing } = await supabase
        .from('career_assets')
        .select('id')
        .eq('user_id', user.id)
        .eq('title', asset.title)
        .eq('source_company', asset.source_company)
        .maybeSingle();

      if (existing) {
        console.log(`[Career Intelligence] Skipping duplicate asset: ${asset.title}`);
        continue;
      }

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

    console.log(`[Career Intelligence] Extraction complete: ${savedAssets.length} assets saved`);

    return NextResponse.json({
      success: true,
      narrative: savedNarrative,
      assets: savedAssets,
      message: `Extracted ${savedAssets.length} career assets${savedNarrative ? ' and created initial narrative' : ''}`,
    });

  } catch (error) {
    console.error('[Career Intelligence] Extraction error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to extract from resume' },
      { status: 500 }
    );
  }
}
