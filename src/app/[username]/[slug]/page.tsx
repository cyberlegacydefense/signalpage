import { notFound } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import {
  HeroSection,
  FitSection,
  HighlightsSection,
  Plan306090Section,
  CaseStudiesSection,
  AICommentarySection,
  CTASection,
} from '@/components/landing';
import type { Metadata } from 'next';
import type {
  HeroSection as HeroSectionType,
  FitSection as FitSectionType,
  HighlightSection,
  Plan306090,
  CaseStudy,
} from '@/types';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ username: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username, slug } = await params;
  const supabase = await createClient();

  // Get page data
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('username', username)
    .single();

  if (!profile) {
    return { title: 'Page Not Found' };
  }

  const { data: page } = await supabase
    .from('signal_pages')
    .select(`
      *,
      jobs (
        role_title,
        company_name
      )
    `)
    .eq('user_id', profile.id)
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (!page || !page.jobs) {
    return { title: 'Page Not Found' };
  }

  const hero = (page.hero || { tagline: '', value_promise: '' }) as HeroSectionType;
  const roleTitle = page.jobs.role_title || 'Role';
  const companyName = page.jobs.company_name || 'Company';

  return {
    title: `${profile.full_name} - ${roleTitle} @ ${companyName}`,
    description: hero.value_promise || '',
    openGraph: {
      title: `${profile.full_name} - ${roleTitle} @ ${companyName}`,
      description: hero.value_promise || '',
      type: 'profile',
    },
  };
}

export default async function SignalPage({ params }: PageProps) {
  const { username, slug } = await params;
  const supabase = await createClient();

  // Get current user (if logged in)
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  // Get user profile
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

  // Get the signal page - owners can see unpublished, others only published
  const query = supabase
    .from('signal_pages')
    .select(`
      *,
      jobs (
        id,
        role_title,
        company_name,
        recruiter_name,
        hiring_manager_name
      )
    `)
    .eq('user_id', profile.id)
    .eq('slug', slug);

  // Only filter by is_published if not the owner
  if (!isOwner) {
    query.eq('is_published', true);
  }

  const { data: page, error: pageError } = await query.single();

  if (!page || !page.jobs) {
    console.error('Page not found:', {
      username,
      slug,
      profileId: profile.id,
      isOwner,
      page,
      error: pageError
    });
    notFound();
  }

  // Extract job info with defaults
  const jobInfo = {
    role_title: page.jobs.role_title || 'Role',
    company_name: page.jobs.company_name || 'Company',
  };

  // Record page view using service client (bypasses RLS for analytics)
  // Fire and forget - don't await to avoid blocking page render
  try {
    const serviceClient = createServiceClient();
    serviceClient.from('page_analytics').insert({
      page_id: page.id,
      event_type: 'page_view',
      referrer: null,
      user_agent: null,
    }).then(({ error }) => {
      if (error) {
        console.error('Failed to record page view:', error);
      }
    });
  } catch (err) {
    console.error('Failed to create service client for analytics:', err);
  }

  // Cast the JSONB fields to proper types with defaults
  const hero = (page.hero || { tagline: '', value_promise: '' }) as HeroSectionType;
  const fitSection = (page.fit_section || { fit_bullets: [] }) as FitSectionType;
  const highlights = (page.highlights || []) as HighlightSection[];
  const plan306090 = (page.plan_30_60_90 || { day_30: {}, day_60: {}, day_90: {} }) as Plan306090;
  const caseStudies = (page.case_studies || []) as CaseStudy[];

  return (
    <div className="min-h-screen bg-white">
      {/* Preview banner for unpublished pages */}
      {isOwner && !page.is_published && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
          <div className="mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-yellow-800">
              <strong>Preview Mode</strong> - This page is not published yet. Only you can see it.
            </p>
            <a
              href={`/dashboard/pages/${page.id}`}
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

      <HeroSection
        hero={hero}
        user={{
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          linkedin_url: profile.linkedin_url,
        }}
        job={jobInfo}
      />

      <FitSection
        fitSection={fitSection}
        companyName={jobInfo.company_name}
      />

      <HighlightsSection highlights={highlights} />

      <Plan306090Section
        plan={plan306090}
        companyName={jobInfo.company_name}
      />

      <CaseStudiesSection caseStudies={caseStudies} />

      {page.ai_commentary && page.show_ai_commentary !== false && (
        <AICommentarySection
          commentary={page.ai_commentary}
          recruiterName={page.jobs.recruiter_name}
          hiringManagerName={page.jobs.hiring_manager_name}
        />
      )}

      <CTASection
        user={{
          full_name: profile.full_name,
          email: profile.email,
          linkedin_url: profile.linkedin_url,
          portfolio_url: profile.portfolio_url,
        }}
        companyName={jobInfo.company_name}
        roleTitle={jobInfo.role_title}
      />

      {/* Footer */}
      <footer className="bg-gray-100 px-4 py-6 text-center text-sm text-gray-500">
        <p>
          Built with{' '}
          <a
            href="/"
            className="font-medium text-gray-700 hover:text-gray-900"
          >
            SignalPage
          </a>
          {' '}- Create role-specific landing pages that prove you did your homework
        </p>
      </footer>
    </div>
  );
}
