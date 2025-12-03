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
import type { SeniorityLevel } from '@/types';

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

  useEffect(() => {
    async function checkSubscription() {
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
    }
    checkSubscription();
  }, []);

  const [formData, setFormData] = useState({
    company_name: '',
    role_title: '',
    job_description: '',
    company_url: '',
    job_posting_url: '',
    seniority_level: 'mid' as SeniorityLevel,
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
          ...formData,
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
