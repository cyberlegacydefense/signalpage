import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getLLMClient, type LLMMessage } from '@/lib/llm';
import {
  PROFILE_CARD_SYSTEM_PROMPT,
  GENERATE_PROFILE_CARD_PROMPT,
  buildProfileCardContext,
  type ProfileCardGenerationContext,
} from '@/lib/llm/profile-card-prompts';
import type { ParsedResume, Superpower, Availability, HighlightSection } from '@/types';

interface GeneratedProfileCard {
  positioning_statement: string;
  superpowers: Superpower[];
  availability: Partial<Availability>;
}

function parseJSONResponse<T>(content: string): T {
  // Try to extract JSON from markdown code blocks if present
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();

  try {
    return JSON.parse(jsonStr) as T;
  } catch (error) {
    console.error('Failed to parse JSON response:', content);
    throw new Error('Failed to parse AI response as JSON');
  }
}

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, headline, about_me')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Fetch user's primary resume (or most recent)
    const { data: resumes } = await supabase
      .from('resumes')
      .select('parsed_data')
      .eq('user_id', user.id)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1);

    if (!resumes || resumes.length === 0) {
      return NextResponse.json(
        { error: 'No resume found. Please upload a resume first.' },
        { status: 400 }
      );
    }

    const resume = resumes[0].parsed_data as ParsedResume;

    // Fetch career narrative if exists
    const { data: careerNarrative } = await supabase
      .from('career_narratives')
      .select('core_identity, career_throughline, impact_emphasis')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch highlights from signal pages
    const { data: signalPages } = await supabase
      .from('signal_pages')
      .select('highlights')
      .eq('user_id', user.id)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(5);

    // Flatten highlights from all signal pages
    const signalPageHighlights: HighlightSection[] = [];
    if (signalPages) {
      for (const page of signalPages) {
        const highlights = (page.highlights || []) as HighlightSection[];
        signalPageHighlights.push(...highlights);
      }
    }

    // Build context for generation
    const context: ProfileCardGenerationContext = {
      resume,
      user: {
        full_name: profile.full_name,
        headline: profile.headline || undefined,
        about_me: profile.about_me || undefined,
      },
      careerNarrative: careerNarrative || undefined,
      signalPageHighlights: signalPageHighlights.slice(0, 10).map((h) => ({
        company: h.company,
        role: h.role,
        problem: h.problem,
        solution: h.solution,
        impact: h.impact,
        metrics: h.metrics,
      })),
    };

    const contextStr = buildProfileCardContext(context);

    // Generate profile card using LLM
    const client = getLLMClient();
    const messages: LLMMessage[] = [
      { role: 'system', content: PROFILE_CARD_SYSTEM_PROMPT },
      { role: 'user', content: `${GENERATE_PROFILE_CARD_PROMPT}\n\n${contextStr}` },
    ];

    const result = await client.complete({ messages });
    const generated = parseJSONResponse<GeneratedProfileCard>(result.content);

    // Ensure superpowers have proper IDs
    const superpowers = generated.superpowers.map((sp) => ({
      ...sp,
      id: sp.id || crypto.randomUUID(),
      proof_points: (sp.proof_points || []).map((pp) => ({
        ...pp,
        id: pp.id || crypto.randomUUID(),
      })),
    }));

    return NextResponse.json({
      positioning_statement: generated.positioning_statement,
      superpowers,
      availability: generated.availability,
    });
  } catch (error) {
    console.error('Profile card generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate profile card' },
      { status: 500 }
    );
  }
}
