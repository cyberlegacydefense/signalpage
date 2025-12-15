import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - Fetch user's notification settings
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: settings, error } = await supabase
      .from('user_notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching notification settings:', error);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }

    // Return default settings if none exist
    return NextResponse.json({
      settings: settings || {
        email_on_page_view: false,
        email_on_return_visitor: true,
        email_on_high_engagement: true,
        email_weekly_digest: true,
        digest_day: 'monday',
      },
    });
  } catch (error) {
    console.error('Notification settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST/PUT - Update user's notification settings
export async function POST(request: Request) {
  return updateSettings(request);
}

export async function PUT(request: Request) {
  return updateSettings(request);
}

async function updateSettings(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      email_on_page_view,
      email_on_return_visitor,
      email_on_high_engagement,
      email_weekly_digest,
      digest_day,
    } = body;

    // Upsert settings
    const { data: settings, error } = await supabase
      .from('user_notification_settings')
      .upsert({
        user_id: user.id,
        email_on_page_view: email_on_page_view ?? false,
        email_on_return_visitor: email_on_return_visitor ?? true,
        email_on_high_engagement: email_on_high_engagement ?? true,
        email_weekly_digest: email_weekly_digest ?? true,
        digest_day: digest_day ?? 'monday',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating notification settings:', error);
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Notification settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
