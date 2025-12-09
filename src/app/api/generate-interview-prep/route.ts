import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasCoachAccess } from '@/lib/stripe';

// This API now just triggers the Supabase Edge Function
// The actual LLM work happens in the edge function with longer timeout
export const maxDuration = 30;

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

    const body = await request.json();
    const jobId = body.jobId;
    const forceReset = body.forceReset === true;

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    console.log(`[Interview Prep] Job ${jobId}: Starting request (forceReset=${forceReset})`);

    // Check current status
    const { data: existingPrep } = await supabase
      .from('interview_prep')
      .select('status, current_step, updated_at')
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .maybeSingle();

    const currentStatus = existingPrep?.status || 'not_started';

    // Check if already completed
    if (currentStatus === 'completed' && !forceReset) {
      console.log(`[Interview Prep] Job ${jobId}: Already completed`);
      return NextResponse.json({
        success: true,
        status: 'completed',
        currentStep: 9,
        message: 'Interview prep already completed'
      });
    }

    // Check if currently generating (not stuck)
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

    const lastUpdate = existingPrep?.updated_at ? new Date(existingPrep.updated_at) : null;
    const isStuck = lastUpdate && (Date.now() - lastUpdate.getTime() > 2 * 60 * 1000);

    if (validInProgressStatuses.includes(currentStatus) && !isStuck && !forceReset) {
      console.log(`[Interview Prep] Job ${jobId}: Already in progress at status ${currentStatus}`);
      return NextResponse.json({
        success: true,
        status: currentStatus,
        currentStep: existingPrep?.current_step || 1,
        message: 'Generation already in progress'
      });
    }

    // Verify job exists and has resume
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, resume_id')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check for resume
    let hasResume = false;
    if (job.resume_id) {
      const { data: resume } = await supabase
        .from('resumes')
        .select('id')
        .eq('id', job.resume_id)
        .eq('user_id', user.id)
        .maybeSingle();
      hasResume = !!resume;
    }
    if (!hasResume) {
      const { data: primaryResume } = await supabase
        .from('resumes')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .maybeSingle();
      hasResume = !!primaryResume;
    }

    if (!hasResume) {
      return NextResponse.json(
        { error: 'Please upload a resume before generating interview prep' },
        { status: 400 }
      );
    }

    // Delete existing record if forcing reset or starting fresh
    if (existingPrep) {
      await supabase
        .from('interview_prep')
        .delete()
        .eq('job_id', jobId)
        .eq('user_id', user.id);
    }

    // Create initial record
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

    // Trigger the Supabase Edge Function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error(`[Interview Prep] Job ${jobId}: Missing Supabase config`);
      await supabase
        .from('interview_prep')
        .update({ status: 'failed', error_message: 'Server configuration error' })
        .eq('job_id', jobId)
        .eq('user_id', user.id);
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Call edge function (don't wait for response - it runs in background)
    console.log(`[Interview Prep] Job ${jobId}: Triggering edge function...`);

    // Fire and forget - the edge function will update the database
    fetch(`${supabaseUrl}/functions/v1/generate-interview-prep`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobId,
        userId: user.id,
      }),
    }).catch(err => {
      console.error(`[Interview Prep] Job ${jobId}: Edge function trigger error:`, err);
    });

    console.log(`[Interview Prep] Job ${jobId}: Edge function triggered, returning immediately`);

    return NextResponse.json({
      success: true,
      status: 'generating_context',
      currentStep: 1,
      message: 'Interview prep generation started'
    });

  } catch (error) {
    console.error('[Interview Prep] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start interview prep generation' },
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
