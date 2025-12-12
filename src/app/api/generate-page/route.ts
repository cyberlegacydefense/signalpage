import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateFullPage, parseJobDescription } from '@/lib/llm/generation-service';
import { generateSlug } from '@/lib/utils/slug';
import { calculateMatchScore } from '@/lib/utils/match-score';
import { hasProAccess } from '@/lib/stripe';
import type { GenerationContext, ParsedResume, Job, User } from '@/types';

// Helper to trigger Career Intelligence generation in background
async function triggerCareerIntelligence(
  jobId: string,
  userId: string,
  subscriptionTier: string | null,
  supabaseClient: Awaited<ReturnType<typeof createClient>>
) {
  // Only for Pro/Coach users
  if (!hasProAccess((subscriptionTier || 'free') as 'pro' | 'coach' | 'free')) {
    return;
  }

  try {
    // Check user settings
    const { data: settings } = await supabaseClient
      .from('user_career_settings')
      .select('auto_generate_on_application')
      .eq('user_id', userId)
      .maybeSingle();

    // Default to true if no settings exist
    const shouldAutoGenerate = settings?.auto_generate_on_application ?? true;

    if (!shouldAutoGenerate) {
      console.log(`[Career Intelligence] Skipping auto-generation (disabled) for job ${jobId}`);
      return;
    }

    console.log(`[Career Intelligence] Triggering auto-generation for job ${jobId}`);

    // Import and call the generation function directly (async, don't await)
    import('@/lib/career-intelligence/generate').then(({ generateCareerIntelligence }) => {
      generateCareerIntelligence(jobId, userId, supabaseClient).catch(err => {
        console.error(`[Career Intelligence] Background generation failed:`, err);
      });
    }).catch(err => {
      console.error(`[Career Intelligence] Failed to import generation module:`, err);
    });
  } catch (err) {
    console.error(`[Career Intelligence] Error checking settings:`, err);
  }
}

// Increase timeout for Netlify (max 26 seconds for hobby, 60 for pro)
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await request.json();

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
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
      return NextResponse.json(
        { error: 'Profile not found. Please complete your profile first.' },
        { status: 400 }
      );
    }

    // Get user's resume
    const { data: resume } = await supabase
      .from('resumes')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .single();

    if (!resume || !resume.parsed_data) {
      return NextResponse.json(
        { error: 'Resume not found. Please upload and parse your resume first.' },
        { status: 400 }
      );
    }

    // Update job status to generating
    await supabase
      .from('jobs')
      .update({ status: 'generating' })
      .eq('id', jobId);

    // Parse job description if not already parsed
    let parsedRequirements = job.parsed_requirements;
    if (!parsedRequirements) {
      parsedRequirements = await parseJobDescription(job.job_description);

      await supabase
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
    const generated = await generateFullPage(context);

    // Calculate match score
    const { score: matchScore, breakdown: matchBreakdown } = calculateMatchScore(
      resume.parsed_data as ParsedResume,
      parsedRequirements
    );

    // Create the signal page
    const slug = generateSlug(job.company_name, job.role_title);

    const { data: page, error: pageError } = await supabase
      .from('signal_pages')
      .insert({
        job_id: jobId,
        user_id: user.id,
        slug,
        is_published: false,
        hero: generated.hero,
        fit_section: generated.fit_section,
        highlights: generated.highlights,
        plan_30_60_90: generated.plan_30_60_90,
        case_studies: generated.case_studies,
        ai_commentary: generated.ai_commentary,
        match_score: matchScore,
        match_breakdown: matchBreakdown,
      })
      .select()
      .single();

    if (pageError) {
      // Handle duplicate slug
      if (pageError.code === '23505') {
        const uniqueSlug = `${slug}-${Date.now().toString(36)}`;
        const { data: retryPage, error: retryError } = await supabase
          .from('signal_pages')
          .insert({
            job_id: jobId,
            user_id: user.id,
            slug: uniqueSlug,
            is_published: false,
            hero: generated.hero,
            fit_section: generated.fit_section,
            highlights: generated.highlights,
            plan_30_60_90: generated.plan_30_60_90,
            case_studies: generated.case_studies,
            ai_commentary: generated.ai_commentary,
            match_score: matchScore,
            match_breakdown: matchBreakdown,
          })
          .select()
          .single();

        if (retryError) throw retryError;

        await supabase
          .from('jobs')
          .update({ status: 'draft' })
          .eq('id', jobId);

        // Trigger Career Intelligence in background (fire and forget)
        triggerCareerIntelligence(jobId, user.id, profile.subscription_tier || 'free', supabase);

        return NextResponse.json({ page: retryPage });
      }
      throw pageError;
    }

    // Update job status
    await supabase
      .from('jobs')
      .update({ status: 'draft' })
      .eq('id', jobId);

    // Trigger Career Intelligence in background (fire and forget)
    triggerCareerIntelligence(jobId, user.id, profile.subscription_tier || 'free', supabase);

    return NextResponse.json({ page });
  } catch (error) {
    console.error('Error generating page:', error);
    return NextResponse.json(
      { error: 'Failed to generate page' },
      { status: 500 }
    );
  }
}
