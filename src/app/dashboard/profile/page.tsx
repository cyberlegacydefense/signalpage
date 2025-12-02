'use client';

import { useState, useEffect, useRef } from 'react';
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
} from '@/components/ui';
import type { User, Resume, ParsedResume } from '@/types';
import { RESUME_TAGS } from '@/types';

const MAX_RESUMES = 5;

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [profile, setProfile] = useState<Partial<User>>({});
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string | 'new'>('new');
  const [resumeName, setResumeName] = useState('');
  const [resumeTag, setResumeTag] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [currentResume, setCurrentResume] = useState<Resume | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

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
    </div>
  );
}
