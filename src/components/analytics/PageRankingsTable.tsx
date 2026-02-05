'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatTimeOnPage } from '@/lib/analytics/format-time';
import { EngagementScoreBadge } from './EngagementScore';
import { ApplicationStatusBadge } from '@/components/ApplicationTracker';
import type { ApplicationStatus } from '@/types';

interface PageRanking {
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
}

interface PageRankingsTableProps {
  pages: PageRanking[];
}

type SortKey = 'views' | 'avgTimeOnPage' | 'avgScrollDepth' | 'engagementScore';

export function PageRankingsTable({ pages }: PageRankingsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('views');
  const [sortDesc, setSortDesc] = useState(true);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDesc(!sortDesc);
    } else {
      setSortKey(key);
      setSortDesc(true);
    }
  };

  const sortedPages = [...pages].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    return sortDesc ? bVal - aVal : aVal - bVal;
  });

  const SortHeader = ({
    label,
    sortKeyName,
  }: {
    label: string;
    sortKeyName: SortKey;
  }) => (
    <button
      onClick={() => handleSort(sortKeyName)}
      className={`flex items-center gap-1 text-xs font-medium uppercase tracking-wider ${
        sortKey === sortKeyName ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {label}
      {sortKey === sortKeyName && (
        <svg
          className={`w-3 h-3 transition-transform ${sortDesc ? '' : 'rotate-180'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      )}
    </button>
  );

  if (pages.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No pages to display
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Page
            </th>
            <th className="px-4 py-3 text-left">
              <SortHeader label="Views" sortKeyName="views" />
            </th>
            <th className="px-4 py-3 text-left">
              <SortHeader label="Avg Time" sortKeyName="avgTimeOnPage" />
            </th>
            <th className="px-4 py-3 text-left">
              <SortHeader label="Scroll" sortKeyName="avgScrollDepth" />
            </th>
            <th className="px-4 py-3 text-left">
              <SortHeader label="Score" sortKeyName="engagementScore" />
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sortedPages.map((page) => (
            <tr key={page.pageId} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/pages/${page.pageId}`}
                    className="font-medium text-gray-900 hover:text-blue-600"
                  >
                    {page.pageName}
                  </Link>
                  {page.isStale && (
                    <span
                      className="w-2 h-2 rounded-full bg-orange-400"
                      title="No views in 7+ days"
                    />
                  )}
                  {!page.isPublished && (
                    <span className="text-xs text-gray-400">(Draft)</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="font-medium text-gray-900">{page.views}</span>
                <span className="text-xs text-gray-500 ml-1">
                  ({page.uniqueVisitors} unique)
                </span>
              </td>
              <td className="px-4 py-3 text-gray-600">
                {page.avgTimeOnPage > 0 ? formatTimeOnPage(page.avgTimeOnPage) : '-'}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {page.avgScrollDepth > 0 ? `${page.avgScrollDepth}%` : '-'}
              </td>
              <td className="px-4 py-3">
                <EngagementScoreBadge score={page.engagementScore} />
              </td>
              <td className="px-4 py-3">
                <ApplicationStatusBadge status={page.applicationStatus} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
