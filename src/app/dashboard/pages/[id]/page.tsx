'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow, formatDistance } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';
import { InterviewPrep } from '@/components/InterviewPrep';
import { EmailGenerator } from '@/components/EmailGenerator';
import { hasCoachAccess, hasProAccess } from '@/lib/stripe';
import type {
  SignalPage,
  HeroSection,
  FitSection,
  HighlightSection,
  Plan306090,
  CaseStudy,
  MatchBreakdown,
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
  const [showAICommentary, setShowAICommentary] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isRecalculatingScore, setIsRecalculatingScore] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [analytics, setAnalytics] = useState<{
    views: number;
    firstViewAt: string | null;
    lastViewAt: string | null;
    publishedAt: string | null;
  } | null>(null);
  const [editingHighlightIndex, setEditingHighlightIndex] = useState<number | null>(null);
  const [editedHighlights, setEditedHighlights] = useState<HighlightSection[] | null>(null);

  // Section editing states
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editedHero, setEditedHero] = useState<HeroSection | null>(null);
  const [editedFitSection, setEditedFitSection] = useState<FitSection | null>(null);
  const [editedPlan, setEditedPlan] = useState<Plan306090 | null>(null);
  const [editedCaseStudies, setEditedCaseStudies] = useState<CaseStudy[] | null>(null);
  const [editingCaseStudyIndex, setEditingCaseStudyIndex] = useState<number | null>(null);
  const [editingFitBulletIndex, setEditingFitBulletIndex] = useState<number | null>(null);
  const [editedCommentary, setEditedCommentary] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'interview' | 'emails'>('content');
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free');
  const [jobId, setJobId] = useState<string | null>(null);

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
        .select('username, subscription_tier')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUsername(profile.username);
        setSubscriptionTier(profile.subscription_tier || 'free');
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
      setShowAICommentary(data.show_ai_commentary !== false);
      setJobId(data.job_id);
      setIsLoading(false);

      // Load analytics
      const { data: analyticsData } = await supabase
        .from('page_analytics')
        .select('id, created_at')
        .eq('page_id', pageId)
        .eq('event_type', 'page_view')
        .order('created_at', { ascending: true });

      if (analyticsData && analyticsData.length > 0) {
        setAnalytics({
          views: analyticsData.length,
          firstViewAt: analyticsData[0].created_at,
          lastViewAt: analyticsData[analyticsData.length - 1].created_at,
          publishedAt: data.generated_at, // Use page generation time as proxy for publish time
        });
      } else {
        setAnalytics({
          views: 0,
          firstViewAt: null,
          lastViewAt: null,
          publishedAt: data.generated_at,
        });
      }
    }

    loadPage();
  }, [pageId, router]);

  const handlePublish = async () => {
    if (!page) return;

    setIsPublishing(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        alert('You must be logged in to publish');
        return;
      }

      const newPublishedState = !page.is_published;

      const { error } = await supabase
        .from('signal_pages')
        .update({ is_published: newPublishedState })
        .eq('id', pageId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Publish error:', error);
        alert(`Failed to ${newPublishedState ? 'publish' : 'unpublish'}: ${error.message}`);
        return;
      }

      setPage((prev) => prev ? { ...prev, is_published: newPublishedState } : null);

      // Also update job status
      await supabase
        .from('jobs')
        .update({ status: newPublishedState ? 'published' : 'draft' })
        .eq('id', page.job_id)
        .eq('user_id', user.id);

    } catch (err) {
      console.error('Publish error:', err);
      alert('An error occurred while publishing');
    } finally {
      setIsPublishing(false);
    }
  };

  const copyToClipboard = async () => {
    const fullUrl = `${window.location.origin}/${username}/${page?.slug}`;
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleAICommentary = async () => {
    if (!page) return;

    const newValue = !showAICommentary;
    setShowAICommentary(newValue);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      await supabase
        .from('signal_pages')
        .update({ show_ai_commentary: newValue })
        .eq('id', pageId)
        .eq('user_id', user.id);
    } catch (err) {
      console.error('Error toggling AI commentary:', err);
      setShowAICommentary(!newValue); // Revert on error
    }
  };

  const handleRegenerateCommentary = async () => {
    if (!page) return;

    setIsRegenerating(true);

    try {
      const response = await fetch('/api/regenerate-commentary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to regenerate');
      }

      const { ai_commentary } = await response.json();
      setPage((prev) => prev ? { ...prev, ai_commentary } : null);
    } catch (err) {
      console.error('Error regenerating commentary:', err);
      alert('Failed to regenerate AI commentary. Please try again.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleRecalculateScore = async () => {
    if (!page) return;

    setIsRecalculatingScore(true);

    try {
      const response = await fetch('/api/recalculate-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to recalculate');
      }

      const { match_score, match_breakdown } = await response.json();
      setPage((prev) => prev ? { ...prev, match_score, match_breakdown } : null);
    } catch (err) {
      console.error('Error recalculating score:', err);
      alert('Failed to recalculate match score. Please try again.');
    } finally {
      setIsRecalculatingScore(false);
    }
  };

  const handleDeletePage = async () => {
    if (!page) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete the page for "${page.jobs.role_title} @ ${page.jobs.company_name}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setIsDeleting(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        alert('You must be logged in');
        return;
      }

      // Delete the signal page (job will be orphaned but that's ok)
      const { error: pageError } = await supabase
        .from('signal_pages')
        .delete()
        .eq('id', pageId)
        .eq('user_id', user.id);

      if (pageError) throw pageError;

      // Also delete the job
      const { error: jobError } = await supabase
        .from('jobs')
        .delete()
        .eq('id', page.job_id)
        .eq('user_id', user.id);

      if (jobError) {
        console.error('Error deleting job:', jobError);
        // Don't throw - page is already deleted
      }

      router.push('/dashboard');
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete page. Please try again.');
      setIsDeleting(false);
    }
  };

  const handleEditHighlight = (index: number) => {
    if (!editedHighlights) {
      setEditedHighlights([...(page?.highlights as HighlightSection[] || [])]);
    }
    setEditingHighlightIndex(index);
  };

  const handleHighlightChange = (index: number, field: keyof HighlightSection, value: string) => {
    if (!editedHighlights) return;
    const updated = [...editedHighlights];
    updated[index] = { ...updated[index], [field]: value };
    setEditedHighlights(updated);
  };

  const handleSaveHighlight = async (index: number) => {
    if (!page || !editedHighlights) return;

    setIsSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { error } = await supabase
        .from('signal_pages')
        .update({ highlights: editedHighlights })
        .eq('id', pageId)
        .eq('user_id', user.id);

      if (error) throw error;

      setPage((prev) => prev ? { ...prev, highlights: editedHighlights } : null);
      setEditingHighlightIndex(null);
    } catch (err) {
      console.error('Error saving highlight:', err);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingHighlightIndex(null);
    setEditedHighlights(null);
  };

  const handleDeleteHighlight = async (index: number) => {
    if (!page) return;

    const confirmed = window.confirm('Are you sure you want to delete this highlight?');
    if (!confirmed) return;

    const currentHighlights = editedHighlights || (page.highlights as HighlightSection[]);
    const updatedHighlights = currentHighlights.filter((_, i) => i !== index);

    setIsSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { error } = await supabase
        .from('signal_pages')
        .update({ highlights: updatedHighlights })
        .eq('id', pageId)
        .eq('user_id', user.id);

      if (error) throw error;

      setPage((prev) => prev ? { ...prev, highlights: updatedHighlights } : null);
      setEditedHighlights(null);
      setEditingHighlightIndex(null);
    } catch (err) {
      console.error('Error deleting highlight:', err);
      alert('Failed to delete highlight. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Generic save function for any section
  const saveSection = async (field: string, value: unknown) => {
    if (!page) return;

    setIsSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { error } = await supabase
        .from('signal_pages')
        .update({ [field]: value })
        .eq('id', pageId)
        .eq('user_id', user.id);

      if (error) throw error;

      setPage((prev) => prev ? { ...prev, [field]: value } : null);
      setEditingSection(null);
      setEditedHero(null);
      setEditedFitSection(null);
      setEditedPlan(null);
      setEditedCaseStudies(null);
      setEditingCaseStudyIndex(null);
      setEditingFitBulletIndex(null);
      setEditedCommentary(null);
    } catch (err) {
      console.error('Error saving section:', err);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Hero handlers
  const handleEditHero = () => {
    setEditedHero({ ...(page?.hero as HeroSection) });
    setEditingSection('hero');
  };

  const handleSaveHero = () => {
    if (editedHero) {
      saveSection('hero', editedHero);
    }
  };

  // Fit Section handlers
  const handleEditFitBullet = (index: number) => {
    if (!editedFitSection) {
      setEditedFitSection({ ...(page?.fit_section as FitSection) });
    }
    setEditingFitBulletIndex(index);
    setEditingSection('fit');
  };

  const handleFitBulletChange = (index: number, field: 'requirement' | 'evidence', value: string) => {
    if (!editedFitSection) return;
    const updated = { ...editedFitSection };
    updated.fit_bullets = [...updated.fit_bullets];
    updated.fit_bullets[index] = { ...updated.fit_bullets[index], [field]: value };
    setEditedFitSection(updated);
  };

  const handleSaveFitBullet = () => {
    if (editedFitSection) {
      saveSection('fit_section', editedFitSection);
    }
  };

  const handleDeleteFitBullet = async (index: number) => {
    const confirmed = window.confirm('Are you sure you want to delete this fit bullet?');
    if (!confirmed) return;

    const currentFit = editedFitSection || (page?.fit_section as FitSection);
    const updated = {
      ...currentFit,
      fit_bullets: currentFit.fit_bullets.filter((_, i) => i !== index),
    };
    await saveSection('fit_section', updated);
  };

  // 30/60/90 Plan handlers
  const handleEditPlan = (phase: 'day_30' | 'day_60' | 'day_90') => {
    if (!editedPlan) {
      setEditedPlan({ ...(page?.plan_30_60_90 as Plan306090) });
    }
    setEditingSection(`plan_${phase}`);
  };

  const handlePlanChange = (phase: 'day_30' | 'day_60' | 'day_90', field: 'title' | 'objectives', value: string | string[]) => {
    if (!editedPlan) return;
    const updated = { ...editedPlan };
    updated[phase] = { ...updated[phase], [field]: value };
    setEditedPlan(updated);
  };

  const handleSavePlan = () => {
    if (editedPlan) {
      saveSection('plan_30_60_90', editedPlan);
    }
  };

  // Case Studies handlers
  const handleEditCaseStudy = (index: number) => {
    if (!editedCaseStudies) {
      setEditedCaseStudies([...(page?.case_studies as CaseStudy[])]);
    }
    setEditingCaseStudyIndex(index);
    setEditingSection('case_studies');
  };

  const handleCaseStudyChange = (index: number, field: keyof CaseStudy, value: string) => {
    if (!editedCaseStudies) return;
    const updated = [...editedCaseStudies];
    updated[index] = { ...updated[index], [field]: value };
    setEditedCaseStudies(updated);
  };

  const handleSaveCaseStudy = () => {
    if (editedCaseStudies) {
      saveSection('case_studies', editedCaseStudies);
    }
  };

  const handleDeleteCaseStudy = async (index: number) => {
    const confirmed = window.confirm('Are you sure you want to delete this case study?');
    if (!confirmed) return;

    const current = editedCaseStudies || (page?.case_studies as CaseStudy[]);
    const updated = current.filter((_, i) => i !== index);
    await saveSection('case_studies', updated);
  };

  // AI Commentary handlers
  const handleEditCommentary = () => {
    setEditedCommentary(page?.ai_commentary || '');
    setEditingSection('commentary');
  };

  const handleSaveCommentary = () => {
    if (editedCommentary !== null) {
      saveSection('ai_commentary', editedCommentary);
    }
  };

  // Cancel any edit
  const handleCancelSectionEdit = () => {
    setEditingSection(null);
    setEditedHero(null);
    setEditedFitSection(null);
    setEditedPlan(null);
    setEditedCaseStudies(null);
    setEditingCaseStudyIndex(null);
    setEditingFitBulletIndex(null);
    setEditedCommentary(null);
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

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('content')}
            className={`flex items-center gap-2 pb-3 text-sm font-medium transition-colors ${
              activeTab === 'content'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Page Content
          </button>
          <button
            onClick={() => setActiveTab('interview')}
            className={`flex items-center gap-2 pb-3 text-sm font-medium transition-colors ${
              activeTab === 'interview'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Interview Prep
            {!hasCoachAccess(subscriptionTier as 'free' | 'pro' | 'coach') && (
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                Pro
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('emails')}
            className={`flex items-center gap-2 pb-3 text-sm font-medium transition-colors ${
              activeTab === 'emails'
                ? 'border-b-2 border-green-600 text-green-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Emails
            {!hasProAccess(subscriptionTier as 'free' | 'pro' | 'coach') && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                Pro
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Interview Prep Tab */}
      {activeTab === 'interview' && jobId && (
        <InterviewPrep
          jobId={jobId}
          hasAccess={hasCoachAccess(subscriptionTier as 'free' | 'pro' | 'coach')}
        />
      )}

      {/* Emails Tab */}
      {activeTab === 'emails' && jobId && (
        <EmailGenerator
          jobId={jobId}
          hasAccess={hasProAccess(subscriptionTier as 'free' | 'pro' | 'coach')}
        />
      )}

      {/* Page Content Tab */}
      {activeTab === 'content' && (
      <>
      <div className="space-y-6">
        {/* Hero */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Hero Section</CardTitle>
              {editingSection !== 'hero' && (
                <button onClick={handleEditHero} className="text-xs text-blue-600 hover:text-blue-700">
                  Edit
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {editingSection === 'hero' && editedHero ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Tagline</label>
                  <input
                    type="text"
                    value={editedHero.tagline}
                    onChange={(e) => setEditedHero({ ...editedHero, tagline: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Value Promise</label>
                  <textarea
                    value={editedHero.value_promise}
                    onChange={(e) => setEditedHero({ ...editedHero, value_promise: e.target.value })}
                    rows={3}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={handleCancelSectionEdit} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleSaveHero} isLoading={isSaving}>
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onClick={handleEditHero}
                className="cursor-pointer rounded-lg bg-gray-900 p-6 text-white transition-opacity hover:opacity-90"
              >
                <h2 className="mb-2 text-2xl font-bold">{hero.tagline}</h2>
                <p className="text-gray-300">{hero.value_promise}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fit Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Why I&apos;m a Fit ({fitSection.fit_bullets?.length || 0} points)</CardTitle>
              <p className="text-xs text-gray-500">Click to edit</p>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {fitSection.fit_bullets?.map((bullet, i) => {
                const isEditing = editingSection === 'fit' && editingFitBulletIndex === i;
                const currentBullet = editedFitSection?.fit_bullets?.[i] || bullet;

                if (isEditing) {
                  return (
                    <li key={i} className="rounded-lg border-2 border-blue-300 bg-blue-50 p-3">
                      <div className="space-y-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700">Requirement</label>
                          <input
                            type="text"
                            value={currentBullet.requirement}
                            onChange={(e) => handleFitBulletChange(i, 'requirement', e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700">Evidence</label>
                          <textarea
                            value={currentBullet.evidence}
                            onChange={(e) => handleFitBulletChange(i, 'evidence', e.target.value)}
                            rows={2}
                            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <button
                            onClick={() => handleDeleteFitBullet(i)}
                            className="text-sm text-red-600 hover:text-red-700"
                            disabled={isSaving}
                          >
                            Delete
                          </button>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleCancelSectionEdit} disabled={isSaving}>
                              Cancel
                            </Button>
                            <Button variant="primary" size="sm" onClick={handleSaveFitBullet} isLoading={isSaving}>
                              Save
                            </Button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                }

                return (
                  <li
                    key={i}
                    onClick={() => handleEditFitBullet(i)}
                    className="cursor-pointer rounded-lg bg-gray-50 p-3 transition-colors hover:bg-blue-50 hover:ring-1 hover:ring-blue-200"
                  >
                    <p className="text-sm text-gray-500">{bullet.requirement}</p>
                    <p className="mt-1 text-gray-900">{bullet.evidence}</p>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        {/* Highlights */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Career Highlights ({highlights?.length || 0})</CardTitle>
              <p className="text-xs text-gray-500">Click a highlight to edit</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {highlights?.map((highlight, i) => {
                const isEditing = editingHighlightIndex === i;
                const currentHighlight = editedHighlights?.[i] || highlight;

                if (isEditing) {
                  return (
                    <div key={i} className="rounded-lg border-2 border-blue-300 bg-blue-50 p-4">
                      <div className="space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">Role</label>
                            <input
                              type="text"
                              value={currentHighlight.role}
                              onChange={(e) => handleHighlightChange(i, 'role', e.target.value)}
                              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">Company</label>
                            <input
                              type="text"
                              value={currentHighlight.company}
                              onChange={(e) => handleHighlightChange(i, 'company', e.target.value)}
                              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700">Impact</label>
                          <textarea
                            value={currentHighlight.impact}
                            onChange={(e) => handleHighlightChange(i, 'impact', e.target.value)}
                            rows={2}
                            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <button
                            onClick={() => handleDeleteHighlight(i)}
                            className="text-sm text-red-600 hover:text-red-700"
                            disabled={isSaving}
                          >
                            Delete
                          </button>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleCancelEdit} disabled={isSaving}>
                              Cancel
                            </Button>
                            <Button variant="primary" size="sm" onClick={() => handleSaveHighlight(i)} isLoading={isSaving}>
                              Save
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={i}
                    onClick={() => handleEditHighlight(i)}
                    className="cursor-pointer rounded-lg border border-gray-200 p-4 transition-colors hover:border-blue-300 hover:bg-blue-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-2 font-medium">{highlight.role} at {highlight.company}</div>
                        <p className="text-sm text-gray-600">{highlight.impact}</p>
                      </div>
                      <svg className="ml-2 h-4 w-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 30/60/90 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>30/60/90 Day Plan</CardTitle>
              <p className="text-xs text-gray-500">Click a phase to edit</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { data: plan306090.day_30, color: 'blue', label: 'First 30 Days', key: 'day_30' as const },
                { data: plan306090.day_60, color: 'purple', label: 'Days 31-60', key: 'day_60' as const },
                { data: plan306090.day_90, color: 'green', label: 'Days 61-90', key: 'day_90' as const },
              ].map((phase) => {
                const colorMap = {
                  blue: { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-600', bullet: 'text-blue-600' },
                  purple: { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-600', bullet: 'text-purple-600' },
                  green: { bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-600', bullet: 'text-green-600' },
                } as const;
                const colorClasses = colorMap[phase.color as keyof typeof colorMap];
                const isEditing = editingSection === `plan_${phase.key}`;
                const currentPhase = editedPlan?.[phase.key] || phase.data;

                if (isEditing && currentPhase) {
                  return (
                    <div key={phase.key} className={`rounded-xl border-2 border-blue-400 ${colorClasses.bg} p-4`}>
                      <div className={`mb-3 inline-block rounded-full ${colorClasses.badge} px-2.5 py-0.5 text-xs font-medium text-white`}>
                        {phase.label}
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700">Title</label>
                          <input
                            type="text"
                            value={currentPhase.title}
                            onChange={(e) => handlePlanChange(phase.key, 'title', e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700">Objectives (one per line)</label>
                          <textarea
                            value={currentPhase.objectives?.join('\n') || ''}
                            onChange={(e) => handlePlanChange(phase.key, 'objectives', e.target.value.split('\n').filter(o => o.trim()))}
                            rows={4}
                            className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={handleCancelSectionEdit} disabled={isSaving} className="flex-1 text-xs">
                            Cancel
                          </Button>
                          <Button variant="primary" size="sm" onClick={handleSavePlan} isLoading={isSaving} className="flex-1 text-xs">
                            Save
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={phase.key}
                    onClick={() => handleEditPlan(phase.key)}
                    className={`cursor-pointer rounded-xl border ${colorClasses.border} ${colorClasses.bg} p-4 transition-all hover:ring-2 hover:ring-blue-300`}
                  >
                    <div className={`mb-3 inline-block rounded-full ${colorClasses.badge} px-2.5 py-0.5 text-xs font-medium text-white`}>
                      {phase.label}
                    </div>
                    <h3 className="mb-3 text-sm font-semibold text-gray-900">{phase.data?.title}</h3>
                    {phase.data?.objectives && phase.data.objectives.length > 0 && (
                      <div className="mb-3">
                        <p className="mb-1.5 text-xs font-medium text-gray-500">Objectives</p>
                        <ul className="space-y-1.5">
                          {phase.data.objectives.map((objective, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                              <svg className={`mt-0.5 h-3 w-3 shrink-0 ${colorClasses.bullet}`} fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              {objective}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {phase.data?.deliverables && phase.data.deliverables.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-xs font-medium text-gray-500">Deliverables</p>
                        <ul className="space-y-1">
                          {phase.data.deliverables.map((deliverable, i) => (
                            <li key={i} className="rounded bg-white/50 px-1.5 py-0.5 text-xs text-gray-700">
                              {deliverable}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Case Studies */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Case Studies ({caseStudies?.length || 0})</CardTitle>
              <p className="text-xs text-gray-500">Click to edit</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {caseStudies?.map((study, i) => {
                const isEditing = editingSection === 'case_studies' && editingCaseStudyIndex === i;
                const currentStudy = editedCaseStudies?.[i] || study;

                if (isEditing) {
                  return (
                    <div key={i} className="rounded-lg border-2 border-blue-300 bg-blue-50 p-4">
                      <div className="space-y-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700">Relevance</label>
                          <input
                            type="text"
                            value={currentStudy.relevance}
                            onChange={(e) => handleCaseStudyChange(i, 'relevance', e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700">Title</label>
                          <input
                            type="text"
                            value={currentStudy.title}
                            onChange={(e) => handleCaseStudyChange(i, 'title', e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700">Description</label>
                          <textarea
                            value={currentStudy.description}
                            onChange={(e) => handleCaseStudyChange(i, 'description', e.target.value)}
                            rows={3}
                            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <button
                            onClick={() => handleDeleteCaseStudy(i)}
                            className="text-sm text-red-600 hover:text-red-700"
                            disabled={isSaving}
                          >
                            Delete
                          </button>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleCancelSectionEdit} disabled={isSaving}>
                              Cancel
                            </Button>
                            <Button variant="primary" size="sm" onClick={handleSaveCaseStudy} isLoading={isSaving}>
                              Save
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={i}
                    onClick={() => handleEditCaseStudy(i)}
                    className="cursor-pointer rounded-lg border border-gray-200 p-4 transition-colors hover:border-blue-300 hover:bg-blue-50"
                  >
                    <div className="mb-1 text-sm text-blue-600">{study.relevance}</div>
                    <div className="font-medium">{study.title}</div>
                    <p className="mt-1 text-sm text-gray-600">{study.description}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* AI Commentary */}
        {page.ai_commentary && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>AI Career Coach Insights</CardTitle>
                <div className="flex items-center gap-4">
                  {editingSection !== 'commentary' && (
                    <button onClick={handleEditCommentary} className="text-xs text-blue-600 hover:text-blue-700">
                      Edit
                    </button>
                  )}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-sm text-gray-600">
                      {showAICommentary ? 'Visible' : 'Hidden'}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={showAICommentary}
                      onClick={handleToggleAICommentary}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        showAICommentary ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          showAICommentary ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </label>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {editingSection === 'commentary' ? (
                <div className="space-y-4">
                  <textarea
                    value={editedCommentary || ''}
                    onChange={(e) => setEditedCommentary(e.target.value)}
                    rows={8}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={handleCancelSectionEdit} disabled={isSaving}>
                      Cancel
                    </Button>
                    <Button variant="primary" size="sm" onClick={handleSaveCommentary} isLoading={isSaving}>
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    onClick={handleEditCommentary}
                    className={`cursor-pointer rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 p-4 transition-opacity hover:opacity-80 ${!showAICommentary ? 'opacity-50' : ''}`}
                  >
                    <p className="whitespace-pre-wrap text-gray-700">{page.ai_commentary}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    {!showAICommentary ? (
                      <p className="text-sm text-gray-500">
                        This section will not be visible on your published page.
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500">
                        Uses your first name for a personalized touch.
                      </p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRegenerateCommentary}
                      disabled={isRegenerating}
                    >
                      {isRegenerating ? (
                        <>
                          <svg className="mr-1.5 h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Regenerate
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Role Match Score & Analytics Row */}
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {/* Role Match Score */}
        <Card>
          <CardHeader>
            <CardTitle>Role Match Score</CardTitle>
          </CardHeader>
          <CardContent>
            {page.match_score !== undefined && page.match_score !== null ? (
              <div>
                {/* Score Circle */}
                <div className="flex items-center gap-6">
                  <div className={`relative flex h-24 w-24 items-center justify-center rounded-full ${
                    page.match_score >= 80 ? 'bg-green-100' :
                    page.match_score >= 60 ? 'bg-blue-100' :
                    page.match_score >= 40 ? 'bg-yellow-100' : 'bg-red-100'
                  }`}>
                    <span className={`text-3xl font-bold ${
                      page.match_score >= 80 ? 'text-green-600' :
                      page.match_score >= 60 ? 'text-blue-600' :
                      page.match_score >= 40 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {page.match_score}
                    </span>
                  </div>
                  <div>
                    <p className={`text-lg font-semibold ${
                      page.match_score >= 80 ? 'text-green-600' :
                      page.match_score >= 60 ? 'text-blue-600' :
                      page.match_score >= 40 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {page.match_score >= 80 ? 'Excellent Match' :
                       page.match_score >= 60 ? 'Strong Match' :
                       page.match_score >= 40 ? 'Moderate Match' : 'Needs Review'}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Based on skills, experience, and requirements alignment
                    </p>
                  </div>
                </div>

                {/* Breakdown */}
                {page.match_breakdown && (
                  <div className="mt-6 space-y-3">
                    <div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Skills Match</span>
                        <span className="font-medium">{page.match_breakdown.skills_match}%</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-blue-600"
                          style={{ width: `${page.match_breakdown.skills_match}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Experience Match</span>
                        <span className="font-medium">{page.match_breakdown.experience_match}%</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-purple-600"
                          style={{ width: `${page.match_breakdown.experience_match}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Requirements Match</span>
                        <span className="font-medium">{page.match_breakdown.requirements_match}%</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-green-600"
                          style={{ width: `${page.match_breakdown.requirements_match}%` }}
                        />
                      </div>
                    </div>

                    {/* Skills summary and recalculate button */}
                    <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium text-green-600">{page.match_breakdown.total_matched_skills}</span>
                        {' '}of{' '}
                        <span className="font-medium">{page.match_breakdown.total_required_skills}</span>
                        {' '}required skills matched
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRecalculateScore}
                        disabled={isRecalculatingScore}
                      >
                        {isRecalculatingScore ? 'Calculating...' : 'Recalculate'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-4">
                  Match score not available for this page.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleRecalculateScore}
                  disabled={isRecalculatingScore}
                >
                  {isRecalculatingScore ? 'Calculating...' : 'Calculate Match Score'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Page Analytics */}
        <Card>
          <CardHeader>
            <CardTitle>Page Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            {!page.is_published ? (
              <p className="text-sm text-gray-500">
                Publish your page to start tracking analytics.
              </p>
            ) : analytics && analytics.views > 0 ? (
              <div className="space-y-4">
                {/* Total Views - Large */}
                <div className="rounded-lg bg-gray-50 p-4 text-center">
                  <p className="text-3xl font-bold text-gray-900">{analytics.views}</p>
                  <p className="mt-1 text-sm text-gray-500">Total Views</p>
                </div>

                {/* Time to First View & Last Viewed */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Time to First View */}
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <p className="text-xs font-medium text-blue-700">First View</p>
                    </div>
                    <p className="text-sm font-semibold text-blue-900">
                      {analytics.firstViewAt && analytics.publishedAt
                        ? formatDistance(new Date(analytics.firstViewAt), new Date(analytics.publishedAt), { addSuffix: false }) + ' after publishing'
                        : 'N/A'}
                    </p>
                  </div>

                  {/* Last Viewed */}
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-xs font-medium text-green-700">Last Viewed</p>
                    </div>
                    <p className="text-sm font-semibold text-green-900">
                      {analytics.lastViewAt
                        ? formatDistanceToNow(new Date(analytics.lastViewAt), { addSuffix: true })
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-gray-400 text-center">
                  Analytics update in real-time as visitors view your page
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No views yet. Share your page URL to start getting visitors.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      </>
      )}

      {/* Danger Zone */}
      <div className="mt-8">
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Delete this page</p>
                <p className="text-sm text-gray-500">
                  Once deleted, this page and all its data cannot be recovered.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleDeletePage}
                disabled={isDeleting}
                className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
              >
                {isDeleting ? (
                  <>
                    <svg className="mr-1.5 h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Deleting...
                  </>
                ) : (
                  <>
                    <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Page
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
