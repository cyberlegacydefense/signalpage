import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasProAccess } from '@/lib/stripe';

// GET - Retrieve user career settings
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: settings, error } = await supabase
      .from('user_career_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('[Career Settings] Fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }

    // Return defaults if no settings exist
    return NextResponse.json({
      settings: settings || {
        auto_generate_on_application: true,
        auto_extract_from_resume: true,
        notify_on_insights: false,
      },
    });

  } catch (error) {
    console.error('[Career Settings] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// PUT - Update user career settings
export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check subscription
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
    const { auto_generate_on_application, auto_extract_from_resume, notify_on_insights } = body;

    // Check if settings exist
    const { data: existingSettings } = await supabase
      .from('user_career_settings')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    let settings;
    let error;

    if (existingSettings) {
      // Update existing
      const result = await supabase
        .from('user_career_settings')
        .update({
          auto_generate_on_application: auto_generate_on_application ?? true,
          auto_extract_from_resume: auto_extract_from_resume ?? true,
          notify_on_insights: notify_on_insights ?? false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single();

      settings = result.data;
      error = result.error;
    } else {
      // Insert new
      const result = await supabase
        .from('user_career_settings')
        .insert({
          user_id: user.id,
          auto_generate_on_application: auto_generate_on_application ?? true,
          auto_extract_from_resume: auto_extract_from_resume ?? true,
          notify_on_insights: notify_on_insights ?? false,
        })
        .select()
        .single();

      settings = result.data;
      error = result.error;
    }

    if (error) {
      console.error('[Career Settings] Save error:', error);
      return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }

    return NextResponse.json({ success: true, settings });

  } catch (error) {
    console.error('[Career Settings] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save settings' },
      { status: 500 }
    );
  }
}
