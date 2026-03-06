'use client';

import { useState, useEffect, useRef } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';

interface InterviewerModelPracticeProps {
  jobId: string;
  hasAccess: boolean;
}

interface InterviewerInput {
  name: string;
  linkedinPaste: string;
  currentRole: string;
  company: string;
  photoUrl: string;
}

interface Briefing {
  meta: {
    generated_at: string;
    candidate_name: string;
    target_role: string;
    target_company: string;
    model_confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  };
  interviewer_models: Array<{
    name: string;
    current_role: string;
    company: string;
    career_archetype: { label: string; description: string };
    thinking_style: { what_impresses_them: string; what_concerns_them: string };
    communication_style: { language_patterns: string[] };
    interview_behavior_model: { hiring_lens: string };
  }>;
  predicted_questions: Array<{
    question: string;
    category: string;
    what_theyre_really_assessing: string;
  }>;
}

interface PracticeSession {
  sessionId: string;
  interviewer: { name: string; role: string; company: string };
  config: { mode: string; difficulty: string };
}

interface Message {
  role: 'interviewer' | 'candidate';
  content: string;
  emotionalTone?: string;
  turnNumber?: number;
}

interface Debrief {
  overall_performance: {
    score: number;
    hiring_decision: string;
    one_line_summary: string;
  };
  strengths: Array<{ strength: string; evidence: string }>;
  improvement_areas: Array<{ area: string; better_approach: string }>;
  next_session_focus: string;
}

type Mode = 'full_interview' | 'rapid_fire' | 'stress_test' | 'rapport_only';
type Difficulty = 'friendly' | 'neutral' | 'tough';
type Step = 'add_interviewer' | 'view_model' | 'practice' | 'debrief';

const MODE_INFO: Record<Mode, { label: string; description: string; turns: string }> = {
  full_interview: { label: 'Full Interview', description: 'Complete simulation from opening to close', turns: '~20 turns' },
  rapid_fire: { label: 'Rapid Fire', description: 'Quick-fire questions, minimal rapport', turns: '8-12 turns' },
  stress_test: { label: 'Stress Test', description: 'Hardest version — probes gaps, challenges claims', turns: '10-15 turns' },
  rapport_only: { label: 'Rapport Only', description: 'First 5 minutes — opening, small talk, transition', turns: '3-5 turns' },
};

const DIFFICULTY_INFO: Record<Difficulty, { label: string; description: string }> = {
  friendly: { label: 'Friendly', description: 'Warm and supportive' },
  neutral: { label: 'Neutral', description: 'Professional and fair' },
  tough: { label: 'Tough', description: 'Skeptical and probing' },
};

export function InterviewerModelPractice({ jobId, hasAccess }: InterviewerModelPracticeProps) {
  const [step, setStep] = useState<Step>('add_interviewer');
  const [jobData, setJobData] = useState<{ resume: string; jobDescription: string } | null>(null);
  const [isLoadingJob, setIsLoadingJob] = useState(true);
  const [interviewer, setInterviewer] = useState<InterviewerInput>({
    name: '',
    linkedinPaste: '',
    currentRole: '',
    company: '',
    photoUrl: '',
  });
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [debrief, setDebrief] = useState<Debrief | null>(null);
  const [candidateInput, setCandidateInput] = useState('');
  const [mode, setMode] = useState<Mode>('full_interview');
  const [difficulty, setDifficulty] = useState<Difficulty>('neutral');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isDebriefing, setIsDebriefing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<'active' | 'completed'>('active');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch job data and existing interviewer model on mount
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch job data
        const jobResponse = await fetch(`/api/jobs/${jobId}`);
        if (jobResponse.ok) {
          const data = await jobResponse.json();
          setJobData({
            resume: data.resume_text || '',
            jobDescription: data.job_description || '',
          });
        }

        // Check for existing interviewer model
        const modelResponse = await fetch(`/api/interviewer-model/generate?jobId=${jobId}`);
        if (modelResponse.ok) {
          const modelData = await modelResponse.json();
          if (modelData.status === 'completed' && modelData.briefing) {
            setBriefing(modelData.briefing);
            setStep('view_model');
            // Try to extract interviewer info from briefing
            const firstInterviewer = modelData.briefing.interviewer_models?.[0];
            if (firstInterviewer) {
              setInterviewer(prev => ({
                ...prev,
                name: firstInterviewer.name || '',
                currentRole: firstInterviewer.current_role || '',
                company: firstInterviewer.company || '',
              }));
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setIsLoadingJob(false);
      }
    }
    fetchData();
  }, [jobId]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const generateModel = async () => {
    if (!interviewer.name || !interviewer.linkedinPaste) {
      setError('Please provide at least a name and LinkedIn profile');
      return;
    }

    if (!jobData) {
      setError('Job data not loaded. Please refresh and try again.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Trigger generation
      const response = await fetch('/api/interviewer-model/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          resume: jobData.resume,
          jobDescription: jobData.jobDescription,
          interviewers: [{
            name: interviewer.name,
            linkedinPaste: interviewer.linkedinPaste,
            currentRole: interviewer.currentRole,
            company: interviewer.company,
          }],
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate model');
      }

      const data = await response.json();

      // If already completed, use the result
      if (data.status === 'completed' && data.briefing) {
        setBriefing(data.briefing);
        setStep('view_model');
        setIsGenerating(false);
        return;
      }

      // Poll for completion
      const pollForCompletion = async () => {
        const maxAttempts = 60; // 60 seconds max
        let attempts = 0;

        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          attempts++;

          const statusResponse = await fetch(`/api/interviewer-model/generate?jobId=${jobId}`);
          const statusData = await statusResponse.json();

          if (statusData.status === 'completed' && statusData.briefing) {
            setBriefing(statusData.briefing);
            setStep('view_model');
            return;
          }

          if (statusData.status === 'failed') {
            throw new Error(statusData.errorMessage || 'Generation failed');
          }
        }

        throw new Error('Generation timed out');
      };

      await pollForCompletion();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate interviewer model');
    } finally {
      setIsGenerating(false);
    }
  };

  const startPractice = async () => {
    if (!briefing) return;

    setIsStarting(true);
    setError(null);

    try {
      const response = await fetch('/api/interviewer-model/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          briefing,
          mode,
          difficulty,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start practice');
      }

      const data = await response.json();
      setSession({
        sessionId: data.sessionId,
        interviewer: data.interviewer,
        config: data.config,
      });
      setMessages([{
        role: 'interviewer',
        content: data.turn.dialogue,
        emotionalTone: data.turn.emotionalTone,
        turnNumber: data.turn.turnNumber,
      }]);
      setSessionStatus('active');
      setStep('practice');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start practice session');
    } finally {
      setIsStarting(false);
    }
  };

  const sendMessage = async () => {
    if (!session || !candidateInput.trim() || isSending) return;

    const userMessage = candidateInput.trim();
    setCandidateInput('');
    setIsSending(true);
    setError(null);

    // Add candidate message immediately
    setMessages(prev => [...prev, { role: 'candidate', content: userMessage }]);

    try {
      const response = await fetch('/api/interviewer-model/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'respond',
          sessionId: session.sessionId,
          message: userMessage,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send message');
      }

      const data = await response.json();
      setMessages(prev => [...prev, {
        role: 'interviewer',
        content: data.turn.dialogue,
        emotionalTone: data.turn.emotionalTone,
        turnNumber: data.turn.turnNumber,
      }]);

      if (data.sessionStatus === 'completed') {
        setSessionStatus('completed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const endAndDebrief = async () => {
    if (!session) return;

    setIsDebriefing(true);
    setError(null);

    try {
      const response = await fetch('/api/interviewer-model/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'debrief',
          sessionId: session.sessionId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate debrief');
      }

      const data = await response.json();
      setDebrief(data.debrief);
      setStep('debrief');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate debrief');
    } finally {
      setIsDebriefing(false);
    }
  };

  const resetAll = () => {
    setStep('add_interviewer');
    setBriefing(null);
    setSession(null);
    setMessages([]);
    setDebrief(null);
    setSessionStatus('active');
    setError(null);
  };

  const startNewSession = () => {
    setSession(null);
    setMessages([]);
    setDebrief(null);
    setSessionStatus('active');
    setStep('view_model');
  };

  if (!hasAccess) {
    return (
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
        <CardContent className="py-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
            <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900">Practice with Your Interviewer</h3>
          <p className="mb-4 text-sm text-gray-600">
            Build an AI model of your actual interviewer and practice with a persona that thinks like them.
          </p>
          <a href="/pricing">
            <Button variant="primary" className="bg-gradient-to-r from-purple-600 to-indigo-600">
              Upgrade to Access
            </Button>
          </a>
        </CardContent>
      </Card>
    );
  }

  // Loading job data
  if (isLoadingJob) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
          <p className="text-sm text-gray-500">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  // Step 1: Add Interviewer
  if (step === 'add_interviewer') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Practice with Your Interviewer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-gray-600">
            Build an AI model of your interviewer from their LinkedIn profile. Then practice with a persona that thinks, speaks, and evaluates like them.
          </p>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Interviewer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={interviewer.name}
                  onChange={(e) => setInterviewer(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Jane Smith"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Company</label>
                <input
                  type="text"
                  value={interviewer.company}
                  onChange={(e) => setInterviewer(prev => ({ ...prev, company: e.target.value }))}
                  placeholder="TechCorp"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Current Role</label>
              <input
                type="text"
                value={interviewer.currentRole}
                onChange={(e) => setInterviewer(prev => ({ ...prev, currentRole: e.target.value }))}
                placeholder="VP of Engineering"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                LinkedIn Profile <span className="text-red-500">*</span>
              </label>
              <p className="mb-2 text-xs text-gray-500">
                Go to their LinkedIn profile, select all (Cmd+A / Ctrl+A), copy (Cmd+C / Ctrl+C), and paste below.
              </p>
              <textarea
                value={interviewer.linkedinPaste}
                onChange={(e) => setInterviewer(prev => ({ ...prev, linkedinPaste: e.target.value }))}
                placeholder="Paste the full LinkedIn profile content here..."
                rows={6}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Photo URL <span className="text-gray-400 text-xs font-normal">(optional, for avatar)</span>
              </label>
              <input
                type="url"
                value={interviewer.photoUrl}
                onChange={(e) => setInterviewer(prev => ({ ...prev, photoUrl: e.target.value }))}
                placeholder="https://..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <Button
            variant="primary"
            onClick={generateModel}
            isLoading={isGenerating}
            disabled={isGenerating || !interviewer.name || !interviewer.linkedinPaste}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600"
          >
            {isGenerating ? 'Building Interviewer Model...' : 'Build Interviewer Model'}
          </Button>

          <p className="text-xs text-center text-gray-500">
            This typically takes 30-60 seconds
          </p>
        </CardContent>
      </Card>
    );
  }

  // Step 2: View Model
  if (step === 'view_model' && briefing) {
    const model = briefing.interviewer_models[0];

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-700 font-semibold">
                  {model.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="text-lg">{model.name}</div>
                  <div className="text-sm font-normal text-gray-500">{model.current_role} at {model.company}</div>
                </div>
              </CardTitle>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                briefing.meta.model_confidence === 'HIGH' ? 'bg-green-100 text-green-700' :
                briefing.meta.model_confidence === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {briefing.meta.model_confidence} Confidence
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-purple-50 p-4">
              <h4 className="text-sm font-medium text-purple-800 mb-1">{model.career_archetype.label}</h4>
              <p className="text-sm text-purple-700">{model.career_archetype.description}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-green-50 p-3">
                <h4 className="text-xs font-medium text-green-800 mb-1">What Impresses Them</h4>
                <p className="text-sm text-green-700">{model.thinking_style.what_impresses_them}</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-3">
                <h4 className="text-xs font-medium text-amber-800 mb-1">What Concerns Them</h4>
                <p className="text-sm text-amber-700">{model.thinking_style.what_concerns_them}</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Their Core Hiring Question</h4>
              <p className="text-sm text-gray-600 italic bg-gray-50 p-3 rounded-lg">
                &ldquo;{model.interview_behavior_model.hiring_lens}&rdquo;
              </p>
            </div>

            {model.communication_style.language_patterns.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Mirror This Language</h4>
                <div className="flex flex-wrap gap-2">
                  {model.communication_style.language_patterns.slice(0, 6).map((pattern, i) => (
                    <span key={i} className="rounded-full bg-blue-100 px-2.5 py-1 text-xs text-blue-700">
                      {pattern}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Predicted Questions Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Predicted Questions ({briefing.predicted_questions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {briefing.predicted_questions.slice(0, 5).map((q, i) => (
                <div key={i} className="rounded-lg border border-gray-200 p-3">
                  <p className="text-sm font-medium text-gray-900">{q.question}</p>
                  <p className="mt-1 text-xs text-gray-500">{q.what_theyre_really_assessing}</p>
                </div>
              ))}
              {briefing.predicted_questions.length > 5 && (
                <p className="text-sm text-gray-500 text-center">
                  + {briefing.predicted_questions.length - 5} more questions
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Practice Options */}
        <Card>
          <CardHeader>
            <CardTitle>Start Practice Session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Practice Mode</label>
              <div className="grid gap-3 sm:grid-cols-2">
                {(Object.keys(MODE_INFO) as Mode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`rounded-lg border-2 p-3 text-left transition-colors ${
                      mode === m
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-900">{MODE_INFO[m].label}</div>
                    <div className="mt-0.5 text-xs text-gray-500">{MODE_INFO[m].description}</div>
                    <div className="mt-1 text-xs text-purple-600">{MODE_INFO[m].turns}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Difficulty</label>
              <div className="flex gap-3">
                {(Object.keys(DIFFICULTY_INFO) as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 rounded-lg border-2 px-4 py-2 text-center transition-colors ${
                      difficulty === d
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-900">{DIFFICULTY_INFO[d].label}</div>
                    <div className="text-xs text-gray-500">{DIFFICULTY_INFO[d].description}</div>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={resetAll}>
                Change Interviewer
              </Button>
              <Button
                variant="primary"
                onClick={startPractice}
                isLoading={isStarting}
                disabled={isStarting}
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600"
              >
                {isStarting ? 'Starting...' : 'Start Practice'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 3: Practice Session
  if (step === 'practice' && session) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-700 font-semibold">
                  {session.interviewer.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{session.interviewer.name}</div>
                  <div className="text-xs text-gray-500">{session.config.mode.replace('_', ' ')} • {session.config.difficulty}</div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={endAndDebrief}
                isLoading={isDebriefing}
                disabled={isDebriefing || messages.length < 2}
              >
                {isDebriefing ? 'Generating Debrief...' : 'End & Get Debrief'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Messages */}
        <Card className="min-h-[400px] flex flex-col">
          <CardContent className="flex-1 overflow-y-auto py-4">
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'candidate' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${
                      msg.role === 'candidate'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    {msg.emotionalTone && msg.role === 'interviewer' && (
                      <p className="mt-1 text-xs opacity-70 capitalize">{msg.emotionalTone}</p>
                    )}
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </CardContent>

          {/* Input */}
          <div className="border-t border-gray-200 p-4">
            {sessionStatus === 'completed' ? (
              <div className="text-center py-2">
                <p className="text-sm text-gray-600 mb-3">Interview completed</p>
                <Button
                  variant="primary"
                  onClick={endAndDebrief}
                  isLoading={isDebriefing}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600"
                >
                  Get Your Debrief
                </Button>
              </div>
            ) : (
              <div className="flex gap-3">
                <input
                  type="text"
                  value={candidateInput}
                  onChange={(e) => setCandidateInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Type your response..."
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  disabled={isSending}
                />
                <Button
                  variant="primary"
                  onClick={sendMessage}
                  disabled={isSending || !candidateInput.trim()}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600"
                >
                  Send
                </Button>
              </div>
            )}
          </div>
        </Card>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
      </div>
    );
  }

  // Step 4: Debrief
  if (step === 'debrief' && debrief) {
    return (
      <div className="space-y-6">
        {/* Overall Score */}
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Performance Debrief</h3>
                <p className="mt-1 text-sm text-gray-600">{debrief.overall_performance.one_line_summary}</p>
              </div>
              <div className="text-center">
                <div className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold ${
                  debrief.overall_performance.score >= 8 ? 'bg-green-100 text-green-700' :
                  debrief.overall_performance.score >= 6 ? 'bg-blue-100 text-blue-700' :
                  debrief.overall_performance.score >= 4 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {debrief.overall_performance.score}
                </div>
                <p className={`mt-1 text-xs font-medium ${
                  debrief.overall_performance.hiring_decision.includes('YES') ? 'text-green-600' : 'text-red-600'
                }`}>
                  {debrief.overall_performance.hiring_decision.replace('_', ' ')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Strengths */}
        <Card>
          <CardHeader>
            <CardTitle className="text-green-700">Strengths</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {debrief.strengths.map((s, i) => (
                <div key={i} className="rounded-lg bg-green-50 p-3">
                  <p className="text-sm font-medium text-green-800">{s.strength}</p>
                  <p className="mt-1 text-xs text-green-700">{s.evidence}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Improvement Areas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-amber-700">Areas for Improvement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {debrief.improvement_areas.map((a, i) => (
                <div key={i} className="rounded-lg bg-amber-50 p-3">
                  <p className="text-sm font-medium text-amber-800">{a.area}</p>
                  <p className="mt-1 text-xs text-amber-700">{a.better_approach}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Next Focus */}
        <Card>
          <CardContent className="py-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Focus for Next Session</h4>
            <p className="text-sm text-gray-600 bg-purple-50 p-3 rounded-lg">{debrief.next_session_focus}</p>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={resetAll} className="flex-1">
            New Interviewer
          </Button>
          <Button
            variant="primary"
            onClick={startNewSession}
            className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600"
          >
            Practice Again
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
