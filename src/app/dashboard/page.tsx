import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui';
import { SuccessBanner } from '@/components/SuccessBanner';
import { DashboardContent } from '@/components/DashboardContent';

export const dynamic = 'force-dynamic';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const params = await searchParams;
  const checkoutSuccess = params.checkout === 'success';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get user's jobs with their signal pages
  const { data: jobs } = await supabase
    .from('jobs')
    .select(`
      *,
      signal_pages (
        id,
        slug,
        is_published,
        generated_at,
        match_score
      )
    `)
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false });

  // Get user profile for username
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user!.id)
    .single();

  // Get view counts for all signal pages
  const pageIds = jobs?.flatMap(job => job.signal_pages?.map((p: { id: string }) => p.id) || []) || [];
  const viewCounts: Record<string, number> = {};

  if (pageIds.length > 0) {
    // Exclude owner views from analytics counts
    // Use neq.true to exclude owner views (handles both false and null)
    const { data: analytics } = await supabase
      .from('page_analytics')
      .select('page_id')
      .in('page_id', pageIds)
      .eq('event_type', 'page_view')
      .neq('is_owner_view', true);

    if (analytics) {
      analytics.forEach((a: { page_id: string }) => {
        viewCounts[a.page_id] = (viewCounts[a.page_id] || 0) + 1;
      });
    }
  }

  // Transform jobs data for the client component
  const jobsData = jobs?.map(job => ({
    id: job.id,
    role_title: job.role_title,
    company_name: job.company_name,
    status: job.status,
    created_at: job.created_at,
    signal_pages: (job.signal_pages || []).map((p: { id: string; slug: string; is_published: boolean; generated_at: string; match_score: number | null }) => ({
      ...p,
      view_count: viewCounts[p.id] || 0,
    })),
  })) || [];

  return (
    <div>
      {checkoutSuccess && (
        <SuccessBanner
          title="Welcome to Pro!"
          message="Your subscription is now active. You can create unlimited Signal Pages. A confirmation email has been sent to your inbox."
        />
      )}

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Signal Pages</h1>
          <p className="mt-1 text-sm text-gray-600">
            Create role-specific landing pages that show you did your homework
          </p>
        </div>
        <Link href="/dashboard/new">
          <Button variant="primary">Create New Page</Button>
        </Link>
      </div>

      <DashboardContent jobs={jobsData} username={profile?.username || null} />
    </div>
  );
}
