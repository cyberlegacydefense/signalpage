import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
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

  if (!page) {
    return { title: 'Page Not Found' };
  }

  const hero = page.hero as HeroSectionType;

  return {
    title: `${profile.full_name} - ${page.jobs.role_title} @ ${page.jobs.company_name}`,
    description: hero.value_promise,
    openGraph: {
      title: `${profile.full_name} - ${page.jobs.role_title} @ ${page.jobs.company_name}`,
      description: hero.value_promise,
      type: 'profile',
    },
  };
}

export default async function SignalPage({ params }: PageProps) {
  const { username, slug } = await params;
  const supabase = await createClient();

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();

  if (!profile) {
    notFound();
  }

  // Get the signal page
  const { data: page } = await supabase
    .from('signal_pages')
    .select(`
      *,
      jobs (
        id,
        role_title,
        company_name
      )
    `)
    .eq('user_id', profile.id)
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (!page) {
    notFound();
  }

  // Record page view
  await supabase.from('page_analytics').insert({
    page_id: page.id,
    event_type: 'page_view',
    referrer: null, // Would need to get from headers in middleware
    user_agent: null,
  });

  // Cast the JSONB fields to proper types
  const hero = page.hero as HeroSectionType;
  const fitSection = page.fit_section as FitSectionType;
  const highlights = page.highlights as HighlightSection[];
  const plan306090 = page.plan_30_60_90 as Plan306090;
  const caseStudies = page.case_studies as CaseStudy[];

  return (
    <div className="min-h-screen bg-white">
      <HeroSection
        hero={hero}
        user={{
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          linkedin_url: profile.linkedin_url,
        }}
        job={{
          role_title: page.jobs.role_title,
          company_name: page.jobs.company_name,
        }}
      />

      <FitSection
        fitSection={fitSection}
        companyName={page.jobs.company_name}
      />

      <HighlightsSection highlights={highlights} />

      <Plan306090Section
        plan={plan306090}
        companyName={page.jobs.company_name}
      />

      <CaseStudiesSection caseStudies={caseStudies} />

      {page.ai_commentary && (
        <AICommentarySection commentary={page.ai_commentary} />
      )}

      <CTASection
        user={{
          full_name: profile.full_name,
          email: profile.email,
          linkedin_url: profile.linkedin_url,
          portfolio_url: profile.portfolio_url,
        }}
        companyName={page.jobs.company_name}
        roleTitle={page.jobs.role_title}
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
