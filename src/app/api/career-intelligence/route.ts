import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasProAccess } from '@/lib/stripe';
import { generateCareerIntelligence } from '@/lib/career-intelligence/generate';

export const maxDuration = 60;

// POST - Generate career intelligence for a job application
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

    if (!hasProAccess(profile?.subscription_tier || 'free')) {
      return NextResponse.json(
        { error: 'Career Intelligence requires a Pro or Coach subscription' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    const result = await generateCareerIntelligence(jobId, user.id, supabase);

    return NextResponse.json({
      success: true,
      ...result,
    });

  } catch (error) {
    console.error('[Career Intelligence] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate career intelligence' },
      { status: 500 }
    );
  }
}

// GET - Retrieve career intelligence data
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const type = searchParams.get('type'); // 'brain', 'narrative', 'assets', 'all'

    // Get active narrative
    const { data: narrative } = await supabase
      .from('career_narratives')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    // Get career assets
    const { data: assets } = await supabase
      .from('career_assets')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // Get application brain (optionally filtered by job) with job details
    let brainQuery = supabase
      .from('application_brain')
      .select(`
        *,
        jobs:job_id (
          role_title,
          company_name
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (jobId) {
      brainQuery = brainQuery.eq('job_id', jobId);
    }

    const { data: brainSnapshots } = await brainQuery;

    // Get user settings
    const { data: settings } = await supabase
      .from('user_career_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    return NextResponse.json({
      narrative,
      assets: assets || [],
      brainSnapshots: brainSnapshots || [],
      settings: settings || {
        auto_generate_on_application: true,
        auto_extract_from_resume: true,
      },
    });

  } catch (error) {
    console.error('[Career Intelligence] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch career intelligence' },
      { status: 500 }
    );
  }
}
