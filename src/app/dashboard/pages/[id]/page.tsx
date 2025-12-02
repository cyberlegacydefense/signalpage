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
  const [copied, setCopied] = useState(false);

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

  const copyToClipboard = async () => {
    const fullUrl = `${window.location.origin}/${username}/${page?.slug}`;
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      {/* Status Banner */}
      {!page.is_published && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-start gap-3">
            <svg className="mt-0.5 h-5 w-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <h3 className="font-medium text-yellow-800">Ready to Publish</h3>
              <p className="mt-1 text-sm text-yellow-700">
                Your page is complete and ready to share. Click &quot;Publish&quot; to make it publicly accessible, then copy the URL to include in your applications.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {page.jobs.role_title} @ {page.jobs.company_name}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={page.is_published ? 'success' : 'warning'}>
              {page.is_published ? 'Published' : 'Ready to Publish'}
            </Badge>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href={pageUrl} target="_blank">
            <Button variant="outline">Preview</Button>
          </Link>
          <Button
            variant={page.is_published ? 'outline' : 'primary'}
            onClick={handlePublish}
            isLoading={isPublishing}
          >
            {page.is_published ? 'Unpublish' : 'Publish'}
          </Button>
        </div>
      </div>

      {/* URL Card - Always visible */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">Page URL</p>
              <p className="mt-1 text-sm text-gray-600 break-all">
                {typeof window !== 'undefined' ? window.location.origin : ''}{pageUrl}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
              >
                {copied ? (
                  <>
                    <svg className="mr-1.5 h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    Copy URL
                  </>
                )}
              </Button>
              <Link href={pageUrl} target="_blank">
                <Button variant="outline" size="sm">
                  <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open
                </Button>
              </Link>
            </div>
          </div>
          {!page.is_published && (
            <p className="mt-2 text-xs text-gray-500">
              This URL will only be accessible to others after you publish the page.
            </p>
          )}
        </CardContent>
      </Card>

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
