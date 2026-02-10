import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import type { Superpower, Availability } from '@/types';
import { SUPERPOWER_ICONS, AVAILABILITY_STATUS_OPTIONS, START_DATE_OPTIONS } from '@/types';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, positioning_statement, headline')
    .eq('username', username)
    .eq('profile_card_enabled', true)
    .single();

  if (!profile) {
    return { title: 'Page Not Found' };
  }

  const description = profile.positioning_statement || profile.headline || '';

  return {
    title: `${profile.full_name} | SignalPage`,
    description,
    openGraph: {
      title: profile.full_name,
      description,
      type: 'profile',
    },
  };
}

export default async function ProfileCardPage({ params }: PageProps) {
  const { username } = await params;
  const supabase = await createClient();

  // Get current user (if logged in)
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  // Get user profile with profile card data
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();

  if (!profile) {
    console.error('Profile not found:', { username, error: profileError });
    notFound();
  }

  // Check if current user is the owner
  const isOwner = currentUser?.id === profile.id;

  // If not owner and card is not enabled, show 404
  if (!isOwner && !profile.profile_card_enabled) {
    notFound();
  }

  const superpowers = (profile.superpowers || []) as Superpower[];
  const availability = (profile.availability || {}) as Partial<Availability>;

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
    <div className="min-h-screen bg-gray-50">
      {/* Preview banner for unpublished cards */}
      {isOwner && !profile.profile_card_enabled && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
          <div className="mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-yellow-800">
              <strong>Preview Mode</strong> - This profile card is not published yet. Only you can see it.
            </p>
            <a
              href="/dashboard/profile-card"
              className="inline-flex items-center gap-2 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 transition-colors"
            >
              Go to Editor to Publish
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 px-6 py-10 text-center text-white shadow-xl sm:px-10 sm:py-14">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.full_name}
              width={120}
              height={120}
              className="mx-auto h-24 w-24 rounded-full border-4 border-white/20 object-cover shadow-lg sm:h-28 sm:w-28"
            />
          ) : (
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/20 bg-white/10 text-3xl font-bold shadow-lg sm:h-28 sm:w-28">
              {profile.full_name
                ?.split(' ')
                .map((n: string) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
          )}
          <h1 className="mt-5 text-3xl font-bold sm:text-4xl">{profile.full_name}</h1>
          {profile.positioning_statement ? (
            <p className="mx-auto mt-3 max-w-lg text-lg text-blue-100">
              {profile.positioning_statement}
            </p>
          ) : profile.headline ? (
            <p className="mx-auto mt-3 max-w-lg text-lg text-blue-100">
              {profile.headline}
            </p>
          ) : null}
        </div>

        {/* Superpowers Section */}
        {superpowers.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
              <span>⚡</span> Superpowers
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {superpowers.map((sp) => (
                <SuperpowerCard key={sp.id} superpower={sp} getIconEmoji={getIconEmoji} />
              ))}
            </div>
          </div>
        )}

        {/* Availability Section */}
        {hasAvailability && (
          <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
              <span>📍</span> Availability
            </h2>
            <div className="space-y-3">
              {availability.status && (
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-block h-3 w-3 rounded-full ${
                      availability.status === 'actively_looking'
                        ? 'bg-green-500'
                        : availability.status === 'open'
                        ? 'bg-blue-500'
                        : 'bg-gray-400'
                    }`}
                  />
                  <span className="text-lg font-medium text-gray-900">
                    {getStatusLabel(availability.status)}
                  </span>
                </div>
              )}
              <div className="grid gap-2 text-gray-600 sm:grid-cols-2">
                {(availability.roles?.length || 0) > 0 && (
                  <p>
                    <span className="font-medium text-gray-700">Open to:</span>{' '}
                    {availability.roles?.join(', ')}
                  </p>
                )}
                {(availability.locations?.length || 0) > 0 && (
                  <p>
                    <span className="font-medium text-gray-700">Locations:</span>{' '}
                    {availability.locations?.join(', ')}
                  </p>
                )}
                {availability.start_date && (
                  <p>
                    <span className="font-medium text-gray-700">Can start:</span>{' '}
                    {getStartDateLabel(availability.start_date)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          {profile.portfolio_url && (
            <a
              href={profile.portfolio_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Portfolio
            </a>
          )}
          {profile.linkedin_url && (
            <a
              href={profile.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
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
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </a>
          )}
          {profile.calendar_link && (
            <a
              href={profile.calendar_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Book a Chat
            </a>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-gray-400">
          <p>
            Built with{' '}
            <Link href="/" className="font-medium text-gray-500 hover:text-gray-700">
              SignalPage
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}

// Superpower Card Component with expandable details
function SuperpowerCard({
  superpower,
  getIconEmoji,
}: {
  superpower: Superpower;
  getIconEmoji: (icon?: string) => string;
}) {
  return (
    <div className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
      <div className="mb-3 text-3xl">{getIconEmoji(superpower.icon)}</div>
      <h3 className="font-semibold text-gray-900">{superpower.title}</h3>
      <p className="mt-1 text-sm text-gray-500">{superpower.one_liner}</p>

      {/* Expandable section - shows on hover/click */}
      {(superpower.pattern || superpower.proof_points.length > 0 || superpower.testimonial) && (
        <details className="mt-4 border-t border-gray-100 pt-4">
          <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-700">
            See more
          </summary>
          <div className="mt-3 space-y-4">
            {superpower.pattern && (
              <div>
                <p className="text-sm text-gray-600">{superpower.pattern}</p>
              </div>
            )}

            {superpower.proof_points.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Proof Points
                </h4>
                {superpower.proof_points.map((pp) => (
                  <div
                    key={pp.id}
                    className="rounded-lg bg-gray-50 p-3"
                  >
                    <p className="font-medium text-gray-900">{pp.title}</p>
                    <p className="text-sm font-semibold text-blue-600">{pp.metric}</p>
                    {pp.details && (
                      <p className="mt-1 text-sm text-gray-500">{pp.details}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {superpower.testimonial && (
              <div className="rounded-lg bg-blue-50 p-4">
                <p className="italic text-gray-700">
                  &ldquo;{superpower.testimonial.quote}&rdquo;
                </p>
                <p className="mt-2 text-sm font-medium text-gray-900">
                  — {superpower.testimonial.author}
                  {superpower.testimonial.author_title && (
                    <span className="font-normal text-gray-500">
                      , {superpower.testimonial.author_title}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
