import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { generateFullPage, parseJobDescription } from '@/lib/llm/generation-service';
import { generateSlug } from '@/lib/utils/slug';
import { calculateMatchScore } from '@/lib/utils/match-score';
import { hasProAccess } from '@/lib/stripe';
import type { GenerationContext, ParsedResume, Job, User, HeroSection, FitSection, HighlightSection, Plan306090, CaseStudy } from '@/types';

// Extend timeout for Netlify Pro (60 seconds)
export const maxDuration = 60;

// Placeholder content for the generating state
const placeholderHero: HeroSection = {
  tagline: 'Generating...',
  value_promise: 'Your personalized content is being generated.',
};

const placeholderFitSection: FitSection = {
  intro: 'Analyzing your qualifications...',
  fit_bullets: [],
};

const placeholderHighlights: HighlightSection[] = [];

const placeholderPlan: Plan306090 = {
  intro: 'Creating your 30-60-90 day plan...',
  day_30: { title: 'First 30 Days', objectives: [] },
  day_60: { title: 'Days 31-60', objectives: [] },
  day_90: { title: 'Days 61-90', objectives: [] },
};

const placeholderCaseStudies: CaseStudy[] = [];

// Background generation function - runs after response is sent
async function runBackgroundGeneration(
  pageId: string,
  jobId: string,
  userId: string,
  job: Job,
  resume: { parsed_data: ParsedResume },
  profile: { full_name: string; headline?: string; about_me?: string; subscription_tier?: string }
) {
  // Use service client for background operations (doesn't need user session)
  const supabase = createServiceClient();

  try {
    console.log(`[Generation] Starting background generation for page ${pageId}`);

    // Parse job description if not already parsed
    let parsedRequirements = job.parsed_requirements;
    if (!parsedRequirements) {
      console.log(`[Generation] Parsing job description for job ${jobId}`);
      parsedRequirements = await parseJobDescription(job.job_description);

      await supabase
        .from('jobs')
        .update({ parsed_requirements: parsedRequirements })
        .eq('id', jobId);
    }

    // Build generation context
    const context: GenerationContext = {
      resume: resume.parsed_data,
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
      resume.parsed_data,
      parsedRequirements
    );

    // Update the page with generated content
    const { error: updateError } = await supabase
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
    await supabase
      .from('jobs')
      .update({ status: 'draft' })
      .eq('id', jobId);

    console.log(`[Generation] Successfully completed generation for page ${pageId}`);

    // Trigger Career Intelligence in background (fire and forget)
    if (hasProAccess((profile.subscription_tier || 'free') as 'pro' | 'coach' | 'free')) {
      import('@/lib/career-intelligence/generate').then(({ generateCareerIntelligence }) => {
        generateCareerIntelligence(jobId, userId, supabase).catch(err => {
          console.error(`[Career Intelligence] Background generation failed:`, err);
        });
      }).catch(err => {
        console.error(`[Career Intelligence] Failed to import generation module:`, err);
      });
    }
  } catch (error) {
    console.error(`[Generation] Failed for page ${pageId}:`, error);

    // Update page with error status
    await supabase
      .from('signal_pages')
      .update({
        generation_status: 'failed',
        generation_error: error instanceof Error ? error.message : 'Generation failed. Please try again.',
      })
      .eq('id', pageId);

    // Reset job status
    await supabase
      .from('jobs')
      .update({ status: 'draft' })
      .eq('id', jobId);
  }
}

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

    // Create the signal page immediately with placeholder content
    const slug = generateSlug(job.company_name, job.role_title);

    let pageId: string;
    let pageSlug: string;

    const { data: page, error: pageError } = await supabase
      .from('signal_pages')
      .insert({
        job_id: jobId,
        user_id: user.id,
        slug,
        is_published: false,
        generation_status: 'generating',
        hero: placeholderHero,
        fit_section: placeholderFitSection,
        highlights: placeholderHighlights,
        plan_30_60_90: placeholderPlan,
        case_studies: placeholderCaseStudies,
      })
      .select('id, slug')
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
            generation_status: 'generating',
            hero: placeholderHero,
            fit_section: placeholderFitSection,
            highlights: placeholderHighlights,
            plan_30_60_90: placeholderPlan,
            case_studies: placeholderCaseStudies,
          })
          .select('id, slug')
          .single();

        if (retryError) throw retryError;
        pageId = retryPage.id;
        pageSlug = retryPage.slug;
      } else {
        throw pageError;
      }
    } else {
      pageId = page.id;
      pageSlug = page.slug;
    }

    // Use streaming to return page ID immediately, then continue generation
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Send page info immediately so client can redirect
        controller.enqueue(encoder.encode(JSON.stringify({
          page: { id: pageId, slug: pageSlug },
          generating: true,
        })));

        // Now run the generation (this keeps the connection open)
        try {
          await runBackgroundGeneration(
            pageId,
            jobId,
            user.id,
            job as Job,
            { parsed_data: resume.parsed_data as ParsedResume },
            {
              full_name: profile.full_name,
              headline: profile.headline,
              about_me: profile.about_me,
              subscription_tier: profile.subscription_tier,
            }
          );
        } catch (err) {
          console.error('[Generation] Stream generation error:', err);
          // Error is already handled in runBackgroundGeneration
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/json',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('Error initiating page generation:', error);
    return NextResponse.json(
      { error: 'Failed to start page generation' },
      { status: 500 }
    );
  }
}
