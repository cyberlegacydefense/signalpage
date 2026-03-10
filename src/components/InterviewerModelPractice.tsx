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

interface InterviewerModel {
  id: string;
  interviewer_name: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  briefing: Briefing | null;
  error_message: string | null;
  created_at: string;
}

interface ActiveSession {
  id: string;
  interviewer_name: string;
  mode: string;
  difficulty: string;
  messageCount: number;
  updated_at: string;
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
  // New API format
  overall_score?: number;
  hiring_prediction?: string;
  areas_for_improvement?: Array<{ area: string; better_approach?: string; suggestion?: string }>;
  key_moments?: Array<{ turn: number; what_happened: string; impact: string; suggestion?: string }>;
  // Legacy format
  overall_performance?: {
    score: number;
    hiring_decision: string;
    one_line_summary: string;
  };
  strengths?: Array<{ strength: string; evidence?: string }>;
  improvement_areas?: Array<{ area: string; better_approach?: string }>;
  next_session_focus?: string;
  // Raw fallback
  raw_analysis?: string;
}

type Mode = 'full_interview' | 'rapid_fire' | 'stress_test' | 'rapport_only';
type Difficulty = 'friendly' | 'neutral' | 'tough';
type Step = 'list' | 'add_interviewer' | 'view_model' | 'practice' | 'debrief';

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
  const [step, setStep] = useState<Step>('list');
  const [jobData, setJobData] = useState<{ resume: string; jobDescription: string } | null>(null);
  const [isLoadingJob, setIsLoadingJob] = useState(true);

  // List of all interviewers for this job
  const [interviewers, setInterviewers] = useState<InterviewerModel[]>([]);
  const [selectedInterviewer, setSelectedInterviewer] = useState<InterviewerModel | null>(null);

  // Active practice sessions
  const [activeSessions, setActiveSessions] = useState<Map<string, ActiveSession>>(new Map());

  // Form for adding new interviewer
  const [newInterviewer, setNewInterviewer] = useState<InterviewerInput>({
    name: '',
    linkedinPaste: '',
    currentRole: '',
    company: '',
    photoUrl: '',
  });

  // Practice state
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [debrief, setDebrief] = useState<Debrief | null>(null);
  const [candidateInput, setCandidateInput] = useState('');
  const [mode, setMode] = useState<Mode>('full_interview');
  const [difficulty, setDifficulty] = useState<Difficulty>('neutral');

  // Loading states
  const [isGenerating, setIsGenerating] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isDebriefing, setIsDebriefing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<'active' | 'completed'>('active');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch job data, interviewers, and active sessions on mount
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

        // Fetch all interviewers for this job
        await refreshInterviewers();

        // Fetch active practice sessions for this job
        await refreshActiveSessions();
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setIsLoadingJob(false);
      }
    }
    fetchData();
  }, [jobId]);

  // Refresh interviewers list
  const refreshInterviewers = async () => {
    try {
      const response = await fetch(`/api/interviewer-model/generate?jobId=${jobId}`);
      if (response.ok) {
        const data = await response.json();
        setInterviewers(data.interviewers || []);
      }
    } catch (err) {
      console.error('Failed to fetch interviewers:', err);
    }
  };

  // Refresh active practice sessions
  const refreshActiveSessions = async () => {
    try {
      const response = await fetch('/api/interviewer-model/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', jobId, activeOnly: true }),
      });
      if (response.ok) {
        const data = await response.json();
        const sessionsMap = new Map<string, ActiveSession>();
        for (const s of data.sessions || []) {
          if (s.interviewer_name) {
            sessionsMap.set(s.interviewer_name, s);
          }
        }
        setActiveSessions(sessionsMap);
      }
    } catch (err) {
      console.error('Failed to fetch active sessions:', err);
    }
  };

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const generateModel = async () => {
    if (!newInterviewer.name || !newInterviewer.linkedinPaste) {
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
            name: newInterviewer.name,
            linkedinPaste: newInterviewer.linkedinPaste,
            currentRole: newInterviewer.currentRole,
            company: newInterviewer.company,
          }],
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate model');
      }

      const data = await response.json();
      const interviewerName = data.interviewerName || newInterviewer.name;

      // If already completed, refresh and select
      if (data.status === 'completed' && data.briefing) {
        await refreshInterviewers();
        // Find and select the new interviewer
        const response2 = await fetch(`/api/interviewer-model/generate?jobId=${jobId}`);
        const data2 = await response2.json();
        const newModel = data2.interviewers?.find((i: InterviewerModel) => i.interviewer_name === interviewerName);
        if (newModel) {
          setSelectedInterviewer(newModel);
          setStep('view_model');
        } else {
          setStep('list');
        }
        setNewInterviewer({ name: '', linkedinPaste: '', currentRole: '', company: '', photoUrl: '' });
        setIsGenerating(false);
        return;
      }

      // Poll for completion
      const pollForCompletion = async () => {
        const maxAttempts = 60; // 60 seconds max
        let attempts = 0;

        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;

          const statusResponse = await fetch(
            `/api/interviewer-model/generate?jobId=${jobId}&interviewerName=${encodeURIComponent(interviewerName)}`
          );
          const statusData = await statusResponse.json();

          if (statusData.status === 'completed' && statusData.briefing) {
            await refreshInterviewers();
            // Find and select the new interviewer
            const response2 = await fetch(`/api/interviewer-model/generate?jobId=${jobId}`);
            const data2 = await response2.json();
            const newModel = data2.interviewers?.find((i: InterviewerModel) => i.interviewer_name === interviewerName);
            if (newModel) {
              setSelectedInterviewer(newModel);
              setStep('view_model');
            } else {
              setStep('list');
            }
            setNewInterviewer({ name: '', linkedinPaste: '', currentRole: '', company: '', photoUrl: '' });
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

  const deleteInterviewer = async (interviewer: InterviewerModel) => {
    if (!confirm(`Delete ${interviewer.interviewer_name}? This cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/interviewer-model/generate?jobId=${jobId}&interviewerName=${encodeURIComponent(interviewer.interviewer_name)}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to delete interviewer');
      }

      await refreshInterviewers();
      if (selectedInterviewer?.id === interviewer.id) {
        setSelectedInterviewer(null);
        setStep('list');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete interviewer');
    } finally {
      setIsDeleting(false);
    }
  };

  const startPractice = async () => {
    if (!selectedInterviewer?.briefing) return;

    setIsStarting(true);
    setError(null);

    try {
      const response = await fetch('/api/interviewer-model/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          jobId,
          briefing: selectedInterviewer.briefing,
          interviewerName: selectedInterviewer.interviewer_name,
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

  // Resume an existing practice session
  const resumeSession = async (activeSession: ActiveSession, interviewer: InterviewerModel) => {
    setIsStarting(true);
    setError(null);

    try {
      const response = await fetch(`/api/interviewer-model/practice?sessionId=${activeSession.id}`);
      if (!response.ok) {
        throw new Error('Failed to load session');
      }

      const data = await response.json();
      const sessionData = data.session;

      // Set up the session state
      setSelectedInterviewer(interviewer);
      setSession({
        sessionId: sessionData.id,
        interviewer: {
          name: sessionData.interviewerName || interviewer.interviewer_name,
          role: interviewer.briefing?.interviewer_models?.[0]?.current_role || '',
          company: interviewer.briefing?.interviewer_models?.[0]?.company || '',
        },
        config: { mode: sessionData.mode, difficulty: sessionData.difficulty },
      });

      // Load messages
      const loadedMessages: Message[] = (sessionData.messages || []).map((m: { role: string; content: string; emotional_tone?: string; turn_number?: number }) => ({
        role: m.role as 'interviewer' | 'candidate',
        content: m.content,
        emotionalTone: m.emotional_tone,
        turnNumber: m.turn_number,
      }));
      setMessages(loadedMessages);
      setSessionStatus(sessionData.status === 'active' ? 'active' : 'completed');
      setMode(sessionData.mode as Mode);
      setDifficulty(sessionData.difficulty as Difficulty);
      setStep('practice');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume session');
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

  const backToList = async () => {
    setSelectedInterviewer(null);
    setSession(null);
    setMessages([]);
    setStep('list');
    // Refresh active sessions to show updated state
    await refreshActiveSessions();
  };

  const startNewSession = () => {
    setSession(null);
    setMessages([]);
    setDebrief(null);
    setSessionStatus('active');
    setStep('view_model');
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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

  // Step: List of interviewers
  if (step === 'list') {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Your Interviewers
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-6 text-sm text-gray-600">
            Build AI models of your interviewers from their LinkedIn profiles. Practice with personas that think, speak, and evaluate like them.
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Existing interviewers */}
            {interviewers.map((interviewer) => {
              const model = interviewer.briefing?.interviewer_models?.[0];
              const isComplete = interviewer.status === 'completed' && model;
              const isGenerating = interviewer.status === 'generating';
              const isFailed = interviewer.status === 'failed';
              const activeSession = activeSessions.get(interviewer.interviewer_name);

              return (
                <div
                  key={interviewer.id}
                  className={`rounded-lg border-2 p-4 transition-all ${
                    activeSession
                      ? 'border-green-300 bg-green-50 hover:border-green-400 cursor-pointer'
                      : isComplete
                      ? 'border-gray-200 hover:border-purple-300 cursor-pointer'
                      : isGenerating
                      ? 'border-purple-200 bg-purple-50'
                      : 'border-red-200 bg-red-50'
                  }`}
                  onClick={() => {
                    if (activeSession && isComplete) {
                      resumeSession(activeSession, interviewer);
                    } else if (isComplete) {
                      setSelectedInterviewer(interviewer);
                      setStep('view_model');
                    }
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold ${
                        activeSession ? 'bg-green-100 text-green-700' :
                        isComplete ? 'bg-purple-100 text-purple-700' :
                        isGenerating ? 'bg-purple-200 text-purple-800' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {isGenerating ? (
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-700 border-t-transparent" />
                        ) : (
                          getInitials(interviewer.interviewer_name)
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{interviewer.interviewer_name}</div>
                        {model && (
                          <div className="text-sm text-gray-500">{model.current_role}</div>
                        )}
                        {activeSession && (
                          <div className="text-xs text-green-600">
                            Session in progress ({activeSession.messageCount} messages)
                          </div>
                        )}
                        {isGenerating && (
                          <div className="text-xs text-purple-600">Generating model...</div>
                        )}
                        {isFailed && (
                          <div className="text-xs text-red-600">{interviewer.error_message || 'Failed'}</div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteInterviewer(interviewer);
                      }}
                      disabled={isDeleting}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete interviewer"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  {isComplete && (
                    <div className="mt-4">
                      {activeSession ? (
                        <Button
                          variant="primary"
                          size="sm"
                          className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
                          isLoading={isStarting}
                          onClick={(e) => {
                            e.stopPropagation();
                            resumeSession(activeSession, interviewer);
                          }}
                        >
                          Resume Session
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedInterviewer(interviewer);
                            setStep('view_model');
                          }}
                        >
                          Practice
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add new interviewer card */}
            <div
              onClick={() => setStep('add_interviewer')}
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6 transition-colors hover:border-purple-400 hover:bg-purple-50"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="mt-2 text-sm font-medium text-gray-600">Add Interviewer</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step: Add Interviewer
  if (step === 'add_interviewer') {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Add Interviewer
            </CardTitle>
            <Button variant="outline" size="sm" onClick={backToList}>
              Cancel
            </Button>
          </div>
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
                  value={newInterviewer.name}
                  onChange={(e) => setNewInterviewer(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Jane Smith"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Company</label>
                <input
                  type="text"
                  value={newInterviewer.company}
                  onChange={(e) => setNewInterviewer(prev => ({ ...prev, company: e.target.value }))}
                  placeholder="TechCorp"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Current Role</label>
              <input
                type="text"
                value={newInterviewer.currentRole}
                onChange={(e) => setNewInterviewer(prev => ({ ...prev, currentRole: e.target.value }))}
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
                value={newInterviewer.linkedinPaste}
                onChange={(e) => setNewInterviewer(prev => ({ ...prev, linkedinPaste: e.target.value }))}
                placeholder="Paste the full LinkedIn profile content here..."
                rows={6}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={backToList} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={generateModel}
              isLoading={isGenerating}
              disabled={isGenerating || !newInterviewer.name || !newInterviewer.linkedinPaste}
              className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600"
            >
              {isGenerating ? 'Building Model...' : 'Build Interviewer Model'}
            </Button>
          </div>

          <p className="text-xs text-center text-gray-500">
            This typically takes 30-60 seconds
          </p>
        </CardContent>
      </Card>
    );
  }

  // Step: View Model
  if (step === 'view_model' && selectedInterviewer?.briefing) {
    const briefing = selectedInterviewer.briefing;
    const model = briefing.interviewer_models[0];

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-700 font-semibold">
                  {getInitials(model.name)}
                </div>
                <div>
                  <div className="text-lg">{model.name}</div>
                  <div className="text-sm font-normal text-gray-500">{model.current_role} at {model.company}</div>
                </div>
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  briefing.meta.model_confidence === 'HIGH' ? 'bg-green-100 text-green-700' :
                  briefing.meta.model_confidence === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {briefing.meta.model_confidence} Confidence
                </span>
                <Button variant="outline" size="sm" onClick={backToList}>
                  Back
                </Button>
              </div>
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

            {model.communication_style.language_patterns?.length > 0 && (
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
              <Button variant="outline" onClick={backToList}>
                Back to Interviewers
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

  // Step: Practice Session
  if (step === 'practice' && session) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-700 font-semibold">
                  {getInitials(session.interviewer.name)}
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
              <div className="flex gap-3 items-end">
                <textarea
                  value={candidateInput}
                  onChange={(e) => setCandidateInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Type your response... (Shift+Enter for new line)"
                  rows={3}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none max-h-40 overflow-y-auto"
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

  // Step: Debrief
  if (step === 'debrief' && debrief) {
    // Normalize debrief data to handle different API response formats
    const score = debrief.overall_score ?? debrief.overall_performance?.score ?? 0;
    const hiringDecision = debrief.hiring_prediction ?? debrief.overall_performance?.hiring_decision ?? 'unknown';
    const summary = debrief.overall_performance?.one_line_summary ?? '';
    const strengths = debrief.strengths ?? [];
    const improvements = debrief.areas_for_improvement ?? debrief.improvement_areas ?? [];
    const nextFocus = debrief.next_session_focus ?? 'Continue practicing to improve your interview skills.';

    // If we only have raw_analysis, show that
    if (debrief.raw_analysis && !debrief.overall_score && !debrief.overall_performance) {
      return (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Debrief</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{debrief.raw_analysis}</p>
            </CardContent>
          </Card>
          <div className="flex gap-3">
            <Button variant="outline" onClick={backToList} className="flex-1">
              Back to Interviewers
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

    return (
      <div className="space-y-6">
        {/* Overall Score */}
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Performance Debrief</h3>
                {summary && <p className="mt-1 text-sm text-gray-600">{summary}</p>}
              </div>
              <div className="text-center">
                <div className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold ${
                  score >= 8 ? 'bg-green-100 text-green-700' :
                  score >= 6 ? 'bg-blue-100 text-blue-700' :
                  score >= 4 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {score}
                </div>
                <p className={`mt-1 text-xs font-medium ${
                  hiringDecision.toLowerCase().includes('yes') || hiringDecision.toLowerCase().includes('likely_hire')
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}>
                  {hiringDecision.replace(/_/g, ' ').toUpperCase()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Strengths */}
        {strengths.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-green-700">Strengths</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {strengths.map((s, i) => {
                  const strengthText = typeof s === 'string' ? s : s.strength;
                  const evidenceText = typeof s === 'object' ? s.evidence : undefined;
                  return (
                    <div key={i} className="rounded-lg bg-green-50 p-3">
                      <p className="text-sm font-medium text-green-800">{strengthText}</p>
                      {evidenceText && <p className="mt-1 text-xs text-green-700">{evidenceText}</p>}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Improvement Areas */}
        {improvements.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-amber-700">Areas for Improvement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {improvements.map((a, i) => {
                  const item = a as { area?: string; better_approach?: string; suggestion?: string };
                  const areaText = typeof a === 'string' ? a : item.area;
                  const approachText = typeof a === 'object' ? (item.better_approach || item.suggestion) : undefined;
                  return (
                    <div key={i} className="rounded-lg bg-amber-50 p-3">
                      <p className="text-sm font-medium text-amber-800">{areaText}</p>
                      {approachText && <p className="mt-1 text-xs text-amber-700">{approachText}</p>}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Next Focus */}
        <Card>
          <CardContent className="py-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Focus for Next Session</h4>
            <p className="text-sm text-gray-600 bg-purple-50 p-3 rounded-lg">{nextFocus}</p>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={backToList} className="flex-1">
            Back to Interviewers
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
