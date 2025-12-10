import { NextResponse } from 'next/server';
import { createServiceClient, createClient } from '@/lib/supabase/server';
import type { AnalyticsEventType } from '@/types';

export async function POST(request: Request) {
  try {
    const { pageId, eventType, sectionId, metadata } = await request.json();

    if (!pageId || !eventType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate event type
    const validEventTypes: AnalyticsEventType[] = [
      'page_view',
      'section_view',
      'case_study_click',
      'cta_click',
      'pdf_download',
      'calendar_click',
      'contact_click',
    ];

    if (!validEventTypes.includes(eventType)) {
      return NextResponse.json(
        { error: 'Invalid event type' },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();

    // Check if the viewer is the page owner (only if logged in)
    let isOwnerView = false;
    try {
      const authClient = await createClient();
      const { data: { user } } = await authClient.auth.getUser();

      if (user) {
        // Check if this user owns the page
        const { data: page } = await supabase
          .from('signal_pages')
          .select('user_id')
          .eq('id', pageId)
          .single();

        if (page && page.user_id === user.id) {
          isOwnerView = true;
        }
      }
    } catch {
      // If auth check fails, treat as non-owner view
    }

    // Get request headers for analytics
    const userAgent = request.headers.get('user-agent');
    const referer = request.headers.get('referer');

    const { error } = await supabase.from('page_analytics').insert({
      page_id: pageId,
      event_type: eventType,
      section_id: sectionId,
      referrer: referer,
      user_agent: userAgent,
      metadata,
      is_owner_view: isOwnerView,
    });

    if (error) {
      console.error('Error recording analytics:', error);
      return NextResponse.json(
        { error: 'Failed to record analytics' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
