import { NextResponse } from 'next/server';
import { createServiceClient, createClient } from '@/lib/supabase/server';
import type { AnalyticsEventType, VisitorFingerprint } from '@/types';

// High engagement threshold in seconds (2 minutes)
const HIGH_ENGAGEMENT_THRESHOLD = 120;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pageId, eventType, sectionId, metadata, visitorFingerprint, timeOnPage, scrollDepth } = body;

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
      scroll_depth: scrollDepth || null,
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

// Email template generators
function generateNotificationEmailHtml(
  type: 'page_view' | 'return_visitor' | 'high_engagement',
  pageName: string,
  userName: string | null,
  extraData?: { minutes?: number }
): string {
  const greeting = userName ? `Hi ${userName.split(' ')[0]}` : 'Hi there';

  let headline = '';
  let description = '';
  let emoji = '';

  switch (type) {
    case 'page_view':
      emoji = '👀';
      headline = 'New Page View';
      description = `Someone just viewed your <strong>"${pageName}"</strong> SignalPage.`;
      break;
    case 'return_visitor':
      emoji = '🔄';
      headline = 'Return Visitor Alert';
      description = `Great news! Someone came back to view your <strong>"${pageName}"</strong> SignalPage again. Return visitors often indicate serious interest.`;
      break;
    case 'high_engagement':
      emoji = '🔥';
      headline = 'High Engagement Alert';
      description = `Someone spent <strong>${extraData?.minutes || 2}+ minutes</strong> on your <strong>"${pageName}"</strong> SignalPage. This level of engagement suggests they're seriously considering you.`;
      break;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headline}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 32px 24px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">SignalPage</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px 24px;">
        <p style="margin: 0 0 16px 0; font-size: 32px;">${emoji}</p>
        <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #111827;">${headline}</h2>
        <p style="margin: 0 0 8px 0; font-size: 16px; color: #374151;">${greeting},</p>
        <p style="margin: 0 0 24px 0; font-size: 16px; color: #374151; line-height: 1.6;">${description}</p>
        <a href="https://signalpage.ai/dashboard/analytics"
           style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
          View Analytics
        </a>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
          <a href="https://signalpage.ai/dashboard/profile" style="color: #6b7280;">Manage notification preferences</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function generateNotificationEmailText(
  type: 'page_view' | 'return_visitor' | 'high_engagement',
  pageName: string,
  userName: string | null,
  extraData?: { minutes?: number }
): string {
  const greeting = userName ? `Hi ${userName.split(' ')[0]}` : 'Hi there';

  let message = '';

  switch (type) {
    case 'page_view':
      message = `Someone just viewed your "${pageName}" SignalPage.`;
      break;
    case 'return_visitor':
      message = `Great news! Someone came back to view your "${pageName}" SignalPage again. Return visitors often indicate serious interest.`;
      break;
    case 'high_engagement':
      message = `Someone spent ${extraData?.minutes || 2}+ minutes on your "${pageName}" SignalPage. This level of engagement suggests they're seriously considering you.`;
      break;
  }

  return `${greeting},

${message}

View your analytics: https://signalpage.ai/dashboard/analytics

---
Manage notification preferences: https://signalpage.ai/dashboard/profile
`;
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

    // Get user info for email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    const userEmail = profile?.email;
    const userName = profile?.full_name;

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
        pageName = `${job.role_title} @ ${job.company_name}`;
      }
    }

    // Helper to queue email
    async function queueEmail(
      type: 'page_view' | 'return_visitor' | 'high_engagement',
      subject: string,
      extraData?: { minutes?: number }
    ) {
      if (!userEmail) return;

      const bodyHtml = generateNotificationEmailHtml(type, pageName, userName, extraData);
      const bodyText = generateNotificationEmailText(type, pageName, userName, extraData);

      await supabase.from('email_queue').insert({
        user_id: userId,
        to_email: userEmail,
        to_name: userName,
        subject,
        body_html: bodyHtml,
        body_text: bodyText,
        email_type: type,
        metadata: { page_id: pageId, page_name: pageName },
        status: 'pending',
      });
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
        is_emailed: true,
      });
      await queueEmail('page_view', `New view on your "${pageName}" SignalPage`);
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
        is_emailed: true,
      });
      await queueEmail('return_visitor', `Return visitor on your "${pageName}" SignalPage`);
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
        is_emailed: true,
      });
      await queueEmail('high_engagement', `High engagement on your "${pageName}" SignalPage`, { minutes });
    }
  } catch (error) {
    console.error('Error creating notification:', error);
    // Don't throw - notifications are non-critical
  }
}
