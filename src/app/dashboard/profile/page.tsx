'use client';

import { useState, useEffect } from 'react';
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
} from '@/components/ui';
import type { User, Resume } from '@/types';

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [profile, setProfile] = useState<Partial<User>>({});
  const [resume, setResume] = useState<Partial<Resume>>({});
  const [resumeText, setResumeText] = useState('');

  useEffect(() => {
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

      // Load resume
      const { data: resumeData } = await supabase
        .from('resumes')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .single();

      if (resumeData) {
        setResume(resumeData);
        setResumeText(resumeData.raw_text || '');
      }

      setIsLoading(false);
    }

    loadData();
  }, []);

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

      // Save to database
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      // Upsert resume
      const { error: resumeError } = await supabase
        .from('resumes')
        .upsert({
          id: resume.id || undefined,
          user_id: user.id,
          raw_text: resumeText,
          parsed_data: parsedData,
          is_primary: true,
        });

      if (resumeError) throw resumeError;

      setResume((prev) => ({ ...prev, parsed_data: parsedData }));
      setSuccess('Resume parsed and saved successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse resume');
    } finally {
      setIsParsing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

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
          <CardTitle>Your Resume</CardTitle>
          <CardDescription>
            Paste your resume text below. Our AI will parse it to extract your
            experience, skills, and achievements for use in your landing pages.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Textarea
            label="Resume Text"
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Paste your resume content here (plain text works best)..."
            className="min-h-[300px] font-mono text-sm"
          />

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {resume.parsed_data ? (
                <span className="text-green-600">
                  Resume parsed: {(resume.parsed_data as { experiences?: unknown[] }).experiences?.length || 0} experiences,{' '}
                  {(resume.parsed_data as { skills?: unknown[] }).skills?.length || 0} skills detected
                </span>
              ) : (
                <span>No resume parsed yet</span>
              )}
            </div>

            <Button
              type="button"
              variant="primary"
              onClick={handleParseResume}
              isLoading={isParsing}
            >
              {resume.parsed_data ? 'Re-parse Resume' : 'Parse Resume'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
