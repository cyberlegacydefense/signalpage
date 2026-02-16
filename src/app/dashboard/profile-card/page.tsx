'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
import {
  SuperpowerEditor,
  AvailabilityEditor,
  ProfileCardPreview,
  AvatarUpload,
} from '@/components/profile-card';
import type { Superpower, Availability } from '@/types';

interface ProfileData {
  username: string;
  full_name: string;
  email?: string;
  headline?: string;
  avatar_url?: string;
  linkedin_url?: string;
  portfolio_url?: string;
  github_url?: string;
  calendar_link?: string;
}

export default function ProfileCardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Profile card data
  const [positioningStatement, setPositioningStatement] = useState('');
  const [superpowers, setSuperpowers] = useState<Superpower[]>([]);
  const [availability, setAvailability] = useState<Partial<Availability>>({});
  const [profileCardEnabled, setProfileCardEnabled] = useState(false);

  // Profile data for preview
  const [profile, setProfile] = useState<ProfileData>({
    username: '',
    full_name: '',
  });

  useEffect(() => {
    loadProfileCard();
  }, []);

  async function loadProfileCard() {
    try {
      const response = await fetch('/api/profile-card');
      if (response.ok) {
        const data = await response.json();
        setPositioningStatement(data.profileCard.positioning_statement || '');
        setSuperpowers(data.profileCard.superpowers || []);
        setAvailability(data.profileCard.availability || {});
        setProfileCardEnabled(data.profileCard.profile_card_enabled || false);
        setProfile(data.profile);
      }
    } catch (err) {
      console.error('Failed to load profile card:', err);
      setError('Failed to load profile card data');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGenerate() {
    setIsGenerating(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/profile-card/generate', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate profile card');
      }

      // Update state with generated content
      setPositioningStatement(data.positioning_statement || '');
      setSuperpowers(data.superpowers || []);
      setAvailability(data.availability || {});

      setSuccess('Profile card generated! Review and edit as needed, then save.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate profile card');
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/profile-card', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positioning_statement: positioningStatement,
          superpowers,
          availability,
          profile_card_enabled: profileCardEnabled,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save profile card');
      }

      setSuccess('Profile card saved successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile card');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTogglePublish() {
    const newState = !profileCardEnabled;
    setProfileCardEnabled(newState);

    try {
      const response = await fetch('/api/profile-card', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_card_enabled: newState,
        }),
      });

      if (!response.ok) {
        setProfileCardEnabled(!newState); // Revert
        const data = await response.json();
        throw new Error(data.error || 'Failed to update publish status');
      }

      setSuccess(newState ? 'Profile card is now public!' : 'Profile card is now hidden');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update publish status');
    }
  }

  function handleAvatarUpload(avatarUrl: string) {
    setProfile((prev) => ({ ...prev, avatar_url: avatarUrl }));
    setSuccess('Avatar uploaded successfully!');
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const profileCardUrl = profile.username
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/${profile.username}`
    : null;

  const hasContent = positioningStatement || superpowers.length > 0;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile Card</h1>
          <p className="mt-1 text-gray-600">
            Create your permanent personal page that showcases who you are - beyond any specific job.
          </p>
        </div>
        <Button
          variant={hasContent ? 'outline' : 'primary'}
          onClick={handleGenerate}
          isLoading={isGenerating}
        >
          {isGenerating ? 'Generating...' : hasContent ? 'Regenerate' : 'Generate My Profile Card'}
        </Button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 rounded-lg bg-green-50 p-4 text-sm text-green-600">
          {success}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Editor Column */}
        <div className="space-y-6">
          {/* Publish Status */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">
                    {profileCardEnabled ? 'Published' : 'Not Published'}
                  </h3>
                  {profileCardUrl && profileCardEnabled && (
                    <a
                      href={profileCardUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {profileCardUrl}
                    </a>
                  )}
                  {!profileCardEnabled && (
                    <p className="text-sm text-gray-500">
                      Your profile card is hidden from the public
                    </p>
                  )}
                </div>
                <Button
                  variant={profileCardEnabled ? 'outline' : 'primary'}
                  onClick={handleTogglePublish}
                >
                  {profileCardEnabled ? 'Unpublish' : 'Publish'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Avatar Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Photo</CardTitle>
              <CardDescription>
                Add a professional photo to make your profile more personal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AvatarUpload
                currentAvatarUrl={profile.avatar_url}
                fullName={profile.full_name}
                onUploadComplete={handleAvatarUpload}
              />
            </CardContent>
          </Card>

          {/* Positioning Statement */}
          <Card>
            <CardHeader>
              <CardTitle>Positioning Statement</CardTitle>
              <CardDescription>
                A memorable tagline that captures who you are professionally
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="e.g., Product leader who turns ambiguity into outcomes"
                value={positioningStatement}
                onChange={(e) => setPositioningStatement(e.target.value)}
                className="min-h-[80px]"
              />
              <p className="mt-2 text-right text-xs text-gray-500">
                {positioningStatement.length}/200 characters
              </p>
            </CardContent>
          </Card>

          {/* Superpowers */}
          <Card>
            <CardHeader>
              <CardTitle>Superpowers</CardTitle>
              <CardDescription>
                Your top 3 abilities that set you apart. Each can include proof points and testimonials.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SuperpowerEditor
                superpowers={superpowers}
                onChange={setSuperpowers}
              />
            </CardContent>
          </Card>

          {/* Availability */}
          <Card>
            <CardHeader>
              <CardTitle>Availability</CardTitle>
              <CardDescription>
                Let recruiters know what you&apos;re looking for
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AvailabilityEditor
                availability={availability}
                onChange={setAvailability}
              />
            </CardContent>
          </Card>

          {/* Links Info */}
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-gray-600">
                Social links (LinkedIn, GitHub, Calendar) are managed in your{' '}
                <Link href="/dashboard/profile" className="text-blue-600 hover:underline">
                  Profile settings
                </Link>
              </p>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard/profile"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Edit profile &amp; links →
            </Link>
            <Button
              variant="primary"
              onClick={handleSave}
              isLoading={isSaving}
            >
              Save Changes
            </Button>
          </div>
        </div>

        {/* Preview Column */}
        <div className="lg:sticky lg:top-8 lg:self-start">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Preview</h2>
            {profileCardUrl && (
              <a
                href={profileCardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                View live page →
              </a>
            )}
          </div>
          <ProfileCardPreview
            positioningStatement={positioningStatement}
            superpowers={superpowers}
            availability={availability}
            profile={profile}
          />
        </div>
      </div>
    </div>
  );
}
