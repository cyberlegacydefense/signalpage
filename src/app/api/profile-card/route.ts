import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Superpower, Availability } from '@/types';

// GET - Fetch user's profile card data
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('positioning_statement, superpowers, availability, calendar_link, profile_card_enabled, username, full_name, headline, avatar_url, linkedin_url, portfolio_url, github_url')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile card:', error);
      return NextResponse.json({ error: 'Failed to fetch profile card' }, { status: 500 });
    }

    return NextResponse.json({
      profileCard: {
        positioning_statement: profile.positioning_statement || '',
        superpowers: (profile.superpowers || []) as Superpower[],
        availability: (profile.availability || {}) as Partial<Availability>,
        calendar_link: profile.calendar_link || '',
        profile_card_enabled: profile.profile_card_enabled || false,
      },
      profile: {
        username: profile.username,
        full_name: profile.full_name,
        headline: profile.headline,
        avatar_url: profile.avatar_url,
        linkedin_url: profile.linkedin_url,
        portfolio_url: profile.portfolio_url,
        github_url: profile.github_url,
      },
    });
  } catch (error) {
    console.error('Profile card error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update user's profile card data
export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      positioning_statement,
      superpowers,
      availability,
      calendar_link,
      profile_card_enabled,
    } = body;

    // Validate superpowers array (max 3)
    if (superpowers && Array.isArray(superpowers) && superpowers.length > 3) {
      return NextResponse.json({ error: 'Maximum 3 superpowers allowed' }, { status: 400 });
    }

    // Validate positioning statement length
    if (positioning_statement && positioning_statement.length > 200) {
      return NextResponse.json({ error: 'Positioning statement must be under 200 characters' }, { status: 400 });
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (positioning_statement !== undefined) {
      updateData.positioning_statement = positioning_statement || null;
    }
    if (superpowers !== undefined) {
      updateData.superpowers = superpowers || [];
    }
    if (availability !== undefined) {
      updateData.availability = availability || {};
    }
    if (calendar_link !== undefined) {
      updateData.calendar_link = calendar_link || null;
    }
    if (profile_card_enabled !== undefined) {
      updateData.profile_card_enabled = profile_card_enabled;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select('positioning_statement, superpowers, availability, calendar_link, profile_card_enabled')
      .single();

    if (error) {
      console.error('Error updating profile card:', error);
      return NextResponse.json({ error: 'Failed to update profile card' }, { status: 500 });
    }

    return NextResponse.json({
      profileCard: {
        positioning_statement: profile.positioning_statement || '',
        superpowers: (profile.superpowers || []) as Superpower[],
        availability: (profile.availability || {}) as Partial<Availability>,
        calendar_link: profile.calendar_link || '',
        profile_card_enabled: profile.profile_card_enabled || false,
      },
    });
  } catch (error) {
    console.error('Profile card error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
