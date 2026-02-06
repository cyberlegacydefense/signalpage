import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { generateFullPage, parseJobDescription } from '@/lib/llm/generation-service';
import { calculateMatchScore } from '@/lib/utils/match-score';
import { hasProAccess } from '@/lib/stripe';
import type { GenerationContext, ParsedResume, Job, User } from '@/types';

// Extend timeout for Netlify Pro (60 seconds)
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pageId, jobId } = await request.json();

    if (!pageId || !jobId) {
      return NextResponse.json({ error: 'Page ID and Job ID are required' }, { status: 400 });
    }

    // Verify the page exists and belongs to user
    const { data: page, error: pageError } = await supabase
      .from('signal_pages')
      .select('id, generation_status')
      .eq('id', pageId)
      .eq('user_id', user.id)
      .single();

    if (pageError || !page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Skip if already generated
    if (page.generation_status === 'ready') {
      return NextResponse.json({ status: 'already_complete' });
    }

    // Get the job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 400 });
    }

    // Get user's resume
    const { data: resume } = await supabase
      .from('resumes')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .single();

    if (!resume || !resume.parsed_data) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 400 });
    }

    // Use service client for updates
    const serviceSupabase = createServiceClient();

    console.log(`[Generation] Starting generation for page ${pageId}`);

    // Parse job description if not already parsed
    let parsedRequirements = job.parsed_requirements;
    if (!parsedRequirements) {
      console.log(`[Generation] Parsing job description for job ${jobId}`);
      parsedRequirements = await parseJobDescription(job.job_description);

      await serviceSupabase
        .from('jobs')
        .update({ parsed_requirements: parsedRequirements })
        .eq('id', jobId);
    }

    // Build generation context
    const context: GenerationContext = {
      resume: resume.parsed_data as ParsedResume,
      job: {
        ...job,
        parsed_requirements: parsedRequirements,
      } as Job,
      user: {
        full_name: profile.full_name,
        headline: profile.headline,
        about_me: profile.about_me,
      } as Pick<User, 'full_name' | 'headline' | 'about_me'>,
      recruiterName: job.recruiter_name,
      hiringManagerName: job.hiring_manager_name,
    };

    // Generate all page sections
    console.log(`[Generation] Generating content for page ${pageId}`);
    const generated = await generateFullPage(context);

    // Calculate match score
    const { score: matchScore, breakdown: matchBreakdown } = calculateMatchScore(
      resume.parsed_data as ParsedResume,
      parsedRequirements
    );

    // Update the page with generated content
    const { error: updateError } = await serviceSupabase
      .from('signal_pages')
      .update({
        hero: generated.hero,
        fit_section: generated.fit_section,
        highlights: generated.highlights,
        plan_30_60_90: generated.plan_30_60_90,
        case_studies: generated.case_studies,
        ai_commentary: generated.ai_commentary,
        match_score: matchScore,
        match_breakdown: matchBreakdown,
        generation_status: 'ready',
        generation_error: null,
      })
      .eq('id', pageId);

    if (updateError) {
      throw updateError;
    }

    // Update job status
    await serviceSupabase
      .from('jobs')
      .update({ status: 'draft' })
      .eq('id', jobId);

    console.log(`[Generation] Successfully completed generation for page ${pageId}`);

    // Trigger Career Intelligence in background
    if (hasProAccess((profile.subscription_tier || 'free') as 'pro' | 'coach' | 'free')) {
      import('@/lib/career-intelligence/generate').then(({ generateCareerIntelligence }) => {
        generateCareerIntelligence(jobId, user.id, serviceSupabase).catch(err => {
          console.error(`[Career Intelligence] Background generation failed:`, err);
        });
      }).catch(err => {
        console.error(`[Career Intelligence] Failed to import:`, err);
      });
    }

    return NextResponse.json({ status: 'complete' });
  } catch (error) {
    console.error('[Generation] Error:', error);

    // Try to update the page status to failed
    try {
      const { pageId, jobId } = await request.clone().json();
      const serviceSupabase = createServiceClient();

      if (pageId) {
        await serviceSupabase
          .from('signal_pages')
          .update({
            generation_status: 'failed',
            generation_error: error instanceof Error ? error.message : 'Generation failed',
          })
          .eq('id', pageId);
      }

      if (jobId) {
        // Reset job status
        await serviceSupabase
          .from('jobs')
          .update({ status: 'draft' })
          .eq('id', jobId);
      }
    } catch {
      // Ignore errors updating status
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}
