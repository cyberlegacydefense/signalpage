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

// Helper to safely parse JSON with detailed error reporting
function safeParseJSON<T>(content: string, label: string): { data: T | null; error: string | null } {
  try {
    const extracted = extractJSON(content);
    const parsed = JSON.parse(extracted) as T;
    return { data: parsed, error: null };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown parse error';
    console.error(`[Interview Prep] JSON parse error in ${label}:`, errorMsg);
    console.error(`[Interview Prep] Raw content (first 500 chars):`, content.substring(0, 500));
    return { data: null, error: `Failed to parse ${label}: ${errorMsg}` };
  }
}

// Helper to validate questions structure
function validateQuestions(questions: unknown): { valid: boolean; error: string | null } {
  if (!questions || typeof questions !== 'object') {
    return { valid: false, error: 'Questions is not an object' };
  }

  const q = questions as Record<string, unknown>;
  const requiredCategories = ['behavioral', 'technical', 'culture_fit', 'gap_probing', 'role_specific'];
  const missing: string[] = [];
  const empty: string[] = [];

  for (const cat of requiredCategories) {
    if (!Array.isArray(q[cat])) {
      missing.push(cat);
    } else if ((q[cat] as unknown[]).length === 0) {
      empty.push(cat);
    }
  }

  if (missing.length > 0) {
    return { valid: false, error: `Missing question categories: ${missing.join(', ')}` };
  }

  if (empty.length > 0) {
    console.warn(`[Interview Prep] Empty question categories (will skip): ${empty.join(', ')}`);
  }

  return { valid: true, error: null };
}

export async function POST(request: Request) {
  const startTime = Date.now();
  let jobId: string | null = null;

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

    const body = await request.json();
    jobId = body.jobId;
    const forceReset = body.forceReset === true;

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    console.log(`[Interview Prep] Job ${jobId}: Starting request (forceReset=${forceReset})`);

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
      console.error(`[Interview Prep] Job ${jobId}: Job not found`, jobError);
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

    console.log(`[Interview Prep] Job ${jobId}: Current state - status=${currentStatus}, step=${currentStep}`);

    // Valid in-progress statuses
    const validInProgressStatuses = [
      'generating_context',
      'generating_questions',
      'generating_answers',
      'generating_answers_technical',
      'generating_answers_culture',
      'generating_answers_gap',
      'generating_answers_role',
      'generating_tips',
    ];

    // Check if generation is stuck (last update > 2 minutes ago)
    const lastUpdate = existingPrep?.updated_at ? new Date(existingPrep.updated_at) : null;
    const isStuck = lastUpdate && (Date.now() - lastUpdate.getTime() > 2 * 60 * 1000);

    if (isStuck && validInProgressStatuses.includes(currentStatus)) {
      console.log(`[Interview Prep] Job ${jobId}: Detected stuck generation (last update: ${lastUpdate?.toISOString()})`);
    }

    // If forceReset, completed, failed, not_started, unknown/legacy status, or stuck - start fresh
    const shouldStartFresh =
      forceReset ||
      currentStatus === 'completed' ||
      currentStatus === 'failed' ||
      currentStatus === 'not_started' ||
      !validInProgressStatuses.includes(currentStatus) ||
      isStuck;

    if (shouldStartFresh) {
      const reason = forceReset ? 'forceReset' :
                     currentStatus === 'completed' ? 'completed' :
                     currentStatus === 'failed' ? 'failed' :
                     isStuck ? 'stuck' : 'fresh start';
      console.log(`[Interview Prep] Job ${jobId}: Starting fresh (reason: ${reason})`);

      // Delete existing record and create fresh one
      if (existingPrep) {
        await supabase
          .from('interview_prep')
          .delete()
          .eq('job_id', jobId)
          .eq('user_id', user.id);
      }

      // Initialize fresh record
      const { error: insertError } = await supabase
        .from('interview_prep')
        .insert({
          job_id: jobId,
          user_id: user.id,
          status: 'generating_context',
          current_step: 1,
          total_steps: 8,
          role_context: {},
          questions: {},
          answers: [],
          quick_tips: [],
          error_message: null,
        });

      if (insertError) {
        console.error(`[Interview Prep] Job ${jobId}: Failed to create record`, insertError);
        return NextResponse.json({ error: 'Failed to initialize interview prep' }, { status: 500 });
      }

      // Step 1: Generate Role Context
      console.log(`[Interview Prep] Job ${jobId}: Step 1 - Generating role context...`);
      const roleContextResult = await llm.complete({
        messages: [
          { role: 'system', content: INTERVIEW_COACH_SYSTEM_PROMPT },
          { role: 'user', content: `${GENERATE_ROLE_CONTEXT_PROMPT}\n\n${contextStr}` },
        ],
        config: { provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.7, maxTokens: 2000 },
      });

      const { data: roleContext, error: parseError } = safeParseJSON<RoleContextPackage>(
        roleContextResult.content,
        'role context'
      );

      if (parseError || !roleContext) {
        await supabase
          .from('interview_prep')
          .update({ status: 'failed', error_message: parseError || 'Failed to parse role context' })
          .eq('job_id', jobId)
          .eq('user_id', user.id);
        return NextResponse.json({ error: parseError, status: 'failed' }, { status: 500 });
      }

      console.log(`[Interview Prep] Job ${jobId}: Step 1 complete in ${Date.now() - startTime}ms`);

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
    }

    // Step 2: Generate Questions
    if (currentStatus === 'generating_questions') {
      console.log(`[Interview Prep] Job ${jobId}: Step 2 - Generating questions...`);
      const roleContext = existingPrep?.role_context as RoleContextPackage;

      if (!roleContext || Object.keys(roleContext).length === 0) {
        console.error(`[Interview Prep] Job ${jobId}: No role context found, resetting...`);
        await supabase
          .from('interview_prep')
          .update({ status: 'failed', error_message: 'Missing role context - please restart' })
          .eq('job_id', jobId)
          .eq('user_id', user.id);
        return NextResponse.json({ error: 'Missing role context', status: 'failed' }, { status: 500 });
      }

      const questionsResult = await llm.complete({
        messages: [
          { role: 'system', content: INTERVIEW_COACH_SYSTEM_PROMPT },
          { role: 'user', content: `${GENERATE_INTERVIEW_QUESTIONS_PROMPT}\n\nRole Context:\n${JSON.stringify(roleContext, null, 2)}\n\n${contextStr}` },
        ],
        config: { provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.8, maxTokens: 4000 },
      });

      const { data: questions, error: parseError } = safeParseJSON<InterviewQuestions>(
        questionsResult.content,
        'questions'
      );

      if (parseError || !questions) {
        await supabase
          .from('interview_prep')
          .update({ status: 'failed', error_message: parseError || 'Failed to parse questions' })
          .eq('job_id', jobId)
          .eq('user_id', user.id);
        return NextResponse.json({ error: parseError, status: 'failed' }, { status: 500 });
      }

      // Validate questions structure
      const validation = validateQuestions(questions);
      if (!validation.valid) {
        console.error(`[Interview Prep] Job ${jobId}: Invalid questions structure:`, validation.error);
        await supabase
          .from('interview_prep')
          .update({ status: 'failed', error_message: validation.error })
          .eq('job_id', jobId)
          .eq('user_id', user.id);
        return NextResponse.json({ error: validation.error, status: 'failed' }, { status: 500 });
      }

      console.log(`[Interview Prep] Job ${jobId}: Step 2 complete - Generated ${
        questions.behavioral.length + questions.technical.length +
        questions.culture_fit.length + questions.gap_probing.length +
        questions.role_specific.length
      } questions in ${Date.now() - startTime}ms`);

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
    }

    // Build a condensed context for answer generation (smaller prompt = faster)
    const condensedContext = `
## Candidate: ${context.user.full_name || 'Candidate'}

## Key Experience:
${context.resume.experiences.slice(0, 3).map(exp =>
  `- ${exp.title} at ${exp.company}: ${exp.achievements.slice(0, 3).join('; ')}`
).join('\n')}

## Key Skills: ${context.resume.skills.slice(0, 15).join(', ')}

## Target Role: ${job.role_title} at ${job.company_name}
Key Requirements: ${job.parsed_requirements?.required_skills?.slice(0, 10).join(', ') || 'See job description'}
`.trim();

    // Map status to step number for database updates
    const STATUS_STEP_MAP: Record<string, number> = {
      'generating_context': 1,
      'generating_questions': 2,
      'generating_answers': 3,
      'generating_answers_technical': 4,
      'generating_answers_culture': 5,
      'generating_answers_gap': 6,
      'generating_answers_role': 7,
      'generating_tips': 8,
    };

    // Helper to generate answers for a single category
    const generateAnswersForCategory = async (
      categoryQuestions: InterviewQuestion[] | undefined,
      existingAnswers: InterviewAnswer[],
      nextStatus: string,
      batchLabel: string
    ) => {
      const stepStartTime = Date.now();

      // Handle empty or missing category
      if (!categoryQuestions || categoryQuestions.length === 0) {
        console.log(`[Interview Prep] Job ${jobId}: Skipping ${batchLabel} (no questions)`);
        const nextStep = STATUS_STEP_MAP[nextStatus] || 3;

        await supabase
          .from('interview_prep')
          .update({
            status: nextStatus,
            current_step: nextStep,
            updated_at: new Date().toISOString(),
          })
          .eq('job_id', jobId)
          .eq('user_id', user.id);

        return NextResponse.json({
          success: true,
          status: nextStatus,
          currentStep: nextStep,
          message: `${batchLabel} skipped (no questions). Call again to continue.`
        });
      }

      console.log(`[Interview Prep] Job ${jobId}: Generating ${batchLabel} answers for ${categoryQuestions.length} questions...`);

      const answersResult = await llm.complete({
        messages: [
          { role: 'system', content: 'You are an expert interview coach. Generate concise, impactful interview answers using ONLY the candidate\'s real experience. Use STAR format. Be specific with metrics. Output valid JSON only - no markdown code blocks.' },
          { role: 'user', content: `${GENERATE_INTERVIEW_ANSWERS_PROMPT}\n\nQuestions:\n${JSON.stringify(categoryQuestions, null, 2)}\n\n${condensedContext}` },
        ],
        config: { provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.7, maxTokens: 2000 },
      });

      const { data: newAnswers, error: parseError } = safeParseJSON<InterviewAnswer[]>(
        answersResult.content,
        `${batchLabel} answers`
      );

      if (parseError || !newAnswers) {
        await supabase
          .from('interview_prep')
          .update({ status: 'failed', error_message: parseError || `Failed to parse ${batchLabel} answers` })
          .eq('job_id', jobId)
          .eq('user_id', user.id);
        return NextResponse.json({ error: parseError, status: 'failed' }, { status: 500 });
      }

      console.log(`[Interview Prep] Job ${jobId}: ${batchLabel} complete - ${newAnswers.length} answers in ${Date.now() - stepStartTime}ms`);

      const allAnswers = [...existingAnswers, ...newAnswers];
      const nextStep = STATUS_STEP_MAP[nextStatus] || 3;

      await supabase
        .from('interview_prep')
        .update({
          answers: allAnswers,
          status: nextStatus,
          current_step: nextStep,
          updated_at: new Date().toISOString(),
        })
        .eq('job_id', jobId)
        .eq('user_id', user.id);

      return NextResponse.json({
        success: true,
        status: nextStatus,
        currentStep: nextStep,
        message: `${batchLabel} answers generated. Call again to continue.`
      });
    };

    // Step 3a: Generate Behavioral Answers
    if (currentStatus === 'generating_answers') {
      const questions = existingPrep?.questions as InterviewQuestions;

      if (!questions || Object.keys(questions).length === 0) {
        console.error(`[Interview Prep] Job ${jobId}: No questions found at step 3`);
        await supabase
          .from('interview_prep')
          .update({ status: 'failed', error_message: 'No questions found - please restart' })
          .eq('job_id', jobId)
          .eq('user_id', user.id);
        return NextResponse.json({ error: 'No questions found', status: 'failed' }, { status: 500 });
      }

      return generateAnswersForCategory(
        questions.behavioral,
        [],
        'generating_answers_technical',
        'Behavioral'
      );
    }

    // Step 4: Generate Technical Answers
    if (currentStatus === 'generating_answers_technical') {
      const questions = existingPrep?.questions as InterviewQuestions;
      const existingAnswers = (existingPrep?.answers || []) as InterviewAnswer[];
      return generateAnswersForCategory(
        questions?.technical,
        existingAnswers,
        'generating_answers_culture',
        'Technical'
      );
    }

    // Step 5: Generate Culture Fit Answers
    if (currentStatus === 'generating_answers_culture') {
      const questions = existingPrep?.questions as InterviewQuestions;
      const existingAnswers = (existingPrep?.answers || []) as InterviewAnswer[];
      return generateAnswersForCategory(
        questions?.culture_fit,
        existingAnswers,
        'generating_answers_gap',
        'Culture fit'
      );
    }

    // Step 6: Generate Gap Probing Answers
    if (currentStatus === 'generating_answers_gap') {
      const questions = existingPrep?.questions as InterviewQuestions;
      const existingAnswers = (existingPrep?.answers || []) as InterviewAnswer[];
      return generateAnswersForCategory(
        questions?.gap_probing,
        existingAnswers,
        'generating_answers_role',
        'Gap probing'
      );
    }

    // Step 7: Generate Role Specific Answers
    if (currentStatus === 'generating_answers_role') {
      const questions = existingPrep?.questions as InterviewQuestions;
      const existingAnswers = (existingPrep?.answers || []) as InterviewAnswer[];
      return generateAnswersForCategory(
        questions?.role_specific,
        existingAnswers,
        'generating_tips',
        'Role specific'
      );
    }

    // Step 8: Generate Tips
    if (currentStatus === 'generating_tips') {
      console.log(`[Interview Prep] Job ${jobId}: Step 8 - Generating tips...`);
      const roleContext = existingPrep?.role_context as RoleContextPackage;

      const tipsResult = await llm.complete({
        messages: [
          { role: 'system', content: INTERVIEW_COACH_SYSTEM_PROMPT },
          { role: 'user', content: `${GENERATE_QUICK_TIPS_PROMPT}\n\nRole Context:\n${JSON.stringify(roleContext, null, 2)}\n\n${contextStr}` },
        ],
        config: { provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.8, maxTokens: 1000 },
      });

      let quickTips: string[] = [];
      const { data: parsedTips } = safeParseJSON<string[]>(tipsResult.content, 'tips');
      if (parsedTips && Array.isArray(parsedTips)) {
        quickTips = parsedTips;
      }

      console.log(`[Interview Prep] Job ${jobId}: Complete! Total time: ${Date.now() - startTime}ms`);

      const { data: finalPrep } = await supabase
        .from('interview_prep')
        .update({
          quick_tips: quickTips,
          status: 'completed',
          current_step: 9,
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
        currentStep: 9,
        prep: finalPrep
      });
    }

    // Shouldn't reach here - unknown status
    console.error(`[Interview Prep] Job ${jobId}: Unknown status "${currentStatus}", resetting...`);
    await supabase
      .from('interview_prep')
      .update({ status: 'failed', error_message: `Unknown status: ${currentStatus}` })
      .eq('job_id', jobId)
      .eq('user_id', user.id);

    return NextResponse.json({
      error: `Unknown status: ${currentStatus}`,
      status: 'failed'
    }, { status: 500 });

  } catch (error) {
    console.error(`[Interview Prep] Job ${jobId || 'unknown'}: Error after ${Date.now() - startTime}ms:`, error);

    // Try to mark as failed in database
    if (jobId) {
      try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('interview_prep')
            .update({
              status: 'failed',
              error_message: error instanceof Error ? error.message : 'Generation failed unexpectedly'
            })
            .eq('job_id', jobId)
            .eq('user_id', user.id);
        }
      } catch {
        // Ignore errors in error handler
      }
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate interview prep',
        status: 'failed'
      },
      { status: 500 }
    );
  }
}

// DELETE endpoint to reset interview prep
export async function DELETE(request: Request) {
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

    console.log(`[Interview Prep] Job ${jobId}: Deleting/resetting...`);

    const { error } = await supabase
      .from('interview_prep')
      .delete()
      .eq('job_id', jobId)
      .eq('user_id', user.id);

    if (error) {
      console.error(`[Interview Prep] Job ${jobId}: Delete failed`, error);
      return NextResponse.json({ error: 'Failed to reset interview prep' }, { status: 500 });
    }

    console.log(`[Interview Prep] Job ${jobId}: Reset complete`);

    return NextResponse.json({
      success: true,
      message: 'Interview prep reset successfully'
    });
  } catch (error) {
    console.error('Interview prep reset error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reset interview prep' },
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
      totalSteps: prep?.total_steps || 8,
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
