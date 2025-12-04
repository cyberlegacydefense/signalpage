'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button, Card, CardContent } from '@/components/ui';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function GeneratePage({ params }: PageProps) {
  const { id: jobId } = use(params);
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'ready' | 'generating' | 'complete' | 'error'>('checking');
  const [error, setError] = useState('');
  const [job, setJob] = useState<{ company_name: string; role_title: string } | null>(null);

  useEffect(() => {
    async function checkReadiness() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Check if job exists
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('company_name, role_title')
        .eq('id', jobId)
        .eq('user_id', user.id)
        .single();

      if (jobError || !jobData) {
        setError('Job not found');
        setStatus('error');
        return;
      }

      setJob(jobData);

      // First get the job to check if a specific resume was selected
      const { data: fullJob } = await supabase
        .from('jobs')
        .select('resume_id')
        .eq('id', jobId)
        .eq('user_id', user.id)
        .single();

      // Check if resume exists - first try the job's selected resume, then fall back to primary
      let resume = null;

      if (fullJob?.resume_id) {
        // Use the resume selected for this job
        const { data: selectedResume } = await supabase
          .from('resumes')
          .select('id, parsed_data')
          .eq('id', fullJob.resume_id)
          .eq('user_id', user.id)
          .maybeSingle();
        resume = selectedResume;
      }

      if (!resume) {
        // Fall back to primary resume
        const { data: primaryResume } = await supabase
          .from('resumes')
          .select('id, parsed_data')
          .eq('user_id', user.id)
          .eq('is_primary', true)
          .maybeSingle();
        resume = primaryResume;
      }

      if (!resume) {
        // Fall back to any resume
        const { data: anyResume } = await supabase
          .from('resumes')
          .select('id, parsed_data')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();
        resume = anyResume;
      }

      if (!resume || !resume.parsed_data) {
        setError('Please upload and parse your resume before generating a page. Go to your Profile to add a resume.');
        setStatus('error');
        return;
      }

      // Check if page already exists
      const { data: existingPage } = await supabase
        .from('signal_pages')
        .select('id')
        .eq('job_id', jobId)
        .single();

      if (existingPage) {
        router.push(`/dashboard/pages/${existingPage.id}`);
        return;
      }

      setStatus('ready');
    }

    checkReadiness();
  }, [jobId, router]);

  const handleGenerate = async () => {
    setStatus('generating');
    setError('');

    try {
      const response = await fetch('/api/generate-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate page');
      }

      const { page } = await response.json();
      setStatus('complete');

      // Redirect to the page editor
      setTimeout(() => {
        router.push(`/dashboard/pages/${page.id}`);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStatus('error');
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardContent className="py-12 text-center">
          {status === 'checking' && (
            <>
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              <h2 className="text-lg font-medium text-gray-900">
                Checking requirements...
              </h2>
            </>
          )}

          {status === 'ready' && job && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <svg
                  className="h-8 w-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h2 className="mb-2 text-xl font-semibold text-gray-900">
                Ready to Generate
              </h2>
              <p className="mb-6 text-gray-600">
                Create your Signal Page for <strong>{job.role_title}</strong> at{' '}
                <strong>{job.company_name}</strong>
              </p>
              <p className="mb-8 text-sm text-gray-500">
                Our AI will analyze the job description and your resume to create:
              </p>
              <ul className="mb-8 space-y-2 text-left text-sm text-gray-600">
                <li className="flex items-center">
                  <svg className="mr-2 h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  A compelling hero section with your value proposition
                </li>
                <li className="flex items-center">
                  <svg className="mr-2 h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  &quot;Why I&apos;m a fit&quot; bullets mapped to job requirements
                </li>
                <li className="flex items-center">
                  <svg className="mr-2 h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Relevant career highlights with impact metrics
                </li>
                <li className="flex items-center">
                  <svg className="mr-2 h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  A custom 30/60/90 day plan for this role
                </li>
                <li className="flex items-center">
                  <svg className="mr-2 h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Relevant case studies from your background
                </li>
              </ul>
              <Button variant="primary" size="lg" onClick={handleGenerate}>
                Generate My Signal Page
              </Button>
            </>
          )}

          {status === 'generating' && (
            <>
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              <h2 className="mb-2 text-lg font-medium text-gray-900">
                Generating your Signal Page...
              </h2>
              <p className="text-sm text-gray-500">
                This typically takes 30-60 seconds
              </p>
            </>
          )}

          {status === 'complete' && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg
                  className="h-8 w-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="mb-2 text-xl font-semibold text-gray-900">
                Page Generated!
              </h2>
              <p className="text-gray-600">Redirecting to your page editor...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <svg
                  className="h-8 w-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="mb-2 text-xl font-semibold text-gray-900">
                {error.includes('resume') ? 'Resume Required' : 'Something went wrong'}
              </h2>
              <p className="mb-6 text-gray-600">{error}</p>
              {error.includes('resume') && (
                <div className="mb-6 rounded-lg bg-blue-50 border border-blue-200 p-4 text-left">
                  <h3 className="text-sm font-medium text-blue-800 mb-2">How to add a resume:</h3>
                  <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                    <li>Go to your Profile page</li>
                    <li>Upload your resume (PDF, DOC, or DOCX)</li>
                    <li>Make sure it&apos;s set as your primary resume</li>
                    <li>Come back here to generate your page</li>
                  </ol>
                </div>
              )}
              <div className="space-x-3">
                <Button variant="outline" onClick={() => router.push('/dashboard/profile')}>
                  Go to Profile
                </Button>
                {!error.includes('resume') && (
                  <Button variant="primary" onClick={() => setStatus('ready')}>
                    Try Again
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
