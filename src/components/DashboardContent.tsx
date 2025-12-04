'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button, Card, CardContent, Badge } from '@/components/ui';
import { formatDistanceToNow } from 'date-fns';

interface SignalPage {
  id: string;
  slug: string;
  is_published: boolean;
  generated_at: string;
  match_score: number | null;
  view_count: number;
}

interface Job {
  id: string;
  role_title: string;
  company_name: string;
  status: string;
  created_at: string;
  signal_pages: SignalPage[];
}

interface DashboardContentProps {
  jobs: Job[];
  username: string | null;
}

type ViewMode = 'tile' | 'table';

export function DashboardContent({ jobs, username }: DashboardContentProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('tile');

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge variant="success">Published</Badge>;
      case 'generating':
        return <Badge variant="warning">Generating</Badge>;
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
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(job.status)}
                      <div className="flex items-center gap-2">
                        {getMatchScoreBadge(page?.match_score)}
                        {page && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span>{page.view_count}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 text-xs text-gray-500">
                    Created {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                  </div>

                  <div className="flex gap-2">
                    {page ? (
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

                return (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="font-medium text-gray-900">{job.role_title}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      {job.company_name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {getStatusBadge(job.status)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {page?.match_score !== undefined && page?.match_score !== null ? (
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
                      {page ? page.view_count : '—'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {page ? (
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
