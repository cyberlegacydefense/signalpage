import { NextResponse } from 'next/server';
import { createServiceClient, createClient } from '@/lib/supabase/server';
import type { AnalyticsEventType, VisitorFingerprint } from '@/types';

// High engagement threshold in seconds (2 minutes)
const HIGH_ENGAGEMENT_THRESHOLD = 120;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pageId, eventType, sectionId, metadata, visitorFingerprint, timeOnPage } = body;

    if (!pageId || !eventType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate event type
    const validEventTypes: (AnalyticsEventType | 'high_engagement' | 'page_leave')[] = [
      'page_view',
      'section_view',
      'case_study_click',
      'cta_click',
      'pdf_download',
      'calendar_click',
      'contact_click',
      'high_engagement',
      'page_leave',
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
    let pageOwnerId: string | null = null;
    try {
      const authClient = await createClient();
      const { data: { user } } = await authClient.auth.getUser();

      // Get page owner
      const { data: page } = await supabase
        .from('signal_pages')
        .select('user_id')
        .eq('id', pageId)
        .single();

      if (page) {
        pageOwnerId = page.user_id;
        if (user && page.user_id === user.id) {
          isOwnerView = true;
        }
      }
    } catch {
      // If auth check fails, treat as non-owner view
    }

    // Get request headers for analytics
    const userAgent = request.headers.get('user-agent');
    const referer = request.headers.get('referer');
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');

    // Create partial IP hash for privacy (only use first two octets)
    let ipHash = '';
    const ip = forwardedFor?.split(',')[0]?.trim() || realIp || '';
    if (ip) {
      const parts = ip.split('.');
      if (parts.length >= 2) {
        ipHash = `${parts[0]}.${parts[1]}.*.*`;
      }
    }

    // Get visitor hash from fingerprint or generate from available data
    const visitorHash = (visitorFingerprint as VisitorFingerprint)?.visitor_hash ||
      (ipHash && userAgent ? `${ipHash}-${hashString(userAgent)}` : null);

    // Check if this is a return visitor (for page_view events)
    let isReturnVisitor = false;
    if (eventType === 'page_view' && visitorHash && !isOwnerView) {
      const { data: previousVisits } = await supabase
        .from('page_analytics')
        .select('id')
        .eq('page_id', pageId)
        .eq('visitor_hash', visitorHash)
        .eq('event_type', 'page_view')
        .limit(1);

      isReturnVisitor = (previousVisits?.length || 0) > 0;
    }

    // Insert analytics record
    const { error } = await supabase.from('page_analytics').insert({
      page_id: pageId,
      event_type: eventType,
      section_id: sectionId,
      referrer: referer,
      user_agent: userAgent,
      ip_hash: ipHash,
      visitor_hash: visitorHash,
      is_return_visitor: isReturnVisitor,
      time_on_page: timeOnPage || null,
      screen_resolution: (visitorFingerprint as VisitorFingerprint)?.screen_resolution || null,
      timezone: (visitorFingerprint as VisitorFingerprint)?.timezone || null,
      language: (visitorFingerprint as VisitorFingerprint)?.language || null,
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

    // Create notifications for page owner (if not owner view)
    if (!isOwnerView && pageOwnerId) {
      await createNotifications(supabase, pageOwnerId, pageId, eventType, {
        isReturnVisitor,
        timeOnPage,
        visitorHash,
      });
    }

    return NextResponse.json({ success: true, isReturnVisitor });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Simple hash function for strings
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Create notifications based on event type and user settings
async function createNotifications(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  userId: string,
  pageId: string,
  eventType: string,
  data: {
    isReturnVisitor: boolean;
    timeOnPage?: number;
    visitorHash?: string | null;
  }
) {
  try {
    // Get user notification settings
    const { data: settings } = await supabase
      .from('user_notification_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // Default settings if none exist
    const notifyPageView = settings?.email_on_page_view ?? false;
    const notifyReturnVisitor = settings?.email_on_return_visitor ?? true;
    const notifyHighEngagement = settings?.email_on_high_engagement ?? true;

    // Get page info for notification message
    const { data: page } = await supabase
      .from('signal_pages')
      .select(`
        slug,
        job_id,
        jobs:job_id(company_name, role_title)
      `)
      .eq('id', pageId)
      .single();

    // Extract job info - Supabase returns single object for foreign key relations
    let pageName = page?.slug || 'Your Signal Page';
    if (page?.jobs && typeof page.jobs === 'object' && !Array.isArray(page.jobs)) {
      const job = page.jobs as { company_name?: string; role_title?: string };
      if (job.company_name && job.role_title) {
        pageName = `${job.company_name} - ${job.role_title}`;
      }
    }

    // Page view notification
    if (eventType === 'page_view' && notifyPageView) {
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'page_view',
        title: 'New Page View',
        message: `Someone viewed your "${pageName}" page`,
        page_id: pageId,
        metadata: { visitor_hash: data.visitorHash },
      });
    }

    // Return visitor notification
    if (eventType === 'page_view' && data.isReturnVisitor && notifyReturnVisitor) {
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'return_visitor',
        title: 'Return Visitor!',
        message: `Someone returned to view your "${pageName}" page again`,
        page_id: pageId,
        metadata: { visitor_hash: data.visitorHash },
      });
    }

    // High engagement notification
    if (eventType === 'high_engagement' && notifyHighEngagement && data.timeOnPage) {
      const minutes = Math.floor(data.timeOnPage / 60);
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'high_engagement',
        title: 'High Engagement Alert',
        message: `Someone spent ${minutes}+ minutes on your "${pageName}" page`,
        page_id: pageId,
        metadata: {
          time_on_page: data.timeOnPage,
          visitor_hash: data.visitorHash,
        },
      });
    }
  } catch (error) {
    console.error('Error creating notification:', error);
    // Don't throw - notifications are non-critical
  }
}
