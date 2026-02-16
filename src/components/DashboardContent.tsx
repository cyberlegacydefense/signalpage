'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Button, Card, CardContent, Badge } from '@/components/ui';
import { ApplicationStatusBadge } from '@/components/ApplicationTracker';
import { formatDistanceToNow } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import type { ApplicationStatus, InterviewRound, GenerationStatus } from '@/types';

interface SignalPage {
  id: string;
  slug: string;
  is_published: boolean;
  generated_at: string;
  match_score: number | null;
  view_count: number;
  generation_status: GenerationStatus | null;
  generation_error: string | null;
}

interface Job {
  id: string;
  role_title: string;
  company_name: string;
  status: string;
  application_status: ApplicationStatus;
  interview_rounds: InterviewRound[];
  created_at: string;
  signal_pages: SignalPage[];
}

interface DashboardContentProps {
  jobs: Job[];
  username: string | null;
}

type ViewMode = 'tile' | 'table';

export function DashboardContent({ jobs: initialJobs, username }: DashboardContentProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('tile');
  const [jobs, setJobs] = useState(initialJobs);
  const generationTriggeredRef = useRef<Set<string>>(new Set());

  // Trigger generation for pages in 'generating' status
  const triggerGeneration = useCallback(async (pageId: string, jobId: string) => {
    // Prevent duplicate triggers
    if (generationTriggeredRef.current.has(pageId)) return;
    generationTriggeredRef.current.add(pageId);

    try {
      const response = await fetch('/api/generate-page/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId, jobId }),
      });

      if (!response.ok) {
        console.error(`Generation failed for page ${pageId}`);
      }
    } catch (error) {
      console.error(`Error triggering generation for page ${pageId}:`, error);
    }
  }, []);

  // Trigger generation for pages in 'generating' status on initial load
  useEffect(() => {
    const generatingPages = initialJobs.flatMap(job =>
      job.signal_pages
        .filter(p => p.generation_status === 'generating')
        .map(p => ({ pageId: p.id, jobId: job.id }))
    );

    // Trigger generation for each page
    generatingPages.forEach(({ pageId, jobId }) => {
      triggerGeneration(pageId, jobId);
    });
  }, [initialJobs, triggerGeneration]);

  // Subscribe to real-time updates
  useEffect(() => {
    const supabase = createClient();

    // Subscribe to signal_pages changes
    const pageIds = initialJobs.flatMap(job => job.signal_pages.map(p => p.id));
    if (pageIds.length === 0) return;

    const channel = supabase
      .channel('dashboard-pages')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'signal_pages',
          filter: `id=in.(${pageIds.join(',')})`,
        },
        (payload) => {
          const updated = payload.new as {
            id: string;
            generation_status: GenerationStatus;
            generation_error: string | null;
            match_score: number | null;
            is_published: boolean;
          };

          setJobs(prevJobs =>
            prevJobs.map(job => ({
              ...job,
              signal_pages: job.signal_pages.map(page =>
                page.id === updated.id
                  ? {
                      ...page,
                      generation_status: updated.generation_status,
                      generation_error: updated.generation_error,
                      match_score: updated.match_score,
                      is_published: updated.is_published,
                    }
                  : page
              ),
            }))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [initialJobs]);

  // Polling fallback for generating pages (real-time may not always work)
  useEffect(() => {
    const generatingPages = jobs.flatMap(job =>
      job.signal_pages
        .filter(p => p.generation_status === 'generating')
        .map(p => ({ pageId: p.id, jobId: job.id }))
    );

    if (generatingPages.length === 0) return;

    const supabase = createClient();

    const pollStatus = async () => {
      const pageIds = generatingPages.map(p => p.pageId);

      const { data: pages } = await supabase
        .from('signal_pages')
        .select('id, generation_status, generation_error, match_score, is_published')
        .in('id', pageIds);

      if (pages) {
        setJobs(prevJobs =>
          prevJobs.map(job => ({
            ...job,
            signal_pages: job.signal_pages.map(page => {
              const updated = pages.find(p => p.id === page.id);
              if (updated && updated.generation_status !== page.generation_status) {
                return {
                  ...page,
                  generation_status: updated.generation_status,
                  generation_error: updated.generation_error,
                  match_score: updated.match_score,
                  is_published: updated.is_published,
                };
              }
              return page;
            }),
          }))
        );
      }
    };

    // Poll every 3 seconds while there are generating pages
    const interval = setInterval(pollStatus, 3000);

    return () => clearInterval(interval);
  }, [jobs]);

  // Load saved view preference
  useEffect(() => {
    const saved = localStorage.getItem('dashboardViewMode') as ViewMode | null;
    if (saved === 'tile' || saved === 'table') {
      setViewMode(saved);
    }
  }, []);

  // Save view preference
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('dashboardViewMode', mode);
  };

  const getStatusBadge = (status: string, generationStatus?: GenerationStatus | null, isPublished?: boolean) => {
    // If page is generating, show generating badge
    if (generationStatus === 'generating') {
      return (
        <Badge variant="warning" className="flex items-center gap-1">
          <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Generating
        </Badge>
      );
    }

    // If page generation failed, show error badge
    if (generationStatus === 'failed') {
      return <Badge variant="danger">Failed</Badge>;
    }

    // If page generation is ready, show based on publish status
    if (generationStatus === 'ready') {
      return isPublished
        ? <Badge variant="success">Published</Badge>
        : <Badge variant="default">Draft</Badge>;
    }

    // Fallback to job status (for pages without generation_status)
    switch (status) {
      case 'published':
        return <Badge variant="success">Published</Badge>;
      case 'generating':
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Generating
          </Badge>
        );
      case 'draft':
        return <Badge variant="default">Draft</Badge>;
      case 'archived':
        return <Badge variant="outline">Archived</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getMatchScoreBadge = (matchScore: number | null | undefined) => {
    if (matchScore === undefined || matchScore === null) return null;

    return (
      <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        matchScore >= 80 ? 'bg-green-100 text-green-700' :
        matchScore >= 60 ? 'bg-blue-100 text-blue-700' :
        matchScore >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
      }`}>
        <span>{matchScore}%</span>
        <span>match</span>
      </div>
    );
  };

  if (!jobs || jobs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <svg
              className="h-6 w-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">
            No pages yet
          </h3>
          <p className="mb-6 text-sm text-gray-600">
            Create your first role-specific landing page to stand out from
            generic applicants.
          </p>
          <Link href="/dashboard/new">
            <Button variant="primary">Create Your First Page</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* View Toggle */}
      <div className="mb-4 flex justify-end">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
          <button
            onClick={() => handleViewModeChange('tile')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === 'tile'
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Tiles
          </button>
          <button
            onClick={() => handleViewModeChange('table')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === 'table'
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Table
          </button>
        </div>
      </div>

      {/* Tile View */}
      {viewMode === 'tile' && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => {
            const page = job.signal_pages?.[0];
            const pageUrl = page && username
              ? `/${username}/${page.slug}`
              : null;
            const isGenerating = page?.generation_status === 'generating';
            const isFailed = page?.generation_status === 'failed';
            const isReady = page?.generation_status === 'ready' || (!page?.generation_status && page);

            return (
              <Card key={job.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {job.role_title}
                      </h3>
                      <p className="text-sm text-gray-600">{job.company_name}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {getStatusBadge(job.status, page?.generation_status, page?.is_published)}
                      {isReady && getMatchScoreBadge(page?.match_score)}
                      {isReady && page && (
                        <div className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 whitespace-nowrap">
                          <svg className="h-3 w-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span>{page.view_count} views</span>
                        </div>
                      )}
                      <ApplicationStatusBadge status={job.application_status} />
                    </div>
                  </div>

                  <div className="mb-4 text-xs text-gray-500">
                    Created {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                  </div>

                  {/* Show error message for failed generation */}
                  {isFailed && page?.generation_error && (
                    <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
                      {page.generation_error}
                    </div>
                  )}

                  <div className="flex gap-2">
                    {isGenerating ? (
                      <div className="flex-1 text-center py-2 text-sm text-gray-500">
                        <div className="flex items-center justify-center gap-2">
                          <svg className="h-4 w-4 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Generating your page...
                        </div>
                      </div>
                    ) : isFailed ? (
                      <Link href={`/dashboard/jobs/${job.id}/generate`} className="flex-1">
                        <Button variant="primary" className="w-full" size="sm">
                          Retry Generation
                        </Button>
                      </Link>
                    ) : page && isReady ? (
                      <>
                        <Link href={`/dashboard/pages/${page.id}`} className="flex-1">
                          <Button variant="outline" className="w-full" size="sm">
                            Edit
                          </Button>
                        </Link>
                        {pageUrl && (
                          <Link href={pageUrl} target="_blank" className="flex-1">
                            <Button variant="primary" className="w-full" size="sm">
                              View
                            </Button>
                          </Link>
                        )}
                      </>
                    ) : (
                      <Link href={`/dashboard/jobs/${job.id}/generate`} className="flex-1">
                        <Button variant="primary" className="w-full" size="sm">
                          Generate Page
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Company
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Application
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Match
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Views
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Created
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {jobs.map((job) => {
                const page = job.signal_pages?.[0];
                const pageUrl = page && username
                  ? `/${username}/${page.slug}`
                  : null;
                const isGenerating = page?.generation_status === 'generating';
                const isFailed = page?.generation_status === 'failed';
                const isReady = page?.generation_status === 'ready' || (!page?.generation_status && page);

                return (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="font-medium text-gray-900">{job.role_title}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      {job.company_name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {getStatusBadge(job.status, page?.generation_status, page?.is_published)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <ApplicationStatusBadge status={job.application_status} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {isGenerating ? (
                        <span className="text-gray-400">—</span>
                      ) : page?.match_score !== undefined && page?.match_score !== null ? (
                        <span className={`font-medium ${
                          page.match_score >= 80 ? 'text-green-600' :
                          page.match_score >= 60 ? 'text-blue-600' :
                          page.match_score >= 40 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {page.match_score}%
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {isReady && page ? page.view_count : '—'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {isGenerating ? (
                          <span className="flex items-center gap-1 text-sm text-gray-500">
                            <svg className="h-4 w-4 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Generating...
                          </span>
                        ) : isFailed ? (
                          <Link href={`/dashboard/jobs/${job.id}/generate`}>
                            <Button variant="primary" size="sm">
                              Retry
                            </Button>
                          </Link>
                        ) : page && isReady ? (
                          <>
                            <Link href={`/dashboard/pages/${page.id}`}>
                              <Button variant="outline" size="sm">
                                Edit
                              </Button>
                            </Link>
                            {pageUrl && (
                              <Link href={pageUrl} target="_blank">
                                <Button variant="primary" size="sm">
                                  View
                                </Button>
                              </Link>
                            )}
                          </>
                        ) : (
                          <Link href={`/dashboard/jobs/${job.id}/generate`}>
                            <Button variant="primary" size="sm">
                              Generate
                            </Button>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
