'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { StatCard, TrendChart, EngagementScore, PageRankingsTable } from '@/components/analytics';
import { formatTimeOnPage } from '@/lib/analytics/format-time';
import type { ApplicationStatus } from '@/types';

interface PortfolioAnalytics {
  summary: {
    totalViews: number;
    uniqueVisitors: number;
    returnVisitors: number;
    avgTimeOnPage: number;
    avgScrollDepth: number;
    returnVisitorRate: number;
    engagementScore: number;
  };
  pageRankings: Array<{
    pageId: string;
    pageName: string;
    views: number;
    uniqueVisitors: number;
    avgTimeOnPage: number;
    avgScrollDepth: number;
    engagementScore: number;
    lastViewAt: string | null;
    isStale: boolean;
    isPublished: boolean;
    applicationStatus: ApplicationStatus;
  }>;
  trends: {
    daily: Array<{ date: string; views: number; uniqueVisitors: number }>;
  };
  applicationBreakdown: {
    notApplied: number;
    applied: number;
    interviewing: number;
    offerReceived: number;
    rejected: number;
  };
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<PortfolioAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const response = await fetch('/api/analytics/portfolio');
        if (!response.ok) {
          throw new Error('Failed to fetch analytics');
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setIsLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        {error}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { summary, pageRankings, trends, applicationBreakdown } = data;
  const totalApplications = applicationBreakdown.notApplied + applicationBreakdown.applied +
    applicationBreakdown.interviewing + applicationBreakdown.offerReceived + applicationBreakdown.rejected;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Track engagement across all your Signal Pages
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Views"
          value={summary.totalViews}
          subtitle={`${summary.uniqueVisitors} unique visitors`}
          color="blue"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          }
        />
        <StatCard
          title="Avg. Time on Page"
          value={formatTimeOnPage(summary.avgTimeOnPage)}
          subtitle={`${summary.avgScrollDepth}% avg scroll depth`}
          color="purple"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="Return Visitor Rate"
          value={`${Math.round(summary.returnVisitorRate * 100)}%`}
          subtitle={`${summary.returnVisitors} return visitors`}
          color="green"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          }
        />
        <StatCard
          title="Engagement Score"
          value={summary.engagementScore}
          subtitle="Portfolio average"
          color="orange"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
      </div>

      {/* Engagement Score Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Engagement</span>
          </div>
          <EngagementScore score={summary.engagementScore} size="lg" />
        </CardContent>
      </Card>

      {/* Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Views Over Time (Last 14 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart data={trends.daily} height={200} />
        </CardContent>
      </Card>

      {/* Page Rankings */}
      <Card>
        <CardHeader>
          <CardTitle>Page Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <PageRankingsTable pages={pageRankings} />
        </CardContent>
      </Card>

      {/* Application Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Application Status</CardTitle>
        </CardHeader>
        <CardContent>
          {totalApplications > 0 ? (
            <div className="space-y-4">
              {/* Horizontal bar */}
              <div className="flex h-4 rounded-full overflow-hidden bg-gray-100">
                {applicationBreakdown.applied > 0 && (
                  <div
                    className="bg-blue-500"
                    style={{ width: `${(applicationBreakdown.applied / totalApplications) * 100}%` }}
                    title={`Applied: ${applicationBreakdown.applied}`}
                  />
                )}
                {applicationBreakdown.interviewing > 0 && (
                  <div
                    className="bg-purple-500"
                    style={{ width: `${(applicationBreakdown.interviewing / totalApplications) * 100}%` }}
                    title={`Interviewing: ${applicationBreakdown.interviewing}`}
                  />
                )}
                {applicationBreakdown.offerReceived > 0 && (
                  <div
                    className="bg-green-500"
                    style={{ width: `${(applicationBreakdown.offerReceived / totalApplications) * 100}%` }}
                    title={`Offer: ${applicationBreakdown.offerReceived}`}
                  />
                )}
                {applicationBreakdown.rejected > 0 && (
                  <div
                    className="bg-red-400"
                    style={{ width: `${(applicationBreakdown.rejected / totalApplications) * 100}%` }}
                    title={`Rejected: ${applicationBreakdown.rejected}`}
                  />
                )}
                {applicationBreakdown.notApplied > 0 && (
                  <div
                    className="bg-gray-300"
                    style={{ width: `${(applicationBreakdown.notApplied / totalApplications) * 100}%` }}
                    title={`Not Applied: ${applicationBreakdown.notApplied}`}
                  />
                )}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 text-sm">
                {applicationBreakdown.applied > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span>Applied ({applicationBreakdown.applied})</span>
                  </div>
                )}
                {applicationBreakdown.interviewing > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-purple-500" />
                    <span>Interviewing ({applicationBreakdown.interviewing})</span>
                  </div>
                )}
                {applicationBreakdown.offerReceived > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span>Offer ({applicationBreakdown.offerReceived})</span>
                  </div>
                )}
                {applicationBreakdown.rejected > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <span>Rejected ({applicationBreakdown.rejected})</span>
                  </div>
                )}
                {applicationBreakdown.notApplied > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-gray-300" />
                    <span>Not Applied ({applicationBreakdown.notApplied})</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No applications yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
