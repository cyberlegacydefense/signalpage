import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
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
