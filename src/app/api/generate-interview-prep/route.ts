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

// Each step should complete within Netlify's timeout
export const maxDuration = 60;

// Helper to extract JSON from LLM response (handles markdown code blocks)
function extractJSON(content: string): string {
  const jsonBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    return jsonBlockMatch[1].trim();
  }
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

    // Check current status - if already in progress, continue from where we left off
    const { data: existingPrep } = await supabase
      .from('interview_prep')
      .select('*')
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .maybeSingle();

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

    // Determine which step to run based on current status
    const currentStep = existingPrep?.current_step || 0;
    const currentStatus = existingPrep?.status || 'not_started';

    // If completed or failed, start fresh
    if (currentStatus === 'completed' || currentStatus === 'failed' || currentStatus === 'not_started') {
      // Initialize fresh record
      await supabase
        .from('interview_prep')
        .upsert({
          job_id: jobId,
          user_id: user.id,
          status: 'generating_context',
          current_step: 1,
          total_steps: 4,
          role_context: {},
          questions: {},
          answers: [],
          quick_tips: [],
          error_message: null,
        }, { onConflict: 'job_id' });

      // Step 1: Generate Role Context
      try {
        const roleContextResult = await llm.complete({
          messages: [
            { role: 'system', content: INTERVIEW_COACH_SYSTEM_PROMPT },
            { role: 'user', content: `${GENERATE_ROLE_CONTEXT_PROMPT}\n\n${contextStr}` },
          ],
          config: { temperature: 0.7, maxTokens: 2000 },
        });

        const roleContext: RoleContextPackage = JSON.parse(extractJSON(roleContextResult.content));

        await supabase
          .from('interview_prep')
          .update({
            role_context: roleContext,
            status: 'generating_questions',
            current_step: 2,
            updated_at: new Date().toISOString(),
          })
          .eq('job_id', jobId)
          .eq('user_id', user.id);

        return NextResponse.json({
          success: true,
          status: 'generating_questions',
          currentStep: 2,
          message: 'Role context generated. Call again to continue.'
        });
      } catch (err) {
        await supabase
          .from('interview_prep')
          .update({ status: 'failed', error_message: 'Failed to generate role context' })
          .eq('job_id', jobId)
          .eq('user_id', user.id);
        throw err;
      }
    }

    // Step 2: Generate Questions
    if (currentStep === 2 || currentStatus === 'generating_questions') {
      const roleContext = existingPrep?.role_context as RoleContextPackage;

      try {
        const questionsResult = await llm.complete({
          messages: [
            { role: 'system', content: INTERVIEW_COACH_SYSTEM_PROMPT },
            { role: 'user', content: `${GENERATE_INTERVIEW_QUESTIONS_PROMPT}\n\nRole Context:\n${JSON.stringify(roleContext, null, 2)}\n\n${contextStr}` },
          ],
          config: { temperature: 0.8, maxTokens: 4000 },
        });

        const questions: InterviewQuestions = JSON.parse(extractJSON(questionsResult.content));

        await supabase
          .from('interview_prep')
          .update({
            questions,
            status: 'generating_answers',
            current_step: 3,
            updated_at: new Date().toISOString(),
          })
          .eq('job_id', jobId)
          .eq('user_id', user.id);

        return NextResponse.json({
          success: true,
          status: 'generating_answers',
          currentStep: 3,
          message: 'Questions generated. Call again to continue.'
        });
      } catch (err) {
        await supabase
          .from('interview_prep')
          .update({ status: 'failed', error_message: 'Failed to generate questions' })
          .eq('job_id', jobId)
          .eq('user_id', user.id);
        throw err;
      }
    }

    // Step 3: Generate Answers
    if (currentStep === 3 || currentStatus === 'generating_answers') {
      const questions = existingPrep?.questions as InterviewQuestions;

      const allQuestions: InterviewQuestion[] = [
        ...questions.behavioral,
        ...questions.technical,
        ...questions.culture_fit,
        ...questions.gap_probing,
        ...questions.role_specific,
      ];

      try {
        const answersResult = await llm.complete({
          messages: [
            { role: 'system', content: INTERVIEW_COACH_SYSTEM_PROMPT },
            { role: 'user', content: `${GENERATE_INTERVIEW_ANSWERS_PROMPT}\n\nQuestions to answer:\n${JSON.stringify(allQuestions, null, 2)}\n\n${contextStr}` },
          ],
          config: { temperature: 0.7, maxTokens: 8000 },
        });

        const answers: InterviewAnswer[] = JSON.parse(extractJSON(answersResult.content));

        await supabase
          .from('interview_prep')
          .update({
            answers,
            status: 'generating_tips',
            current_step: 4,
            updated_at: new Date().toISOString(),
          })
          .eq('job_id', jobId)
          .eq('user_id', user.id);

        return NextResponse.json({
          success: true,
          status: 'generating_tips',
          currentStep: 4,
          message: 'Answers generated. Call again to continue.'
        });
      } catch (err) {
        await supabase
          .from('interview_prep')
          .update({ status: 'failed', error_message: 'Failed to generate answers' })
          .eq('job_id', jobId)
          .eq('user_id', user.id);
        throw err;
      }
    }

    // Step 4: Generate Tips
    if (currentStep === 4 || currentStatus === 'generating_tips') {
      const roleContext = existingPrep?.role_context as RoleContextPackage;

      try {
        const tipsResult = await llm.complete({
          messages: [
            { role: 'system', content: INTERVIEW_COACH_SYSTEM_PROMPT },
            { role: 'user', content: `${GENERATE_QUICK_TIPS_PROMPT}\n\nRole Context:\n${JSON.stringify(roleContext, null, 2)}\n\n${contextStr}` },
          ],
          config: { temperature: 0.8, maxTokens: 1000 },
        });

        let quickTips: string[] = [];
        try {
          quickTips = JSON.parse(extractJSON(tipsResult.content));
        } catch {
          quickTips = [];
        }

        const { data: finalPrep } = await supabase
          .from('interview_prep')
          .update({
            quick_tips: quickTips,
            status: 'completed',
            current_step: 4,
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
          status: 'completed',
          currentStep: 4,
          prep: finalPrep
        });
      } catch (err) {
        await supabase
          .from('interview_prep')
          .update({ status: 'failed', error_message: 'Failed to generate tips' })
          .eq('job_id', jobId)
          .eq('user_id', user.id);
        throw err;
      }
    }

    // Shouldn't reach here, but return current status
    return NextResponse.json({
      success: true,
      status: currentStatus,
      currentStep: currentStep
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
