import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getLLMClient } from '@/lib/llm';
import {
  INTERVIEW_COACH_SYSTEM_PROMPT,
  GENERATE_ROLE_CONTEXT_PROMPT,
  GENERATE_INTERVIEW_QUESTIONS_PROMPT,
  GENERATE_INTERVIEW_ANSWERS_PROMPT,
  GENERATE_QUICK_TIPS_PROMPT,
  buildGenerationContext,
} from '@/lib/llm/prompts';
import { hasCoachAccess } from '@/lib/stripe';
import type {
  GenerationContext,
  RoleContextPackage,
  InterviewQuestions,
  InterviewAnswer,
  InterviewQuestion
} from '@/types';

export const maxDuration = 120;

// Step definitions for progress tracking
const STEPS = {
  ROLE_CONTEXT: { step: 1, status: 'generating_context', label: 'Analyzing role and resume fit...' },
  QUESTIONS: { step: 2, status: 'generating_questions', label: 'Generating interview questions...' },
  ANSWERS: { step: 3, status: 'generating_answers', label: 'Creating personalized answers...' },
  TIPS: { step: 4, status: 'generating_tips', label: 'Preparing strategic tips...' },
};

// Helper to extract JSON from LLM response (handles markdown code blocks)
function extractJSON(content: string): string {
  // Try to extract JSON from markdown code blocks
  const jsonBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    return jsonBlockMatch[1].trim();
  }
  // Otherwise return content as-is (it might already be valid JSON)
  return content.trim();
}

// Helper to update progress in database
async function updateProgress(
  supabase: Awaited<ReturnType<typeof createClient>>,
  jobId: string,
  userId: string,
  step: number,
  status: string,
  data?: Record<string, unknown>
) {
  const updateData: Record<string, unknown> = {
    current_step: step,
    status,
    updated_at: new Date().toISOString(),
    ...data,
  };

  await supabase
    .from('interview_prep')
    .update(updateData)
    .eq('job_id', jobId)
    .eq('user_id', userId);
}

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
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (!hasCoachAccess(profile?.subscription_tier || 'free')) {
      return NextResponse.json(
        { error: 'Interview Coach requires an Interview Coach subscription' },
        { status: 403 }
      );
    }

    const { jobId } = await request.json();

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

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

    // Get resume data (use job's selected resume or primary)
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
        { error: 'Please upload a resume before generating interview prep' },
        { status: 400 }
      );
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('full_name, headline, about_me')
      .eq('id', user.id)
      .single();

    // Create or reset the interview prep record with pending status
    const initialPrep = {
      job_id: jobId,
      user_id: user.id,
      status: 'pending',
      current_step: 0,
      total_steps: 4,
      role_context: {},
      questions: {},
      answers: [],
      quick_tips: [],
      error_message: null,
    };

    await supabase
      .from('interview_prep')
      .upsert(initialPrep, { onConflict: 'job_id' });

    // Build generation context
    const context: GenerationContext = {
      resume: resume.parsed_data,
      job: job,
      user: {
        full_name: userProfile?.full_name || null,
        headline: userProfile?.headline || null,
        about_me: userProfile?.about_me || null,
      },
      recruiterName: job.recruiter_name,
      hiringManagerName: job.hiring_manager_name,
    };

    const contextStr = buildGenerationContext(context);
    const llm = getLLMClient();

    // Step 1: Generate Role Context Package
    await updateProgress(supabase, jobId, user.id, STEPS.ROLE_CONTEXT.step, STEPS.ROLE_CONTEXT.status);

    const roleContextResult = await llm.complete({
      messages: [
        { role: 'system', content: INTERVIEW_COACH_SYSTEM_PROMPT },
        { role: 'user', content: `${GENERATE_ROLE_CONTEXT_PROMPT}\n\n${contextStr}` },
      ],
      config: {
        temperature: 0.7,
        maxTokens: 2000,
      },
    });

    let roleContext: RoleContextPackage;
    try {
      roleContext = JSON.parse(extractJSON(roleContextResult.content));
    } catch (parseError) {
      console.error('Failed to parse role context:', roleContextResult.content);
      await updateProgress(supabase, jobId, user.id, 1, 'failed', {
        error_message: 'Failed to analyze role context. Please try again.',
      });
      return NextResponse.json(
        { error: 'Failed to generate role context' },
        { status: 500 }
      );
    }

    // Save role context progress
    await updateProgress(supabase, jobId, user.id, STEPS.ROLE_CONTEXT.step, STEPS.ROLE_CONTEXT.status, {
      role_context: roleContext,
    });

    // Step 2: Generate Interview Questions
    await updateProgress(supabase, jobId, user.id, STEPS.QUESTIONS.step, STEPS.QUESTIONS.status);

    const questionsResult = await llm.complete({
      messages: [
        { role: 'system', content: INTERVIEW_COACH_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `${GENERATE_INTERVIEW_QUESTIONS_PROMPT}\n\nRole Context:\n${JSON.stringify(roleContext, null, 2)}\n\n${contextStr}`
        },
      ],
      config: {
        temperature: 0.8,
        maxTokens: 4000,
      },
    });

    let questions: InterviewQuestions;
    try {
      questions = JSON.parse(extractJSON(questionsResult.content));
    } catch (parseError) {
      console.error('Failed to parse questions:', questionsResult.content);
      await updateProgress(supabase, jobId, user.id, 2, 'failed', {
        error_message: 'Failed to generate interview questions. Please try again.',
      });
      return NextResponse.json(
        { error: 'Failed to generate interview questions' },
        { status: 500 }
      );
    }

    // Save questions progress
    await updateProgress(supabase, jobId, user.id, STEPS.QUESTIONS.step, STEPS.QUESTIONS.status, {
      questions,
    });

    // Flatten all questions for answer generation
    const allQuestions: InterviewQuestion[] = [
      ...questions.behavioral,
      ...questions.technical,
      ...questions.culture_fit,
      ...questions.gap_probing,
      ...questions.role_specific,
    ];

    // Step 3: Generate Personalized Answers
    await updateProgress(supabase, jobId, user.id, STEPS.ANSWERS.step, STEPS.ANSWERS.status);

    const answersResult = await llm.complete({
      messages: [
        { role: 'system', content: INTERVIEW_COACH_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `${GENERATE_INTERVIEW_ANSWERS_PROMPT}\n\nQuestions to answer:\n${JSON.stringify(allQuestions, null, 2)}\n\n${contextStr}`
        },
      ],
      config: {
        temperature: 0.7,
        maxTokens: 8000,
      },
    });

    let answers: InterviewAnswer[];
    try {
      answers = JSON.parse(extractJSON(answersResult.content));
    } catch (parseError) {
      console.error('Failed to parse answers:', answersResult.content);
      await updateProgress(supabase, jobId, user.id, 3, 'failed', {
        error_message: 'Failed to generate interview answers. Please try again.',
      });
      return NextResponse.json(
        { error: 'Failed to generate interview answers' },
        { status: 500 }
      );
    }

    // Save answers progress
    await updateProgress(supabase, jobId, user.id, STEPS.ANSWERS.step, STEPS.ANSWERS.status, {
      answers,
    });

    // Step 4: Generate Quick Tips
    await updateProgress(supabase, jobId, user.id, STEPS.TIPS.step, STEPS.TIPS.status);

    const tipsResult = await llm.complete({
      messages: [
        { role: 'system', content: INTERVIEW_COACH_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `${GENERATE_QUICK_TIPS_PROMPT}\n\nRole Context:\n${JSON.stringify(roleContext, null, 2)}\n\n${contextStr}`
        },
      ],
      config: {
        temperature: 0.8,
        maxTokens: 1000,
      },
    });

    let quickTips: string[];
    try {
      quickTips = JSON.parse(extractJSON(tipsResult.content));
    } catch (parseError) {
      console.error('Failed to parse tips:', tipsResult.content);
      // Tips are optional, continue with empty array
      quickTips = [];
    }

    // Mark as completed with all data
    const { data: savedPrep } = await supabase
      .from('interview_prep')
      .update({
        status: 'completed',
        current_step: 4,
        role_context: roleContext,
        questions,
        answers,
        quick_tips: quickTips,
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        error_message: null,
      })
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .select()
      .single();

    return NextResponse.json({
      success: true,
      prep: savedPrep,
    });
  } catch (error) {
    console.error('Interview prep generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate interview prep' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve existing interview prep or poll for status
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    const { data: prep, error } = await supabase
      .from('interview_prep')
      .select('*')
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching interview prep:', error);
      return NextResponse.json({ error: 'Failed to fetch interview prep' }, { status: 500 });
    }

    // Return status info for polling
    return NextResponse.json({
      prep,
      status: prep?.status || 'not_started',
      currentStep: prep?.current_step || 0,
      totalSteps: prep?.total_steps || 4,
      errorMessage: prep?.error_message,
    });
  } catch (error) {
    console.error('Interview prep fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch interview prep' },
      { status: 500 }
    );
  }
}
