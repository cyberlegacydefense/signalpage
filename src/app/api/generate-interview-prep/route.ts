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
      console.error('Parse error:', parseError);
      return NextResponse.json(
        { error: 'Failed to generate role context' },
        { status: 500 }
      );
    }

    // Step 2: Generate Interview Questions
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
      console.error('Parse error:', parseError);
      return NextResponse.json(
        { error: 'Failed to generate interview questions' },
        { status: 500 }
      );
    }

    // Flatten all questions for answer generation
    const allQuestions: InterviewQuestion[] = [
      ...questions.behavioral,
      ...questions.technical,
      ...questions.culture_fit,
      ...questions.gap_probing,
      ...questions.role_specific,
    ];

    // Step 3: Generate Personalized Answers
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
      console.error('Parse error:', parseError);
      return NextResponse.json(
        { error: 'Failed to generate interview answers' },
        { status: 500 }
      );
    }

    // Step 4: Generate Quick Tips
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
      console.error('Parse error:', parseError);
      quickTips = [];
    }

    // Store the interview prep data
    const interviewPrep = {
      job_id: jobId,
      user_id: user.id,
      role_context: roleContext,
      questions,
      answers,
      quick_tips: quickTips,
      generated_at: new Date().toISOString(),
    };

    // Upsert interview prep (update if exists for this job)
    const { data: savedPrep, error: saveError } = await supabase
      .from('interview_prep')
      .upsert(interviewPrep, { onConflict: 'job_id' })
      .select()
      .single();

    if (saveError) {
      console.error('Failed to save interview prep:', saveError);
      // Still return the data even if save fails
    }

    return NextResponse.json({
      success: true,
      prep: savedPrep || interviewPrep,
    });
  } catch (error) {
    console.error('Interview prep generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate interview prep' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve existing interview prep
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

    return NextResponse.json({ prep });
  } catch (error) {
    console.error('Interview prep fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch interview prep' },
      { status: 500 }
    );
  }
}
