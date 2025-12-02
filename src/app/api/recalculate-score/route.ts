import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateMatchScore } from '@/lib/utils/match-score';
import type { ParsedResume, ParsedJobRequirements } from '@/types';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pageId } = await request.json();

    if (!pageId) {
      return NextResponse.json({ error: 'Page ID is required' }, { status: 400 });
    }

    // Get the signal page with job data
    const { data: page, error: pageError } = await supabase
      .from('signal_pages')
      .select(`
        *,
        jobs (*)
      `)
      .eq('id', pageId)
      .eq('user_id', user.id)
      .single();

    if (pageError || !page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Get user's primary resume
    const { data: resume } = await supabase
      .from('resumes')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .single();

    if (!resume || !resume.parsed_data) {
      return NextResponse.json(
        { error: 'Resume not found' },
        { status: 400 }
      );
    }

    // Get job requirements
    const jobRequirements = page.jobs?.parsed_requirements as ParsedJobRequirements;

    if (!jobRequirements) {
      return NextResponse.json(
        { error: 'Job requirements not parsed' },
        { status: 400 }
      );
    }

    // Calculate match score
    const { score: matchScore, breakdown: matchBreakdown } = calculateMatchScore(
      resume.parsed_data as ParsedResume,
      jobRequirements
    );

    // Update the page
    const { error: updateError } = await supabase
      .from('signal_pages')
      .update({
        match_score: matchScore,
        match_breakdown: matchBreakdown
      })
      .eq('id', pageId)
      .eq('user_id', user.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      match_score: matchScore,
      match_breakdown: matchBreakdown
    });
  } catch (error) {
    console.error('Error recalculating score:', error);
    return NextResponse.json(
      { error: 'Failed to recalculate score' },
      { status: 500 }
    );
  }
}
