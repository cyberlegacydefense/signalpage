import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ApplicationStatus, InterviewRound } from '@/types';

interface UpdateStatusRequest {
  jobId: string;
  applicationStatus: ApplicationStatus;
  interviewRounds?: InterviewRound[];
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: UpdateStatusRequest = await request.json();
    const { jobId, applicationStatus, interviewRounds } = body;

    if (!jobId || !applicationStatus) {
      return NextResponse.json(
        { error: 'Job ID and application status are required' },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      application_status: applicationStatus,
      updated_at: new Date().toISOString(),
    };

    // Add interview rounds if provided
    if (interviewRounds !== undefined) {
      updateData.interview_rounds = interviewRounds;
    }

    // Set timestamp fields based on status changes
    if (applicationStatus === 'applied') {
      // Only set applied_at if not already set
      const { data: existingJob } = await supabase
        .from('jobs')
        .select('applied_at')
        .eq('id', jobId)
        .eq('user_id', user.id)
        .single();

      if (!existingJob?.applied_at) {
        updateData.applied_at = new Date().toISOString();
      }
    } else if (applicationStatus === 'rejected') {
      updateData.rejected_at = new Date().toISOString();
    } else if (applicationStatus === 'offer_received') {
      updateData.offer_received_at = new Date().toISOString();
    }

    // Update the job
    const { data: job, error } = await supabase
      .from('jobs')
      .update(updateData)
      .eq('id', jobId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('[Update Status] Error:', error);
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
    }

    return NextResponse.json({ success: true, job });
  } catch (error) {
    console.error('[Update Status] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update status' },
      { status: 500 }
    );
  }
}
