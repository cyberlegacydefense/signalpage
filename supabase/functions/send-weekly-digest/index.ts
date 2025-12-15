// Supabase Edge Function for Weekly Digest Emails
// Triggered by pg_cron to generate weekly analytics summaries
// Emails are queued for Zapier to send via Zoho

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Types
interface PageAnalytics {
  page_id: string;
  total_views: number;
  unique_visitors: number;
  return_visitors: number;
  avg_time_on_page: number;
  high_engagement_count: number;
  top_referrers: Record<string, number>;
}

interface SignalPage {
  id: string;
  slug: string;
  job_id: string;
  jobs?: {
    role_title: string;
    company_name: string;
  };
}

interface UserDigestData {
  user_id: string;
  email: string;
  full_name: string | null;
  pages: Array<{
    page: SignalPage;
    analytics: PageAnalytics;
  }>;
  total_views: number;
  total_unique_visitors: number;
  total_return_visitors: number;
}

// Email template
function generateDigestEmailHtml(data: UserDigestData): string {
  const greeting = data.full_name ? `Hi ${data.full_name.split(' ')[0]}` : 'Hi there';
  const weekStart = getWeekStart();
  const weekEnd = new Date();

  const formatDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  let pagesHtml = '';

  for (const { page, analytics } of data.pages) {
    const roleTitle = page.jobs?.role_title || 'Signal Page';
    const companyName = page.jobs?.company_name || '';
    const pageTitle = companyName ? `${roleTitle} @ ${companyName}` : roleTitle;

    pagesHtml += `
      <tr>
        <td style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
          <p style="margin: 0 0 8px 0; font-weight: 600; color: #111827;">${pageTitle}</p>
          <table style="width: 100%;">
            <tr>
              <td style="padding: 4px 0; color: #6b7280; font-size: 14px;">Total Views</td>
              <td style="padding: 4px 0; text-align: right; font-weight: 500; color: #111827;">${analytics.total_views}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #6b7280; font-size: 14px;">Unique Visitors</td>
              <td style="padding: 4px 0; text-align: right; font-weight: 500; color: #111827;">${analytics.unique_visitors}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #6b7280; font-size: 14px;">Return Visitors</td>
              <td style="padding: 4px 0; text-align: right; font-weight: 500; color: #2563eb;">${analytics.return_visitors}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #6b7280; font-size: 14px;">High Engagement (2+ min)</td>
              <td style="padding: 4px 0; text-align: right; font-weight: 500; color: #059669;">${analytics.high_engagement_count}</td>
            </tr>
            ${analytics.avg_time_on_page > 0 ? `
            <tr>
              <td style="padding: 4px 0; color: #6b7280; font-size: 14px;">Avg. Time on Page</td>
              <td style="padding: 4px 0; text-align: right; font-weight: 500; color: #111827;">${formatDuration(analytics.avg_time_on_page)}</td>
            </tr>
            ` : ''}
          </table>
        </td>
      </tr>
    `;
  }

  // If no pages have views, show a different message
  if (data.pages.length === 0 || data.total_views === 0) {
    pagesHtml = `
      <tr>
        <td style="padding: 24px; text-align: center; color: #6b7280;">
          <p style="margin: 0;">No page views this week.</p>
          <p style="margin: 8px 0 0 0; font-size: 14px;">Share your SignalPages to start getting views!</p>
        </td>
      </tr>
    `;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Weekly SignalPage Digest</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="padding: 32px 24px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">SignalPage</h1>
        <p style="margin: 8px 0 0 0; color: #bfdbfe; font-size: 14px;">Weekly Analytics Digest</p>
      </td>
    </tr>

    <!-- Greeting -->
    <tr>
      <td style="padding: 24px;">
        <p style="margin: 0; font-size: 16px; color: #374151;">${greeting},</p>
        <p style="margin: 12px 0 0 0; font-size: 14px; color: #6b7280;">
          Here's how your SignalPages performed from ${formatDate(weekStart)} to ${formatDate(weekEnd)}.
        </p>
      </td>
    </tr>

    <!-- Summary Stats -->
    <tr>
      <td style="padding: 0 24px;">
        <table style="width: 100%; background-color: #f9fafb; border-radius: 8px;">
          <tr>
            <td style="padding: 16px; text-align: center; border-right: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 28px; font-weight: 700; color: #111827;">${data.total_views}</p>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Total Views</p>
            </td>
            <td style="padding: 16px; text-align: center; border-right: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 28px; font-weight: 700; color: #111827;">${data.total_unique_visitors}</p>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Unique</p>
            </td>
            <td style="padding: 16px; text-align: center;">
              <p style="margin: 0; font-size: 28px; font-weight: 700; color: #2563eb;">${data.total_return_visitors}</p>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Return</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Page Details -->
    <tr>
      <td style="padding: 24px;">
        <h2 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #111827;">Page Performance</h2>
        <table style="width: 100%; border: 1px solid #e5e7eb; border-radius: 8px; border-collapse: collapse;">
          ${pagesHtml}
        </table>
      </td>
    </tr>

    <!-- CTA -->
    <tr>
      <td style="padding: 0 24px 24px;">
        <a href="https://signalpage.ai/dashboard"
           style="display: block; text-align: center; background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
          View Full Analytics
        </a>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
          You're receiving this because you opted in to weekly digests.
          <br>
          <a href="https://signalpage.ai/dashboard/profile" style="color: #6b7280;">Manage preferences</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

function generateDigestEmailText(data: UserDigestData): string {
  const greeting = data.full_name ? `Hi ${data.full_name.split(' ')[0]}` : 'Hi there';
  const weekStart = getWeekStart();
  const weekEnd = new Date();

  const formatDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  let text = `${greeting},

Your SignalPage Weekly Digest (${formatDate(weekStart)} - ${formatDate(weekEnd)})

SUMMARY
-------
Total Views: ${data.total_views}
Unique Visitors: ${data.total_unique_visitors}
Return Visitors: ${data.total_return_visitors}

`;

  if (data.pages.length > 0 && data.total_views > 0) {
    text += `PAGE PERFORMANCE
----------------
`;
    for (const { page, analytics } of data.pages) {
      const roleTitle = page.jobs?.role_title || 'Signal Page';
      const companyName = page.jobs?.company_name || '';
      const pageTitle = companyName ? `${roleTitle} @ ${companyName}` : roleTitle;

      text += `
${pageTitle}
  Views: ${analytics.total_views}
  Unique: ${analytics.unique_visitors}
  Return: ${analytics.return_visitors}
  High Engagement: ${analytics.high_engagement_count}
`;
    }
  } else {
    text += `No page views this week. Share your SignalPages to start getting views!
`;
  }

  text += `
---
View full analytics: https://signalpage.ai/dashboard
Manage preferences: https://signalpage.ai/dashboard/profile
`;

  return text;
}

function getWeekStart(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek - 6; // Last Monday
  return new Date(now.setDate(diff));
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

// Queue email for Zapier to send
async function queueEmail(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  toEmail: string,
  toName: string | null,
  subject: string,
  bodyHtml: string,
  bodyText: string,
  emailType: string,
  metadata: Record<string, unknown> = {}
): Promise<boolean> {
  try {
    const { error } = await supabase.from('email_queue').insert({
      user_id: userId,
      to_email: toEmail,
      to_name: toName,
      subject,
      body_html: bodyHtml,
      body_text: bodyText,
      email_type: emailType,
      metadata,
      status: 'pending',
    });

    if (error) {
      console.error(`[Weekly Digest] Failed to queue email for ${toEmail}:`, error);
      return false;
    }

    console.log(`[Weekly Digest] Email queued for ${toEmail}`);
    return true;
  } catch (error) {
    console.error(`[Weekly Digest] Error queuing email for ${toEmail}:`, error);
    return false;
  }
}

// Main handler
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('[Weekly Digest] Starting weekly digest generation...');

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the day of week (0 = Sunday, 1 = Monday, etc.)
    const today = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayName = dayNames[today.getDay()];

    console.log(`[Weekly Digest] Today is ${todayName}, fetching users who want digests on this day...`);

    // Get users who want weekly digest on this day
    const { data: settings, error: settingsError } = await supabase
      .from('user_notification_settings')
      .select(`
        user_id,
        digest_day,
        profiles:user_id (
          id,
          full_name
        )
      `)
      .eq('email_weekly_digest', true)
      .eq('digest_day', todayName);

    if (settingsError) {
      throw new Error(`Failed to fetch notification settings: ${settingsError.message}`);
    }

    if (!settings || settings.length === 0) {
      console.log(`[Weekly Digest] No users opted in for digest on ${todayName}`);
      return new Response(
        JSON.stringify({ success: true, message: 'No users to process', queued: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Weekly Digest] Found ${settings.length} users to process`);

    // Calculate date range (last 7 days)
    const weekEnd = new Date();
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    let queuedCount = 0;
    let errorCount = 0;

    for (const setting of settings) {
      const userId = setting.user_id;
      const profile = setting.profiles as unknown as { id: string; full_name: string | null };

      console.log(`[Weekly Digest] Processing user ${userId}...`);

      // Get user's email from auth
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);

      if (authError || !authUser?.user?.email) {
        console.error(`[Weekly Digest] Could not get email for user ${userId}`);
        errorCount++;
        continue;
      }

      const userEmail = authUser.user.email;

      // Get user's SignalPages
      const { data: pages, error: pagesError } = await supabase
        .from('signal_pages')
        .select(`
          id,
          slug,
          job_id,
          jobs:job_id (
            role_title,
            company_name
          )
        `)
        .eq('user_id', userId);

      if (pagesError || !pages || pages.length === 0) {
        console.log(`[Weekly Digest] No pages found for user ${userId}`);
        continue;
      }

      // Get analytics for each page in the last week
      const pageAnalytics: Array<{ page: SignalPage; analytics: PageAnalytics }> = [];
      let totalViews = 0;
      let totalUnique = 0;
      let totalReturn = 0;

      for (const page of pages) {
        const { data: analytics, error: analyticsError } = await supabase
          .from('page_analytics')
          .select('*')
          .eq('page_id', page.id)
          .eq('event_type', 'page_view')
          .gte('created_at', weekStart.toISOString())
          .lte('created_at', weekEnd.toISOString());

        if (analyticsError) {
          console.error(`[Weekly Digest] Error fetching analytics for page ${page.id}:`, analyticsError);
          continue;
        }

        if (!analytics || analytics.length === 0) {
          continue;
        }

        // Calculate metrics
        const views = analytics.length;
        const uniqueVisitors = new Set(analytics.map(a => a.visitor_hash || a.ip_address)).size;
        const returnVisitors = analytics.filter(a => a.is_return_visitor).length;
        const timeOnPageValues = analytics.filter(a => a.time_on_page).map(a => a.time_on_page);
        const avgTimeOnPage = timeOnPageValues.length > 0
          ? Math.round(timeOnPageValues.reduce((a, b) => a + b, 0) / timeOnPageValues.length)
          : 0;
        const highEngagement = analytics.filter(a => a.time_on_page && a.time_on_page >= 120).length;

        // Calculate top referrers
        const referrerCounts: Record<string, number> = {};
        for (const a of analytics) {
          const ref = a.referrer || 'Direct';
          referrerCounts[ref] = (referrerCounts[ref] || 0) + 1;
        }

        pageAnalytics.push({
          page: page as unknown as SignalPage,
          analytics: {
            page_id: page.id,
            total_views: views,
            unique_visitors: uniqueVisitors,
            return_visitors: returnVisitors,
            avg_time_on_page: avgTimeOnPage,
            high_engagement_count: highEngagement,
            top_referrers: referrerCounts,
          },
        });

        totalViews += views;
        totalUnique += uniqueVisitors;
        totalReturn += returnVisitors;

        // Save snapshot to analytics_snapshots table
        const weekStartDate = weekStart.toISOString().split('T')[0];
        await supabase
          .from('analytics_snapshots')
          .upsert({
            user_id: userId,
            page_id: page.id,
            week_start: weekStartDate,
            total_views: views,
            unique_visitors: uniqueVisitors,
            return_visitors: returnVisitors,
            avg_time_on_page: avgTimeOnPage,
            high_engagement_count: highEngagement,
            top_referrers: referrerCounts,
          }, {
            onConflict: 'page_id,week_start',
          });
      }

      // Prepare digest data
      const digestData: UserDigestData = {
        user_id: userId,
        email: userEmail,
        full_name: profile?.full_name || null,
        pages: pageAnalytics,
        total_views: totalViews,
        total_unique_visitors: totalUnique,
        total_return_visitors: totalReturn,
      };

      // Generate email content
      const subject = totalViews > 0
        ? `Your SignalPage Weekly Digest - ${totalViews} views this week`
        : `Your SignalPage Weekly Digest`;
      const bodyHtml = generateDigestEmailHtml(digestData);
      const bodyText = generateDigestEmailText(digestData);

      // Queue email for Zapier
      const queued = await queueEmail(
        supabase,
        userId,
        userEmail,
        profile?.full_name || null,
        subject,
        bodyHtml,
        bodyText,
        'weekly_digest',
        { total_views: totalViews, total_unique: totalUnique, total_return: totalReturn }
      );

      if (queued) {
        queuedCount++;

        // Create notification record
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'weekly_digest',
          title: 'Weekly Digest Queued',
          message: `Your weekly analytics digest is being sent to ${userEmail}`,
          metadata: { total_views: totalViews, total_unique: totalUnique, total_return: totalReturn },
          is_read: false,
          is_emailed: true,
        });
      } else {
        errorCount++;
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[Weekly Digest] Completed in ${elapsed}ms. Queued: ${queuedCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        queued: queuedCount,
        errors: errorCount,
        elapsed_ms: elapsed,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Weekly Digest] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
