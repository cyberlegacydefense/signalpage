'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  Button,
  Input,
  Textarea,
  Select,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui';
import type { SeniorityLevel, Resume } from '@/types';
import { RESUME_TAGS } from '@/types';

interface SubscriptionStatus {
  tier: string;
  isFreeUser: boolean;
  maxPages: number;
  currentPageCount: number;
  canCreatePage: boolean;
}

const seniorityOptions = [
  { value: 'entry', label: 'Entry Level' },
  { value: 'mid', label: 'Mid Level' },
  { value: 'senior', label: 'Senior' },
  { value: 'staff', label: 'Staff' },
  { value: 'principal', label: 'Principal' },
  { value: 'director', label: 'Director' },
  { value: 'vp', label: 'VP' },
  { value: 'c_level', label: 'C-Level' },
];

export default function NewJobPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(true);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();

      // Check subscription
      try {
        const response = await fetch('/api/subscription/status');
        if (response.ok) {
          const data = await response.json();
          setSubscription(data);
        }
      } catch (err) {
        console.error('Failed to check subscription:', err);
      } finally {
        setCheckingSubscription(false);
      }

      // Load resumes
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: resumesData } = await supabase
            .from('resumes')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (resumesData) {
            setResumes(resumesData);
          }
        }
      } catch (err) {
        console.error('Failed to load resumes:', err);
      } finally {
        setLoadingResumes(false);
      }
    }
    loadData();
  }, []);

  const [formData, setFormData] = useState({
    company_name: '',
    role_title: '',
    job_description: '',
    additional_notes: '',
    company_url: '',
    job_posting_url: '',
    seniority_level: 'mid' as SeniorityLevel,
    resume_id: '',
    recruiter_name: '',
    hiring_manager_name: '',
  });

  const [isFetchingJob, setIsFetchingJob] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [fetchSuccess, setFetchSuccess] = useState('');

  const handleFetchJobPosting = async () => {
    if (!formData.job_posting_url) {
      setFetchError('Please enter a job posting URL first');
      return;
    }

    setIsFetchingJob(true);
    setFetchError('');
    setFetchSuccess('');

    try {
      const response = await fetch('/api/fetch-job-posting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: formData.job_posting_url }),
      });

      const data = await response.json();

      if (!response.ok) {
        setFetchError(data.error || 'Failed to fetch job posting');
        return;
      }

      setFormData((prev) => ({
        ...prev,
        job_description: data.jobDescription,
      }));
      setFetchSuccess(data.note || 'Job description extracted successfully!');
    } catch (err) {
      setFetchError('Failed to fetch job posting. Please copy and paste the job description manually.');
    } finally {
      setIsFetchingJob(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('You must be logged in');
        return;
      }

      // Create the job - combine job description with additional notes if provided
      const fullJobDescription = formData.additional_notes
        ? `${formData.job_description}\n\n--- Additional Notes ---\n${formData.additional_notes}`
        : formData.job_description;

      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert({
          user_id: user.id,
          company_name: formData.company_name,
          role_title: formData.role_title,
          job_description: fullJobDescription,
          company_url: formData.company_url || null,
          job_posting_url: formData.job_posting_url || null,
          seniority_level: formData.seniority_level,
          resume_id: formData.resume_id || null,
          recruiter_name: formData.recruiter_name || null,
          hiring_manager_name: formData.hiring_manager_name || null,
          status: 'draft',
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // Redirect to generation page
      router.push(`/dashboard/jobs/${job.id}/generate`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while checking subscription
  if (checkingSubscription) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <p className="mt-4 text-sm text-gray-500">Checking your subscription...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show upgrade prompt if user can't create more pages
  if (subscription && !subscription.canCreatePage) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Upgrade Required</CardTitle>
            <CardDescription>
              You&apos;ve reached your limit of {subscription.maxPages} Signal Page{subscription.maxPages === 1 ? '' : 's'} on the free plan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                Unlock Unlimited Signal Pages
              </h3>
              <p className="mb-6 text-sm text-gray-600">
                Upgrade to Pro to create unlimited role-specific landing pages and stand out in every application.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/pricing">
                  <Button variant="primary">View Pricing</Button>
                </Link>
                <Button variant="outline" onClick={() => router.push('/dashboard')}>
                  Back to Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Create New Signal Page</CardTitle>
          <CardDescription>
            Enter the job details and we&apos;ll generate a role-specific landing
            page that showcases your fit for this opportunity.
          </CardDescription>
          {subscription && !subscription.isFreeUser && subscription.tier === 'free' && (
            <div className="mt-2 text-xs text-gray-500">
              {subscription.currentPageCount} of {subscription.maxPages} pages used
            </div>
          )}
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Company Name"
                value={formData.company_name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, company_name: e.target.value }))
                }
                placeholder="e.g., Acme Corp"
                required
              />

              <Input
                label="Role Title"
                value={formData.role_title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, role_title: e.target.value }))
                }
                placeholder="e.g., Senior Data Engineer"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Seniority Level"
                options={seniorityOptions}
                value={formData.seniority_level}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    seniority_level: e.target.value as SeniorityLevel,
                  }))
                }
              />

              <div>
                <Select
                  label="Resume"
                  value={formData.resume_id}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, resume_id: e.target.value }))
                  }
                  options={[
                    { value: '', label: loadingResumes ? 'Loading...' : (resumes.length === 0 ? 'No resumes available' : 'Select a resume...') },
                    ...resumes.map((r) => ({
                      value: r.id,
                      label: `${r.name || 'Untitled'}${r.tag ? ` (${RESUME_TAGS.find(t => t.value === r.tag)?.label || r.tag})` : ''}${r.is_primary ? ' - Primary' : ''}`,
                    })),
                  ]}
                />
                {resumes.length === 0 && !loadingResumes && (
                  <Link href="/dashboard/profile" className="mt-1 block text-sm text-blue-600 hover:underline">
                    Add a resume in your profile
                  </Link>
                )}
              </div>
            </div>

            {/* Optional Personalization */}
            <div className="rounded-lg border border-gray-200 p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                Personalization (Optional)
              </h4>
              <p className="text-xs text-gray-500 mb-4">
                Add the recruiter or hiring manager&apos;s name to personalize your AI Career Coach insights section.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Recruiter Name"
                  value={formData.recruiter_name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, recruiter_name: e.target.value }))
                  }
                  placeholder="e.g., Sarah Johnson"
                  helperText="The recruiter who contacted you"
                />
                <Input
                  label="Hiring Manager Name"
                  value={formData.hiring_manager_name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, hiring_manager_name: e.target.value }))
                  }
                  placeholder="e.g., Michael Chen"
                  helperText="The hiring manager for this role"
                />
              </div>
            </div>

            {/* Job Posting URL with Fetch */}
            <div className="rounded-lg border border-gray-200 p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                Job Posting
              </h4>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      label="Job Posting URL"
                      type="url"
                      value={formData.job_posting_url}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          job_posting_url: e.target.value,
                        }));
                        setFetchError('');
                        setFetchSuccess('');
                      }}
                      placeholder="https://linkedin.com/jobs/... or https://company.com/careers/..."
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleFetchJobPosting}
                      disabled={isFetchingJob || !formData.job_posting_url}
                      className="whitespace-nowrap"
                    >
                      {isFetchingJob ? (
                        <>
                          <svg className="mr-1.5 h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Fetching...
                        </>
                      ) : (
                        <>
                          <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Fetch
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                {fetchError && (
                  <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
                    <div className="flex items-start gap-2">
                      <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      {fetchError}
                    </div>
                  </div>
                )}
                {fetchSuccess && (
                  <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">
                    <div className="flex items-start gap-2">
                      <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {fetchSuccess}
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  Enter a job posting URL and click Fetch to auto-populate the description, or paste it manually below.
                </p>
              </div>
            </div>

            <Textarea
              label="Job Description"
              value={formData.job_description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, job_description: e.target.value }))
              }
              placeholder="Paste the full job description here, or use the Fetch button above to extract it from a URL..."
              className="min-h-[200px]"
              required
            />

            {/* Additional Notes */}
            <Textarea
              label="Additional Notes (Optional)"
              value={formData.additional_notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, additional_notes: e.target.value }))
              }
              placeholder="Add any additional context about the role - information from recruiter calls, specific team details, company culture notes, or anything not in the job posting..."
              className="min-h-[100px]"
              helperText="This information will be included when generating your page to make it more personalized"
            />

            <Input
              label="Company Website (Optional)"
              type="url"
              value={formData.company_url}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, company_url: e.target.value }))
              }
              placeholder="https://company.com"
              helperText="Helps with company research"
            />

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isLoading}>
                Continue to Generate
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
