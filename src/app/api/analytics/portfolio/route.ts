import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  calculateEngagementScore,
  computeEngagementMetrics,
} from '@/lib/analytics/engagement-score';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all user's jobs with their signal pages (same approach as My Pages dashboard)
    // This ensures 1:1 alignment between My Pages and Analytics
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select(`
        id,
        company_name,
        role_title,
        application_status,
        signal_pages (
          id,
          slug,
          is_published,
          generated_at
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (jobsError) {
      console.error('Error fetching jobs:', jobsError);
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
    }

    // Transform to pages format, only including jobs with signal pages
    // Each job should have at most one signal page displayed
    const pages = (jobs || [])
      .filter(job => job.signal_pages && Array.isArray(job.signal_pages) && job.signal_pages.length > 0)
      .map(job => {
        const signalPages = job.signal_pages as Array<{ id: string; slug: string; is_published: boolean; generated_at: string }>;
        // Take the most recent signal page for this job
        const page = signalPages.sort((a, b) =>
          new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime()
        )[0];
        return {
          id: page.id,
          slug: page.slug,
          is_published: page.is_published,
          generated_at: page.generated_at,
          job: {
            id: job.id,
            company_name: job.company_name,
            role_title: job.role_title,
            application_status: job.application_status || 'not_applied',
          }
        };
      });

    const pagesError = null; // For compatibility with existing error handling

    if (pagesError) {
      console.error('Error fetching pages:', pagesError);
      return NextResponse.json({ error: 'Failed to fetch pages' }, { status: 500 });
    }

    if (!pages || pages.length === 0) {
      return NextResponse.json({
        summary: {
          totalViews: 0,
          uniqueVisitors: 0,
          returnVisitors: 0,
          avgTimeOnPage: 0,
          avgScrollDepth: 0,
          returnVisitorRate: 0,
          engagementScore: 0,
        },
        pageRankings: [],
        trends: { daily: [], weekly: [] },
        applicationBreakdown: {
          notApplied: 0,
          applied: 0,
          interviewing: 0,
          offerReceived: 0,
          rejected: 0,
        },
      });
    }

    const pageIds = pages.map(p => p.id);

    // Get aggregated analytics for all pages
    const { data: analytics, error: analyticsError } = await supabase
      .from('page_analytics')
      .select('page_id, event_type, is_owner_view, is_return_visitor, time_on_page, scroll_depth, visitor_hash, created_at')
      .in('page_id', pageIds)
      .eq('event_type', 'page_view');

    if (analyticsError) {
      console.error('Error fetching analytics:', analyticsError);
      return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
    }

    // Filter out owner views
    const filteredAnalytics = (analytics || []).filter(
      a => a.is_owner_view !== true && a.is_owner_view !== ('true' as unknown as boolean)
    );

    // Calculate portfolio summary
    const totalViews = filteredAnalytics.length;
    const uniqueVisitors = new Set(filteredAnalytics.map(a => a.visitor_hash).filter(Boolean)).size;
    const returnVisitors = filteredAnalytics.filter(a => a.is_return_visitor).length;

    const timesOnPage = filteredAnalytics
      .map(a => a.time_on_page)
      .filter((t): t is number => t !== null && t > 0);
    const avgTimeOnPage = timesOnPage.length > 0
      ? Math.round(timesOnPage.reduce((a, b) => a + b, 0) / timesOnPage.length)
      : 0;

    const scrollDepths = filteredAnalytics
      .map(a => a.scroll_depth)
      .filter((s): s is number => s !== null && s > 0);
    const avgScrollDepth = scrollDepths.length > 0
      ? Math.round(scrollDepths.reduce((a, b) => a + b, 0) / scrollDepths.length)
      : 0;

    // Get high engagement count
    const { data: highEngagement } = await supabase
      .from('page_analytics')
      .select('id')
      .in('page_id', pageIds)
      .eq('event_type', 'high_engagement')
      .neq('is_owner_view', true);

    const highEngagementCount = highEngagement?.length || 0;

    // Calculate engagement score
    const metrics = computeEngagementMetrics({
      totalViews,
      uniqueVisitors,
      returnVisitors,
      avgTimeOnPage,
      avgScrollDepth,
      highEngagementCount,
    });
    const engagementScore = calculateEngagementScore(metrics);

    // Calculate per-page stats
    const pageStats: Record<string, {
      views: number;
      uniqueVisitors: Set<string>;
      returnVisitors: number;
      totalTime: number;
      timeCount: number;
      totalScroll: number;
      scrollCount: number;
      lastViewAt: string | null;
    }> = {};

    for (const pageId of pageIds) {
      pageStats[pageId] = {
        views: 0,
        uniqueVisitors: new Set(),
        returnVisitors: 0,
        totalTime: 0,
        timeCount: 0,
        totalScroll: 0,
        scrollCount: 0,
        lastViewAt: null,
      };
    }

    for (const a of filteredAnalytics) {
      const stats = pageStats[a.page_id];
      if (!stats) continue;

      stats.views++;
      if (a.visitor_hash) stats.uniqueVisitors.add(a.visitor_hash);
      if (a.is_return_visitor) stats.returnVisitors++;
      if (a.time_on_page && a.time_on_page > 0) {
        stats.totalTime += a.time_on_page;
        stats.timeCount++;
      }
      if (a.scroll_depth && a.scroll_depth > 0) {
        stats.totalScroll += a.scroll_depth;
        stats.scrollCount++;
      }
      if (!stats.lastViewAt || a.created_at > stats.lastViewAt) {
        stats.lastViewAt = a.created_at;
      }
    }

    // Build page rankings
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const pageRankings = pages.map(page => {
      const stats = pageStats[page.id];
      const avgTime = stats.timeCount > 0 ? Math.round(stats.totalTime / stats.timeCount) : 0;
      const avgScroll = stats.scrollCount > 0 ? Math.round(stats.totalScroll / stats.scrollCount) : 0;

      const pageMetrics = computeEngagementMetrics({
        totalViews: stats.views,
        uniqueVisitors: stats.uniqueVisitors.size,
        returnVisitors: stats.returnVisitors,
        avgTimeOnPage: avgTime,
        avgScrollDepth: avgScroll,
        highEngagementCount: 0, // Simplified for per-page
      });

      const job = page.job;

      return {
        pageId: page.id,
        pageName: `${job.role_title} @ ${job.company_name}`,
        views: stats.views,
        uniqueVisitors: stats.uniqueVisitors.size,
        avgTimeOnPage: avgTime,
        avgScrollDepth: avgScroll,
        engagementScore: calculateEngagementScore(pageMetrics),
        lastViewAt: stats.lastViewAt,
        isStale: stats.lastViewAt ? new Date(stats.lastViewAt) < sevenDaysAgo : true,
        isPublished: page.is_published,
        applicationStatus: job.application_status,
      };
    }).sort((a, b) => b.views - a.views);

    // Calculate trends (last 14 days)
    const dailyTrends: Record<string, { views: number; uniqueVisitors: Set<string> }> = {};
    const today = new Date();

    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      dailyTrends[dateKey] = { views: 0, uniqueVisitors: new Set() };
    }

    for (const a of filteredAnalytics) {
      const dateKey = a.created_at.split('T')[0];
      if (dailyTrends[dateKey]) {
        dailyTrends[dateKey].views++;
        if (a.visitor_hash) dailyTrends[dateKey].uniqueVisitors.add(a.visitor_hash);
      }
    }

    const daily = Object.entries(dailyTrends).map(([date, data]) => ({
      date,
      views: data.views,
      uniqueVisitors: data.uniqueVisitors.size,
    }));

    // Calculate application breakdown
    const applicationBreakdown = {
      notApplied: 0,
      applied: 0,
      interviewing: 0,
      offerReceived: 0,
      rejected: 0,
    };

    for (const page of pages) {
      const status = page.job.application_status;

      switch (status) {
        case 'not_applied':
          applicationBreakdown.notApplied++;
          break;
        case 'applied':
          applicationBreakdown.applied++;
          break;
        case 'interview_scheduled':
        case 'interviewing':
          applicationBreakdown.interviewing++;
          break;
        case 'offer_received':
        case 'accepted':
          applicationBreakdown.offerReceived++;
          break;
        case 'rejected':
        case 'withdrawn':
          applicationBreakdown.rejected++;
          break;
      }
    }

    return NextResponse.json({
      summary: {
        totalViews,
        uniqueVisitors,
        returnVisitors,
        avgTimeOnPage,
        avgScrollDepth,
        returnVisitorRate: uniqueVisitors > 0 ? returnVisitors / uniqueVisitors : 0,
        engagementScore,
      },
      pageRankings,
      trends: { daily, weekly: [] }, // Weekly can be computed from daily
      applicationBreakdown,
    });
  } catch (error) {
    console.error('Portfolio analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
