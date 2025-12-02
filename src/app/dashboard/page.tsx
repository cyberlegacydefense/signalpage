import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button, Card, CardContent, Badge } from '@/components/ui';
import { formatDistanceToNow } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
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

  return (
    <div>
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

      {!jobs || jobs.length === 0 ? (
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
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => {
            const page = job.signal_pages?.[0];
            const pageUrl = page && profile
              ? `/${profile.username}/${page.slug}`
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
                      {page?.match_score !== undefined && page?.match_score !== null && (
                        <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          page.match_score >= 80 ? 'bg-green-100 text-green-700' :
                          page.match_score >= 60 ? 'bg-blue-100 text-blue-700' :
                          page.match_score >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                        }`}>
                          <span>{page.match_score}%</span>
                          <span>match</span>
                        </div>
                      )}
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
    </div>
  );
}
