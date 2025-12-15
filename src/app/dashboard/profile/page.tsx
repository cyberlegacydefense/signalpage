'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  Button,
  Input,
  Textarea,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Select,
  Badge,
} from '@/components/ui';
import type { User, Resume, ParsedResume } from '@/types';
import { RESUME_TAGS } from '@/types';

interface NotificationSettings {
  email_on_page_view: boolean;
  email_on_return_visitor: boolean;
  email_on_high_engagement: boolean;
  email_weekly_digest: boolean;
  digest_day: string;
}

interface StripeDetails {
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  billingPeriod: string;
  price: number;
  paymentMethod: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  } | null;
}

interface SubscriptionInfo {
  tier: string;
  status: string;
  isFreeUser: boolean;
  maxPages: number;
  currentPageCount: number;
  stripeDetails?: StripeDetails | null;
}

const MAX_RESUMES = 5;

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [profile, setProfile] = useState<Partial<User>>({});
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string | 'new'>('new');
  const [resumeName, setResumeName] = useState('');
  const [resumeTag, setResumeTag] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [currentResume, setCurrentResume] = useState<Resume | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email_on_page_view: false,
    email_on_return_visitor: true,
    email_on_high_engagement: true,
    email_weekly_digest: true,
    digest_day: 'monday',
  });
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [notificationSuccess, setNotificationSuccess] = useState('');
  const [notificationError, setNotificationError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
    loadSubscription();
    loadNotificationSettings();
  }, []);

  async function loadSubscription() {
    try {
      const response = await fetch('/api/subscription/status');
      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
      }
    } catch (err) {
      console.error('Failed to load subscription:', err);
    }
  }

  async function loadNotificationSettings() {
    try {
      const response = await fetch('/api/notifications/settings');
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setNotificationSettings(data.settings);
        }
      }
    } catch (err) {
      console.error('Failed to load notification settings:', err);
    }
  }

  async function saveNotificationSettings() {
    setIsSavingNotifications(true);
    setNotificationError('');
    setNotificationSuccess('');

    try {
      const response = await fetch('/api/notifications/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationSettings),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save settings');
      }

      setNotificationSuccess('Notification settings saved!');
    } catch (err) {
      setNotificationError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSavingNotifications(false);
    }
  }

  const handleManageBilling = async () => {
    setIsLoadingPortal(true);
    try {
      const response = await fetch('/api/stripe/create-portal', {
        method: 'POST',
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Failed to open billing portal');
      }
    } catch (err) {
      setError('Failed to open billing portal');
    } finally {
      setIsLoadingPortal(false);
    }
  };

  async function loadData() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    // Load profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileData) {
      setProfile(profileData);
    }

    // Load all resumes
    const { data: resumesData } = await supabase
      .from('resumes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (resumesData && resumesData.length > 0) {
      setResumes(resumesData);
      // Select the primary resume or the first one
      const primaryResume = resumesData.find(r => r.is_primary) || resumesData[0];
      setSelectedResumeId(primaryResume.id);
      setCurrentResume(primaryResume);
      setResumeName(primaryResume.name || '');
      setResumeText(primaryResume.raw_text || '');
    }

    setIsLoading(false);
  }

  const handleResumeSelect = (id: string | 'new') => {
    setError('');
    setSuccess('');
    setSelectedResumeId(id);

    if (id === 'new') {
      setCurrentResume(null);
      setResumeName('');
      setResumeTag('');
      setResumeText('');
    } else {
      const resume = resumes.find(r => r.id === id);
      if (resume) {
        setCurrentResume(resume);
        setResumeName(resume.name || '');
        setResumeTag(resume.tag || '');
        // Force update the textarea with the selected resume's text
        setResumeText(resume.raw_text || '');
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a PDF, DOC, DOCX, or TXT file');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    setError('');
    setSuccess('');

    try {
      // For text files, read directly on client
      if (file.type === 'text/plain') {
        const text = await file.text();
        setResumeText(text);
        setSuccess('File loaded successfully! Click "Save & Parse" to process.');
      } else {
        // For PDF files, use the API to parse
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/parse-file', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to parse file');
        }

        setResumeText(data.text);
        setSuccess('File parsed successfully! Click "Save & Parse" to process with AI.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file. Please try pasting the text instead.');
    } finally {
      setIsUploading(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          username: profile.username,
          headline: profile.headline,
          about_me: profile.about_me,
          linkedin_url: profile.linkedin_url,
          portfolio_url: profile.portfolio_url,
          github_url: profile.github_url,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setSuccess('Profile saved successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleParseResume = async () => {
    if (!resumeText.trim()) {
      setError('Please paste your resume text first');
      return;
    }

    if (!resumeName.trim() && selectedResumeId === 'new') {
      setError('Please enter a name for this resume');
      return;
    }

    // Check max resumes limit for new resumes
    if (selectedResumeId === 'new' && resumes.length >= MAX_RESUMES) {
      setError(`You can only have up to ${MAX_RESUMES} resumes. Please delete one to add another.`);
      return;
    }

    setIsParsing(true);
    setError('');

    try {
      const response = await fetch('/api/parse-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText }),
      });

      if (!response.ok) {
        throw new Error('Failed to parse resume');
      }

      const { parsedData } = await response.json();

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      if (selectedResumeId === 'new') {
        // Create new resume
        const { data: newResume, error: insertError } = await supabase
          .from('resumes')
          .insert({
            user_id: user.id,
            name: resumeName,
            tag: resumeTag || null,
            raw_text: resumeText,
            parsed_data: parsedData,
            is_primary: resumes.length === 0, // First resume is primary
          })
          .select()
          .single();

        if (insertError) throw insertError;

        setResumes(prev => [newResume, ...prev]);
        setSelectedResumeId(newResume.id);
        setCurrentResume(newResume);
      } else {
        // Update existing resume
        const { error: updateError } = await supabase
          .from('resumes')
          .update({
            name: resumeName,
            tag: resumeTag || null,
            raw_text: resumeText,
            parsed_data: parsedData,
          })
          .eq('id', selectedResumeId);

        if (updateError) throw updateError;

        setResumes(prev =>
          prev.map(r =>
            r.id === selectedResumeId
              ? { ...r, name: resumeName, tag: resumeTag || undefined, raw_text: resumeText, parsed_data: parsedData }
              : r
          )
        );
        setCurrentResume(prev => prev ? { ...prev, parsed_data: parsedData, tag: resumeTag || undefined } : null);
      }

      setSuccess('Resume saved and parsed successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse resume');
    } finally {
      setIsParsing(false);
    }
  };

  const handleSetPrimary = async (resumeId: string) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      // Set all resumes to non-primary
      await supabase
        .from('resumes')
        .update({ is_primary: false })
        .eq('user_id', user.id);

      // Set selected resume as primary
      await supabase
        .from('resumes')
        .update({ is_primary: true })
        .eq('id', resumeId);

      setResumes(prev =>
        prev.map(r => ({ ...r, is_primary: r.id === resumeId }))
      );

      setSuccess('Primary resume updated!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update primary resume');
    }
  };

  const handleDeleteResume = async (resumeId: string) => {
    if (!confirm('Are you sure you want to delete this resume?')) return;

    setIsDeleting(true);
    try {
      const supabase = createClient();

      const { error: deleteError } = await supabase
        .from('resumes')
        .delete()
        .eq('id', resumeId);

      if (deleteError) throw deleteError;

      const updatedResumes = resumes.filter(r => r.id !== resumeId);
      setResumes(updatedResumes);

      // If we deleted the selected resume, select new or first available
      if (selectedResumeId === resumeId) {
        if (updatedResumes.length > 0) {
          handleResumeSelect(updatedResumes[0].id);
        } else {
          handleResumeSelect('new');
        }
      }

      setSuccess('Resume deleted successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete resume');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const parsedData = currentResume?.parsed_data as ParsedResume | undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
          <CardDescription>
            This information is used to personalize your landing pages.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg bg-green-50 p-3 text-sm text-green-600">
                {success}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Full Name"
                value={profile.full_name || ''}
                onChange={(e) =>
                  setProfile((prev) => ({ ...prev, full_name: e.target.value }))
                }
                required
              />

              <Input
                label="Username"
                value={profile.username || ''}
                onChange={(e) =>
                  setProfile((prev) => ({ ...prev, username: e.target.value }))
                }
                helperText="Your pages will be at signalpage.com/username"
                required
              />
            </div>

            <Input
              label="Professional Headline"
              value={profile.headline || ''}
              onChange={(e) =>
                setProfile((prev) => ({ ...prev, headline: e.target.value }))
              }
              placeholder="e.g., Senior Data Engineer | Azure & Databricks Expert"
            />

            <Textarea
              label="About Me"
              value={profile.about_me || ''}
              onChange={(e) =>
                setProfile((prev) => ({ ...prev, about_me: e.target.value }))
              }
              placeholder="A brief summary of your background and what you're looking for..."
              className="min-h-[100px]"
            />

            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="LinkedIn URL"
                type="url"
                value={profile.linkedin_url || ''}
                onChange={(e) =>
                  setProfile((prev) => ({ ...prev, linkedin_url: e.target.value }))
                }
                placeholder="https://linkedin.com/in/..."
              />

              <Input
                label="Portfolio URL"
                type="url"
                value={profile.portfolio_url || ''}
                onChange={(e) =>
                  setProfile((prev) => ({ ...prev, portfolio_url: e.target.value }))
                }
                placeholder="https://..."
              />

              <Input
                label="GitHub URL"
                type="url"
                value={profile.github_url || ''}
                onChange={(e) =>
                  setProfile((prev) => ({ ...prev, github_url: e.target.value }))
                }
                placeholder="https://github.com/..."
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="primary" isLoading={isSaving}>
                Save Profile
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Resume Section */}
      <Card>
        <CardHeader>
          <CardTitle>Your Resumes ({resumes.length}/{MAX_RESUMES})</CardTitle>
          <CardDescription>
            Manage up to {MAX_RESUMES} resumes for different types of roles. Tag each resume
            to easily identify them. The primary resume is used by default when generating new pages.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Resume Selector */}
          <div className="flex flex-wrap gap-2">
            {resumes.length < MAX_RESUMES && (
              <button
                onClick={() => handleResumeSelect('new')}
                className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                  selectedResumeId === 'new'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                + New Resume
              </button>
            )}
            {resumes.map((resume) => (
              <button
                key={resume.id}
                onClick={() => handleResumeSelect(resume.id)}
                className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                  selectedResumeId === resume.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {resume.name || 'Untitled Resume'}
                  {resume.tag && (
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                      {RESUME_TAGS.find(t => t.value === resume.tag)?.label || resume.tag}
                    </span>
                  )}
                  {resume.is_primary && (
                    <span className="text-xs text-green-600">(Primary)</span>
                  )}
                </span>
              </button>
            ))}
          </div>

          {/* Resume Name and Tag */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Resume Name"
              value={resumeName}
              onChange={(e) => setResumeName(e.target.value)}
              placeholder="e.g., Technical Resume, Management Resume"
            />
            <Select
              label="Resume Tag"
              value={resumeTag}
              onChange={(e) => setResumeTag(e.target.value)}
              options={[{ value: '', label: 'Select a tag...' }, ...RESUME_TAGS.map(t => ({ value: t.value, label: t.label }))]}
              helperText="Categorize your resume by role type"
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Upload Resume
            </label>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileUpload}
                className="hidden"
                id="resume-upload"
              />
              <label
                htmlFor="resume-upload"
                className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 ${
                  isUploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isUploading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Upload File
                  </>
                )}
              </label>
              <span className="text-sm text-gray-500">
                PDF, DOC, DOCX, or TXT (max 5MB)
              </span>
            </div>
          </div>

          {/* Resume Text */}
          <Textarea
            key={selectedResumeId}
            label="Resume Text"
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Paste your resume content here or upload a file above..."
            className="min-h-[300px] font-mono text-sm"
          />

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm text-gray-500">
              {parsedData ? (
                <span className="text-green-600">
                  Parsed: {parsedData.experiences?.length || 0} experiences,{' '}
                  {parsedData.skills?.length || 0} skills detected
                </span>
              ) : (
                <span>Not parsed yet</span>
              )}
            </div>

            <div className="flex gap-2">
              {selectedResumeId !== 'new' && currentResume && (
                <>
                  {!currentResume.is_primary && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetPrimary(currentResume.id)}
                    >
                      Set as Primary
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteResume(currentResume.id)}
                    disabled={isDeleting}
                    className="text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </Button>
                </>
              )}
              <Button
                type="button"
                variant="primary"
                onClick={handleParseResume}
                isLoading={isParsing}
              >
                {selectedResumeId === 'new' ? 'Save & Parse' : 'Update & Parse'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Section */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription & Billing</CardTitle>
          <CardDescription>
            Manage your subscription and billing details.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {subscription ? (
            <div className="space-y-6">
              {/* Current Plan */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {subscription.isFreeUser ? 'Free (Unlimited)' :
                       subscription.tier === 'free' ? 'Free Plan' :
                       subscription.tier === 'coach' ? 'Interview Coach' : 'Pro Plan'}
                    </span>
                    {subscription.isFreeUser && (
                      <Badge variant="success">Special Access</Badge>
                    )}
                    {subscription.tier !== 'free' && !subscription.isFreeUser && (
                      <Badge variant="success">Active</Badge>
                    )}
                    {subscription.stripeDetails?.cancelAtPeriodEnd && (
                      <Badge variant="warning">Cancels Soon</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {subscription.isFreeUser ? (
                      'You have unlimited access to all features'
                    ) : subscription.tier === 'free' ? (
                      `${subscription.currentPageCount} of ${subscription.maxPages} pages used`
                    ) : subscription.tier === 'coach' ? (
                      'Unlimited Signal Pages + AI Interview Coach'
                    ) : (
                      'Unlimited Signal Pages'
                    )}
                  </p>
                </div>
                <div>
                  {subscription.tier !== 'free' && !subscription.isFreeUser && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleManageBilling}
                      isLoading={isLoadingPortal}
                    >
                      Manage Billing
                    </Button>
                  )}
                </div>
              </div>

              {/* Stripe Billing Details */}
              {subscription.stripeDetails && (
                <div className="grid gap-4 sm:grid-cols-3">
                  {/* Next Billing Date */}
                  <div className="p-4 rounded-lg border border-gray-200">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {subscription.stripeDetails.cancelAtPeriodEnd ? 'Access Until' : 'Next Billing Date'}
                    </div>
                    <div className="mt-1 text-lg font-semibold text-gray-900">
                      {new Date(subscription.stripeDetails.currentPeriodEnd * 1000).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </div>

                  {/* Current Price */}
                  <div className="p-4 rounded-lg border border-gray-200">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Current Price
                    </div>
                    <div className="mt-1 text-lg font-semibold text-gray-900">
                      ${subscription.stripeDetails.price}
                      <span className="text-sm font-normal text-gray-500">
                        /{subscription.stripeDetails.billingPeriod === 'quarterly' ? 'quarter' : 'month'}
                      </span>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="p-4 rounded-lg border border-gray-200">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Payment Method
                    </div>
                    {subscription.stripeDetails.paymentMethod ? (
                      <div className="mt-1 text-lg font-semibold text-gray-900 capitalize">
                        {subscription.stripeDetails.paymentMethod.brand} ****{subscription.stripeDetails.paymentMethod.last4}
                      </div>
                    ) : (
                      <div className="mt-1 text-sm text-gray-500">Not available</div>
                    )}
                  </div>
                </div>
              )}

              {/* Cancellation Notice */}
              {subscription.stripeDetails?.cancelAtPeriodEnd && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                  <h4 className="font-medium text-yellow-900">Subscription Ending</h4>
                  <p className="mt-1 text-sm text-yellow-700">
                    Your subscription will end on{' '}
                    {new Date(subscription.stripeDetails.currentPeriodEnd * 1000).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                    . Click &quot;Manage Billing&quot; to renew.
                  </p>
                </div>
              )}

              {/* Upgrade CTA for free users */}
              {subscription.tier === 'free' && !subscription.isFreeUser && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <h4 className="font-medium text-blue-900">Upgrade to Pro</h4>
                  <p className="mt-1 text-sm text-blue-700">
                    Get unlimited Signal Pages and stand out in every application.
                  </p>
                  <div className="mt-4">
                    <Link href="/pricing">
                      <Button variant="primary" size="sm">
                        View Pricing
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Settings Section */}
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>
            Choose which email notifications you want to receive about your SignalPages.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {notificationError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {notificationError}
            </div>
          )}
          {notificationSuccess && (
            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-600">
              {notificationSuccess}
            </div>
          )}

          {/* Weekly Digest */}
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Weekly Analytics Digest</h4>
                <p className="text-sm text-gray-500">
                  Get a summary of views, visitors, and engagement across all your pages.
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={notificationSettings.email_weekly_digest}
                  onChange={(e) =>
                    setNotificationSettings((prev) => ({
                      ...prev,
                      email_weekly_digest: e.target.checked,
                    }))
                  }
                  className="peer sr-only"
                />
                <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:ring-2 peer-focus:ring-blue-300" />
              </label>
            </div>

            {notificationSettings.email_weekly_digest && (
              <div className="ml-0 pl-4 border-l-2 border-gray-100">
                <Select
                  label="Send digest on"
                  value={notificationSettings.digest_day}
                  onChange={(e) =>
                    setNotificationSettings((prev) => ({
                      ...prev,
                      digest_day: e.target.value,
                    }))
                  }
                  options={[
                    { value: 'monday', label: 'Monday' },
                    { value: 'tuesday', label: 'Tuesday' },
                    { value: 'wednesday', label: 'Wednesday' },
                    { value: 'thursday', label: 'Thursday' },
                    { value: 'friday', label: 'Friday' },
                    { value: 'saturday', label: 'Saturday' },
                    { value: 'sunday', label: 'Sunday' },
                  ]}
                />
              </div>
            )}
          </div>

          <hr className="border-gray-100" />

          {/* Real-time Notifications */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Real-time Alerts</h4>

            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-gray-700">Return Visitors</p>
                <p className="text-sm text-gray-500">
                  When someone views your page more than once.
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={notificationSettings.email_on_return_visitor}
                  onChange={(e) =>
                    setNotificationSettings((prev) => ({
                      ...prev,
                      email_on_return_visitor: e.target.checked,
                    }))
                  }
                  className="peer sr-only"
                />
                <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:ring-2 peer-focus:ring-blue-300" />
              </label>
            </div>

            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-gray-700">High Engagement</p>
                <p className="text-sm text-gray-500">
                  When someone spends 2+ minutes on your page.
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={notificationSettings.email_on_high_engagement}
                  onChange={(e) =>
                    setNotificationSettings((prev) => ({
                      ...prev,
                      email_on_high_engagement: e.target.checked,
                    }))
                  }
                  className="peer sr-only"
                />
                <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:ring-2 peer-focus:ring-blue-300" />
              </label>
            </div>

            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-gray-700">Every Page View</p>
                <p className="text-sm text-gray-500">
                  Get notified for every view (can be noisy).
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={notificationSettings.email_on_page_view}
                  onChange={(e) =>
                    setNotificationSettings((prev) => ({
                      ...prev,
                      email_on_page_view: e.target.checked,
                    }))
                  }
                  className="peer sr-only"
                />
                <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:ring-2 peer-focus:ring-blue-300" />
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              type="button"
              variant="primary"
              onClick={saveNotificationSettings}
              isLoading={isSavingNotifications}
            >
              Save Notification Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change Password Section */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Update your account password.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    setIsChangingPassword(true);

    try {
      const supabase = createClient();

      // First verify current password by re-authenticating
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('No user email found');

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setPasswordSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <form onSubmit={handleChangePassword} className="space-y-4">
      {passwordError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {passwordError}
        </div>
      )}
      {passwordSuccess && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-600">
          {passwordSuccess}
        </div>
      )}

      <Input
        label="Current Password"
        type="password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        required
      />

      <Input
        label="New Password"
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        required
      />

      <Input
        label="Confirm New Password"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
      />

      <div className="flex justify-end">
        <Button type="submit" variant="primary" isLoading={isChangingPassword}>
          Change Password
        </Button>
      </div>
    </form>
  );
}
