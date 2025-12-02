'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';
import type {
  SignalPage,
  HeroSection,
  FitSection,
  HighlightSection,
  Plan306090,
  CaseStudy,
} from '@/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface PageData extends SignalPage {
  jobs: {
    company_name: string;
    role_title: string;
  };
}

export default function PageEditorPage({ params }: PageProps) {
  const { id: pageId } = use(params);
  const router = useRouter();
  const [page, setPage] = useState<PageData | null>(null);
  const [username, setUsername] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    async function loadPage() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUsername(profile.username);
      }

      const { data, error } = await supabase
        .from('signal_pages')
        .select(`
          *,
          jobs (
            company_name,
            role_title
          )
        `)
        .eq('id', pageId)
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        router.push('/dashboard');
        return;
      }

      setPage(data as PageData);
      setIsLoading(false);
    }

    loadPage();
  }, [pageId, router]);

  const handlePublish = async () => {
    if (!page) return;

    setIsPublishing(true);

    const supabase = createClient();
    const { error } = await supabase
      .from('signal_pages')
      .update({ is_published: !page.is_published })
      .eq('id', pageId);

    if (!error) {
      setPage((prev) => prev ? { ...prev, is_published: !prev.is_published } : null);

      // Also update job status
      await supabase
        .from('jobs')
        .update({ status: page.is_published ? 'draft' : 'published' })
        .eq('id', page.job_id);
    }

    setIsPublishing(false);
  };

  if (isLoading || !page) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const hero = page.hero as HeroSection;
  const fitSection = page.fit_section as FitSection;
  const highlights = page.highlights as HighlightSection[];
  const plan306090 = page.plan_30_60_90 as Plan306090;
  const caseStudies = page.case_studies as CaseStudy[];
  const pageUrl = `/${username}/${page.slug}`;

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {page.jobs.role_title} @ {page.jobs.company_name}
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-gray-600">
            {page.is_published ? (
              <>
                <Badge variant="success">Published</Badge>
                <a
                  href={pageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {process.env.NEXT_PUBLIC_APP_URL}{pageUrl}
                </a>
              </>
            ) : (
              <Badge variant="default">Draft</Badge>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          {page.is_published && (
            <Link href={pageUrl} target="_blank">
              <Button variant="outline">View Page</Button>
            </Link>
          )}
          <Button
            variant={page.is_published ? 'outline' : 'primary'}
            onClick={handlePublish}
            isLoading={isPublishing}
          >
            {page.is_published ? 'Unpublish' : 'Publish'}
          </Button>
        </div>
      </div>

      {/* Preview Sections */}
      <div className="space-y-6">
        {/* Hero */}
        <Card>
          <CardHeader>
            <CardTitle>Hero Section</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-gray-900 p-6 text-white">
              <h2 className="mb-2 text-2xl font-bold">{hero.tagline}</h2>
              <p className="text-gray-300">{hero.value_promise}</p>
            </div>
          </CardContent>
        </Card>

        {/* Fit Section */}
        <Card>
          <CardHeader>
            <CardTitle>Why I&apos;m a Fit ({fitSection.fit_bullets?.length || 0} points)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {fitSection.fit_bullets?.map((bullet, i) => (
                <li key={i} className="rounded-lg bg-gray-50 p-3">
                  <p className="text-sm text-gray-500">{bullet.requirement}</p>
                  <p className="mt-1 text-gray-900">{bullet.evidence}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Highlights */}
        <Card>
          <CardHeader>
            <CardTitle>Career Highlights ({highlights?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {highlights?.map((highlight, i) => (
                <div key={i} className="rounded-lg border border-gray-200 p-4">
                  <div className="mb-2 font-medium">{highlight.role} at {highlight.company}</div>
                  <p className="text-sm text-gray-600">{highlight.impact}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 30/60/90 */}
        <Card>
          <CardHeader>
            <CardTitle>30/60/90 Day Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg bg-blue-50 p-4">
                <div className="mb-2 text-sm font-medium text-blue-700">Days 1-30</div>
                <p className="text-sm">{plan306090.day_30?.title}</p>
              </div>
              <div className="rounded-lg bg-purple-50 p-4">
                <div className="mb-2 text-sm font-medium text-purple-700">Days 31-60</div>
                <p className="text-sm">{plan306090.day_60?.title}</p>
              </div>
              <div className="rounded-lg bg-green-50 p-4">
                <div className="mb-2 text-sm font-medium text-green-700">Days 61-90</div>
                <p className="text-sm">{plan306090.day_90?.title}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Case Studies */}
        <Card>
          <CardHeader>
            <CardTitle>Case Studies ({caseStudies?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {caseStudies?.map((study, i) => (
                <div key={i} className="rounded-lg border border-gray-200 p-4">
                  <div className="mb-1 text-sm text-blue-600">{study.relevance}</div>
                  <div className="font-medium">{study.title}</div>
                  <p className="mt-1 text-sm text-gray-600">{study.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AI Commentary */}
        {page.ai_commentary && (
          <Card>
            <CardHeader>
              <CardTitle>AI Coach Commentary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
                <p className="whitespace-pre-wrap text-gray-700">{page.ai_commentary}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Analytics Placeholder */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Page Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            {page.is_published
              ? 'Analytics will appear here once your page receives views.'
              : 'Publish your page to start tracking analytics.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
