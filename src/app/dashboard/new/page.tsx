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
    company_url: '',
    job_posting_url: '',
    seniority_level: 'mid' as SeniorityLevel,
    resume_id: '',
    recruiter_name: '',
    hiring_manager_name: '',
  });

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

      // Create the job
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert({
          user_id: user.id,
          company_name: formData.company_name,
          role_title: formData.role_title,
          job_description: formData.job_description,
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

              <Select
                label="Resume"
                value={formData.resume_id}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, resume_id: e.target.value }))
                }
                options={[
                  { value: '', label: loadingResumes ? 'Loading...' : (resumes.length === 0 ? 'No resumes - add one in Profile' : 'Select a resume...') },
                  ...resumes.map((r) => ({
                    value: r.id,
                    label: `${r.name || 'Untitled'}${r.tag ? ` (${RESUME_TAGS.find(t => t.value === r.tag)?.label || r.tag})` : ''}${r.is_primary ? ' - Primary' : ''}`,
                  })),
                ]}
                helperText={resumes.length === 0 ? <Link href="/dashboard/profile" className="text-blue-600 hover:underline">Add a resume in your profile</Link> : undefined}
              />
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

            <Textarea
              label="Job Description"
              value={formData.job_description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, job_description: e.target.value }))
              }
              placeholder="Paste the full job description here..."
              className="min-h-[200px]"
              required
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Company Website"
                type="url"
                value={formData.company_url}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, company_url: e.target.value }))
                }
                placeholder="https://company.com"
                helperText="Optional - helps with company research"
              />

              <Input
                label="Job Posting URL"
                type="url"
                value={formData.job_posting_url}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    job_posting_url: e.target.value,
                  }))
                }
                placeholder="https://..."
                helperText="Optional - for your reference"
              />
            </div>

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
