'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@/components/ui';
import { hasProAccess } from '@/lib/stripe';
import type { CareerNarrative, CareerAsset, ApplicationBrain, UserCareerSettings } from '@/types';

type TabType = 'narrative' | 'vault' | 'brain' | 'settings';

export default function CareerIntelligencePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('narrative');

  // Data states
  const [narrative, setNarrative] = useState<CareerNarrative | null>(null);
  const [assets, setAssets] = useState<CareerAsset[]>([]);
  const [brainSnapshots, setBrainSnapshots] = useState<ApplicationBrain[]>([]);
  const [settings, setSettings] = useState<UserCareerSettings | null>(null);

  // Action states
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Check subscription
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .single();

      const access = hasProAccess(profile?.subscription_tier || 'free');
      setHasAccess(access);

      if (!access) {
        setIsLoading(false);
        return;
      }

      // Fetch career intelligence data
      try {
        const response = await fetch('/api/career-intelligence');
        if (response.ok) {
          const data = await response.json();
          setNarrative(data.narrative);
          setAssets(data.assets || []);
          setBrainSnapshots(data.brainSnapshots || []);
          setSettings(data.settings);
        }
      } catch (error) {
        console.error('Failed to load career intelligence:', error);
      }

      setIsLoading(false);
    }

    loadData();
  }, [router]);

  const handleExtractFromResume = async () => {
    setIsExtracting(true);
    try {
      const response = await fetch('/api/career-intelligence/extract-from-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.narrative) {
          setNarrative(data.narrative);
        }
        if (data.assets) {
          setAssets((prev) => [...data.assets, ...prev]);
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to extract from resume');
      }
    } catch (error) {
      console.error('Extraction error:', error);
      alert('Failed to extract from resume');
    }
    setIsExtracting(false);
  };

  const handleSaveSettings = async (newSettings: Partial<UserCareerSettings>) => {
    setIsSavingSettings(true);
    try {
      const response = await fetch('/api/career-intelligence/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          ...newSettings,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
    setIsSavingSettings(false);
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm('Are you sure you want to remove this asset?')) return;

    try {
      const response = await fetch(`/api/career-intelligence/assets?id=${assetId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setAssets((prev) => prev.filter((a) => a.id !== assetId));
      }
    } catch (error) {
      console.error('Failed to delete asset:', error);
    }
  };

  const handleGenerateForJob = async (jobId: string) => {
    let response: Response;
    try {
      response = await fetch('/api/career-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
    } catch (fetchError) {
      throw new Error('Request timed out. The generation is taking longer than expected. Please try again.');
    }

    if (!response.ok) {
      // Handle 504 timeout specifically
      if (response.status === 504) {
        throw new Error('Generation timed out. This can happen with complex job descriptions. Please try again.');
      }

      let errorMessage = 'Failed to generate';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch {
        // Response wasn't JSON (e.g., HTML error page)
        errorMessage = `Server error (${response.status}). Please try again.`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();

    // Update state with new data
    if (data.applicationBrain) {
      setBrainSnapshots((prev) => [data.applicationBrain, ...prev]);
    }
    if (data.careerNarrative) {
      setNarrative(data.careerNarrative);
    }
    if (data.careerAssets && data.careerAssets.length > 0) {
      setAssets((prev) => [...data.careerAssets, ...prev]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-sm text-gray-600">Loading Career Intelligence...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">Career Intelligence</h2>
            <p className="mb-6 text-gray-600">
              Unlock your career potential with AI-powered insights, a reusable asset vault,
              and consistent narrative building across all your applications.
            </p>
            <Button variant="primary" onClick={() => router.push('/pricing')}>
              Upgrade to Pro
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Career Intelligence</h1>
        <p className="mt-1 text-sm text-gray-600">
          Build your professional story, manage reusable assets, and track application insights
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'narrative', label: 'Career Narrative', icon: '📖' },
            { id: 'vault', label: 'Asset Vault', icon: '🗄️' },
            { id: 'brain', label: 'Application Brain', icon: '🧠' },
            { id: 'settings', label: 'Settings', icon: '⚙️' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'narrative' && (
        <NarrativeTab
          narrative={narrative}
          onExtract={handleExtractFromResume}
          isExtracting={isExtracting}
        />
      )}

      {activeTab === 'vault' && (
        <VaultTab
          assets={assets}
          onDelete={handleDeleteAsset}
          onExtract={handleExtractFromResume}
          isExtracting={isExtracting}
        />
      )}

      {activeTab === 'brain' && (
        <BrainTab snapshots={brainSnapshots} onGenerateForJob={handleGenerateForJob} />
      )}

      {activeTab === 'settings' && (
        <SettingsTab
          settings={settings}
          onSave={handleSaveSettings}
          isSaving={isSavingSettings}
        />
      )}
    </div>
  );
}

// =============================================================================
// NARRATIVE TAB
// =============================================================================

function NarrativeTab({
  narrative,
  onExtract,
  isExtracting,
}: {
  narrative: CareerNarrative | null;
  onExtract: () => void;
  isExtracting: boolean;
}) {
  if (!narrative) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">No Career Narrative Yet</h3>
          <p className="mb-6 text-sm text-gray-600">
            Extract insights from your resume to create your professional story
          </p>
          <Button variant="primary" onClick={onExtract} disabled={isExtracting}>
            {isExtracting ? 'Extracting...' : 'Extract from Resume'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>🎯</span> Core Identity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">{narrative.core_identity || 'Not defined yet'}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>🛤️</span> Career Throughline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">{narrative.career_throughline || 'Not defined yet'}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>📈</span> Impact Emphasis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">{narrative.impact_emphasis || 'Not defined yet'}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>👑</span> Leadership Signals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">{narrative.leadership_signals || 'Not defined yet'}</p>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-gray-400">
        Version {narrative.version} • Last updated {new Date(narrative.updated_at).toLocaleDateString()}
      </p>
    </div>
  );
}

// =============================================================================
// VAULT TAB
// =============================================================================

function VaultTab({
  assets,
  onDelete,
  onExtract,
  isExtracting,
}: {
  assets: CareerAsset[];
  onDelete: (id: string) => void;
  onExtract: () => void;
  isExtracting: boolean;
}) {
  const [filter, setFilter] = useState<string>('all');

  const assetTypeLabels: Record<string, string> = {
    star_story: 'STAR Story',
    technical_explanation: 'Technical',
    leadership_example: 'Leadership',
    failure_story: 'Challenge/Learning',
  };

  const assetTypeIcons: Record<string, string> = {
    star_story: '⭐',
    technical_explanation: '🔧',
    leadership_example: '👑',
    failure_story: '📚',
  };

  const filteredAssets = filter === 'all'
    ? assets
    : assets.filter((a) => a.asset_type === filter);

  return (
    <div>
      {/* Header with actions */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filter === 'all' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All ({assets.length})
          </Button>
          {Object.entries(assetTypeLabels).map(([type, label]) => {
            const count = assets.filter((a) => a.asset_type === type).length;
            return (
              <Button
                key={type}
                variant={filter === type ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilter(type)}
              >
                {label} ({count})
              </Button>
            );
          })}
        </div>
        <Button variant="outline" onClick={onExtract} disabled={isExtracting}>
          {isExtracting ? 'Extracting...' : '+ Extract More'}
        </Button>
      </div>

      {/* Assets Grid */}
      {filteredAssets.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">No assets yet. Extract from your resume to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredAssets.map((asset) => (
            <Card key={asset.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{assetTypeIcons[asset.asset_type]}</span>
                    <CardTitle className="text-base">{asset.title}</CardTitle>
                  </div>
                  <button
                    onClick={() => onDelete(asset.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-sm text-gray-700">{asset.content}</p>

                {asset.source_company && (
                  <p className="mb-2 text-xs text-gray-500">
                    From: {asset.source_role} @ {asset.source_company}
                  </p>
                )}

                {asset.tags && asset.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {asset.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// BRAIN TAB
// =============================================================================

function BrainTab({
  snapshots,
  onGenerateForJob
}: {
  snapshots: ApplicationBrain[];
  onGenerateForJob: (jobId: string) => Promise<void>;
}) {
  const [selectedSnapshot, setSelectedSnapshot] = useState<ApplicationBrain | null>(
    snapshots[0] || null
  );
  const [jobs, setJobs] = useState<Array<{ id: string; role_title: string; company_name: string }>>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [generatingJobId, setGeneratingJobId] = useState<string | null>(null);

  // Load jobs that don't have brain snapshots
  useEffect(() => {
    async function loadJobsWithoutInsights() {
      setIsLoadingJobs(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all jobs with signal pages
      const { data: allJobs } = await supabase
        .from('jobs')
        .select('id, role_title, company_name, signal_pages(id)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Filter to jobs that have signal pages but no brain snapshot
      const jobIdsWithSnapshots = new Set(snapshots.map(s => s.job_id));
      const jobsWithPages = (allJobs || []).filter(
        (j: { signal_pages: unknown[] }) => j.signal_pages && j.signal_pages.length > 0
      );
      const jobsNeedingInsights = jobsWithPages.filter(
        (j: { id: string }) => !jobIdsWithSnapshots.has(j.id)
      );

      setJobs(jobsNeedingInsights);
      setIsLoadingJobs(false);
    }

    loadJobsWithoutInsights();
  }, [snapshots]);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGenerate = async (jobId: string) => {
    setGeneratingJobId(jobId);
    setErrorMessage(null);
    try {
      await onGenerateForJob(jobId);
      // Remove from list after successful generation
      setJobs(prev => prev.filter(j => j.id !== jobId));
    } catch (error) {
      console.error('Failed to generate:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Generation timed out. Please try again.');
    }
    setGeneratingJobId(null);
  };

  if (snapshots.length === 0 && jobs.length === 0 && !isLoadingJobs) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <span className="text-3xl">🧠</span>
          </div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">No Application Insights Yet</h3>
          <p className="text-sm text-gray-600">
            Insights will appear here after you create Signal Pages for job applications
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show jobs that need insights generated
  if (snapshots.length === 0 && jobs.length > 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="text-2xl">🧠</span>
            <div>
              <h3 className="font-medium text-gray-900">Generate Insights for Existing Pages</h3>
              <p className="text-sm text-gray-600">
                You have {jobs.length} Signal Page{jobs.length > 1 ? 's' : ''} without Career Intelligence insights
              </p>
            </div>
          </div>
          {errorMessage && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}
          <div className="space-y-3">
            {jobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium text-gray-900">{job.role_title}</p>
                  <p className="text-sm text-gray-500">{job.company_name}</p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleGenerate(job.id)}
                  disabled={generatingJobId !== null}
                >
                  {generatingJobId === job.id ? 'Generating...' : 'Generate Insights'}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Jobs needing insights */}
      {jobs.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">💡</span>
                <p className="text-sm text-amber-800">
                  <strong>{jobs.length}</strong> page{jobs.length > 1 ? 's' : ''} without insights
                </p>
              </div>
              <div className="flex gap-2">
                {jobs.slice(0, 2).map((job) => (
                  <Button
                    key={job.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerate(job.id)}
                    disabled={generatingJobId !== null}
                    className="text-xs"
                  >
                    {generatingJobId === job.id ? 'Generating...' : `${job.company_name}`}
                  </Button>
                ))}
                {jobs.length > 2 && (
                  <span className="text-xs text-amber-700 self-center">+{jobs.length - 2} more</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Snapshot List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Application History</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[500px] overflow-y-auto p-0">
              {snapshots.map((snapshot) => (
                <button
                  key={snapshot.id}
                  onClick={() => setSelectedSnapshot(snapshot)}
                  className={`w-full border-b p-4 text-left transition-colors last:border-b-0 hover:bg-gray-50 ${
                    selectedSnapshot?.id === snapshot.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <p className="font-medium text-gray-900">{snapshot.role_seniority || 'Role Analysis'}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(snapshot.created_at).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

      {/* Snapshot Details */}
      <div className="space-y-4 lg:col-span-2">
        {selectedSnapshot ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Role Expectations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{selectedSnapshot.role_expectations || 'Not analyzed'}</p>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-700">Strengths</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {(selectedSnapshot.strengths || []).map((s, i) => (
                      <li key={i} className="text-sm text-gray-700">• {s}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-amber-700">Gaps to Address</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {(selectedSnapshot.gaps || []).map((g, i) => (
                      <li key={i} className="text-sm text-gray-700">• {g}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Interview Focus Areas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(selectedSnapshot.interview_focus_areas || []).map((area, i) => (
                    <Badge key={i} variant="primary">{area}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-blue-700">Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(selectedSnapshot.recommendations || []).map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="mt-0.5 text-blue-500">→</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-600">Select an application to view insights</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
    </div>
  );
}

// =============================================================================
// SETTINGS TAB
// =============================================================================

function SettingsTab({
  settings,
  onSave,
  isSaving,
}: {
  settings: UserCareerSettings | null;
  onSave: (settings: Partial<UserCareerSettings>) => void;
  isSaving: boolean;
}) {
  const [localSettings, setLocalSettings] = useState({
    auto_generate_on_application: settings?.auto_generate_on_application ?? true,
    auto_extract_from_resume: settings?.auto_extract_from_resume ?? true,
  });

  const handleToggle = (key: keyof typeof localSettings) => {
    const newSettings = { ...localSettings, [key]: !localSettings[key] };
    setLocalSettings(newSettings);
    onSave(newSettings);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Auto-Generation Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Generate on New Application</p>
              <p className="text-sm text-gray-500">
                Automatically analyze each new job application and update insights
              </p>
            </div>
            <button
              onClick={() => handleToggle('auto_generate_on_application')}
              disabled={isSaving}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                localSettings.auto_generate_on_application ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  localSettings.auto_generate_on_application ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Extract from Resume Updates</p>
              <p className="text-sm text-gray-500">
                Automatically extract new assets when you update your resume
              </p>
            </div>
            <button
              onClick={() => handleToggle('auto_extract_from_resume')}
              disabled={isSaving}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                localSettings.auto_extract_from_resume ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  localSettings.auto_extract_from_resume ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-gray-600">
            Your career intelligence data is stored securely and used to improve your interview
            readiness across all applications.
          </p>
          <Button variant="outline" size="sm">
            Export All Data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
