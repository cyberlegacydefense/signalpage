'use client';

import Image from 'next/image';
import type { Superpower, Availability } from '@/types';
import { SUPERPOWER_ICONS, AVAILABILITY_STATUS_OPTIONS, START_DATE_OPTIONS } from '@/types';

interface ProfileCardPreviewProps {
  positioningStatement: string;
  superpowers: Superpower[];
  availability: Partial<Availability>;
  profile: {
    full_name: string;
    email?: string;
    headline?: string;
    avatar_url?: string;
    linkedin_url?: string;
    portfolio_url?: string;
    github_url?: string;
    calendar_link?: string;
  };
}

export function ProfileCardPreview({
  positioningStatement,
  superpowers,
  availability,
  profile,
}: ProfileCardPreviewProps) {
  const getIconEmoji = (iconValue?: string) => {
    return SUPERPOWER_ICONS.find((i) => i.value === iconValue)?.emoji || '🚀';
  };

  const getStatusLabel = (status?: string) => {
    return AVAILABILITY_STATUS_OPTIONS.find((o) => o.value === status)?.label || status;
  };

  const getStartDateLabel = (startDate?: string) => {
    return START_DATE_OPTIONS.find((o) => o.value === startDate)?.label || startDate;
  };

  const hasAvailability =
    availability.status ||
    (availability.roles?.length || 0) > 0 ||
    (availability.locations?.length || 0) > 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-6 py-8 text-center text-white">
        {profile.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt={profile.full_name}
            width={80}
            height={80}
            className="mx-auto h-20 w-20 rounded-full border-4 border-white/20 object-cover"
          />
        ) : (
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/20 bg-white/10 text-2xl font-bold">
            {profile.full_name
              ?.split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
        )}
        <h1 className="mt-4 text-2xl font-bold">{profile.full_name}</h1>
        {positioningStatement ? (
          <p className="mt-2 text-blue-100">{positioningStatement}</p>
        ) : profile.headline ? (
          <p className="mt-2 text-blue-100">{profile.headline}</p>
        ) : null}
      </div>

      {/* Superpowers */}
      {superpowers.length > 0 && (
        <div className="border-b border-gray-100 px-6 py-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
            <span>⚡</span> Superpowers
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {superpowers.map((sp) => (
              <div
                key={sp.id}
                className="group relative rounded-lg border border-gray-200 p-4 transition-all hover:border-blue-300 hover:shadow-sm"
              >
                <div className="mb-2 text-2xl">{getIconEmoji(sp.icon)}</div>
                <h3 className="font-medium text-gray-900">{sp.title || 'Superpower'}</h3>
                <p className="mt-1 text-sm text-gray-500">{sp.one_liner || 'Add a one-liner'}</p>
                <div className="absolute bottom-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                    Click to expand
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Availability */}
      {hasAvailability && (
        <div className="border-b border-gray-100 px-6 py-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
            <span>📍</span> Availability
          </h2>
          <div className="space-y-2 text-sm">
            {availability.status && (
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    availability.status === 'actively_looking'
                      ? 'bg-green-500'
                      : availability.status === 'open'
                      ? 'bg-blue-500'
                      : 'bg-gray-400'
                  }`}
                />
                <span className="font-medium text-gray-900">
                  {getStatusLabel(availability.status)}
                </span>
              </div>
            )}
            {(availability.roles?.length || 0) > 0 && (
              <p className="text-gray-600">
                <span className="font-medium">Looking for:</span>{' '}
                {availability.roles?.join(', ')}
              </p>
            )}
            {(availability.locations?.length || 0) > 0 && (
              <p className="text-gray-600">
                <span className="font-medium">Locations:</span>{' '}
                {availability.locations?.join(', ')}
              </p>
            )}
            {availability.start_date && (
              <p className="text-gray-600">
                <span className="font-medium">Can start:</span>{' '}
                {getStartDateLabel(availability.start_date)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3 px-6 py-6">
        {profile.linkedin_url && (
          <a
            href={profile.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
            </svg>
            LinkedIn
          </a>
        )}
        {profile.github_url && (
          <a
            href={profile.github_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub
          </a>
        )}
        {profile.portfolio_url && (
          <a
            href={profile.portfolio_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Portfolio
          </a>
        )}
        {profile.calendar_link && (
          <a
            href={profile.calendar_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Book a Chat
          </a>
        )}
        {profile.email && (
          <a
            href={`mailto:${profile.email}`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Email
          </a>
        )}
      </div>
    </div>
  );
}
