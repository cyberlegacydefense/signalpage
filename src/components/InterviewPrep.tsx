'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import type {
  RoleContextPackage,
  InterviewQuestions,
  InterviewAnswer,
  InterviewQuestion,
  QuestionCategory
} from '@/types';

interface InterviewPrepProps {
  jobId: string;
  hasAccess: boolean;
}

interface InterviewPrepData {
  role_context: RoleContextPackage;
  questions: InterviewQuestions;
  answers: InterviewAnswer[];
  quick_tips: string[];
  generated_at: string;
  status?: string;
  current_step?: number;
  total_steps?: number;
  error_message?: string;
}

interface PollResponse {
  prep: InterviewPrepData | null;
  status: string;
  currentStep: number;
  totalSteps: number;
  errorMessage: string | null;
}

const CATEGORY_LABELS: Record<QuestionCategory, string> = {
  behavioral: 'Behavioral',
  technical: 'Technical',
  culture_fit: 'Culture Fit',
  gap_probing: 'Gap Probing',
  role_specific: 'Role Specific',
};

const CATEGORY_COLORS: Record<QuestionCategory, string> = {
  behavioral: 'bg-blue-100 text-blue-800',
  technical: 'bg-purple-100 text-purple-800',
  culture_fit: 'bg-green-100 text-green-800',
  gap_probing: 'bg-amber-100 text-amber-800',
  role_specific: 'bg-indigo-100 text-indigo-800',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
};

const STEP_LABELS = [
  'Starting...',
  'Analyzing role and resume fit...',
  'Generating interview questions...',
  'Creating behavioral answers...',
  'Creating technical answers...',
  'Creating culture fit answers...',
  'Creating gap probing answers...',
  'Creating role-specific answers...',
  'Preparing strategic tips...',
];

// Map API status to step number for display
const STATUS_TO_STEP: Record<string, number> = {
  'generating_context': 1,
  'generating_questions': 2,
  'generating_answers': 3,
  'generating_answers_technical': 4,
  'generating_answers_culture': 5,
  'generating_answers_gap': 6,
  'generating_answers_role': 7,
  'generating_tips': 8,
  'completed': 9,
};

const ESTIMATED_TIME = '2-3 minutes';

export function InterviewPrep({ jobId, hasAccess }: InterviewPrepProps) {
  const [prep, setPrep] = useState<InterviewPrepData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<QuestionCategory | 'all'>('all');
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [progressStep, setProgressStep] = useState(0);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [isStuck, setIsStuck] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const fetchPrep = useCallback(async (): Promise<PollResponse | null> => {
    try {
      const response = await fetch(`/api/generate-interview-prep?jobId=${jobId}`);
      const data: PollResponse = await response.json();
      return data;
    } catch (err) {
      console.error('Failed to fetch interview prep:', err);
      return null;
    }
  }, [jobId]);

  // Check initial state on load
  useEffect(() => {
    if (!hasAccess) return;

    const checkInitialState = async () => {
      setLoading(true);
      const data = await fetchPrep();
      setLoading(false);

      if (!data) return;

      if (data.prep && data.status === 'completed') {
        setPrep(data.prep);
        setIsStuck(false);
      } else if (data.status === 'failed') {
        setError(data.errorMessage || 'Generation failed. Please try again.');
        setIsStuck(false);
      } else if (data.status && !['not_started', 'completed', 'failed'].includes(data.status)) {
        // Found in-progress state - might be actively running or stuck
        const displayStep = STATUS_TO_STEP[data.status] || data.currentStep;
        setProgressStep(displayStep);
        setProgressStatus(data.status);
        // Assume it's actively running - start polling
        setGenerating(true);
      }
    };

    checkInitialState();
  }, [jobId, hasAccess, fetchPrep]);

  // Polling effect - uses GET to check status when generating
  useEffect(() => {
    if (!generating) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    let consecutiveErrors = 0;

    const poll = async () => {
      const data = await fetchPrep();

      if (!data) {
        consecutiveErrors++;
        if (consecutiveErrors >= 5) {
          setError('Lost connection. Please refresh and try again.');
          setGenerating(false);
        }
        return;
      }

      consecutiveErrors = 0;

      // Update progress display
      if (data.status && STATUS_TO_STEP[data.status]) {
        setProgressStep(STATUS_TO_STEP[data.status]);
        setProgressStatus(data.status);
      } else if (data.currentStep) {
        setProgressStep(data.currentStep);
      }

      // Check for completion
      if (data.status === 'completed' && data.prep) {
        setPrep(data.prep);
        setGenerating(false);
        setProgressStep(0);
        setProgressStatus('');
        setIsStuck(false);
        return;
      }

      // Check for failure
      if (data.status === 'failed') {
        setError(data.errorMessage || 'Generation failed. Please try again.');
        setGenerating(false);
        setProgressStep(0);
        setProgressStatus('');
        setIsStuck(false);
        return;
      }

      // Check if stuck (no update in 3 minutes)
      // Note: We can't easily detect this on frontend without updated_at
      // The backend handles stuck detection when user clicks generate again
    };

    // Initial poll immediately
    poll();

    // Then poll every 2 seconds
    pollIntervalRef.current = setInterval(poll, 2000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [generating, fetchPrep]);

  const generatePrep = async (forceReset = false) => {
    setGenerating(true);
    setError(null);
    setPrep(null);
    setProgressStep(1);
    setProgressStatus('generating_context');
    setIsStuck(false);

    try {
      const response = await fetch('/api/generate-interview-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, forceReset }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start interview prep generation');
      }

      // Update progress from response
      if (data.status) {
        const displayStep = STATUS_TO_STEP[data.status] || data.currentStep || 1;
        setProgressStep(displayStep);
        setProgressStatus(data.status);
      }

      // If already completed (shouldn't happen with forceReset, but handle it)
      if (data.status === 'completed' && data.prep) {
        setPrep(data.prep);
        setGenerating(false);
        setProgressStep(0);
        setProgressStatus('');
      }

      // Otherwise, polling will handle the rest
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start generation');
      setGenerating(false);
      setProgressStep(0);
      setProgressStatus('');
    }
  };

  const resetPrep = async () => {
    try {
      const response = await fetch(`/api/generate-interview-prep?jobId=${jobId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reset');
      }

      setPrep(null);
      setError(null);
      setProgressStep(0);
      setProgressStatus('');
      setIsStuck(false);
      setGenerating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset interview prep');
    }
  };

  const toggleQuestion = (questionId: string) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const getAnswerForQuestion = (questionId: string): InterviewAnswer | undefined => {
    return prep?.answers.find(a => a.question_id === questionId);
  };

  const getAllQuestions = (): InterviewQuestion[] => {
    if (!prep?.questions) return [];
    return [
      ...(prep.questions.behavioral || []),
      ...(prep.questions.technical || []),
      ...(prep.questions.culture_fit || []),
      ...(prep.questions.gap_probing || []),
      ...(prep.questions.role_specific || []),
    ];
  };

  const getFilteredQuestions = (): InterviewQuestion[] => {
    if (!prep?.questions) return [];
    if (activeCategory === 'all') return getAllQuestions();
    return prep.questions[activeCategory] || [];
  };

  if (!hasAccess) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
            <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900">
            Interview Coach
          </h3>
          <p className="mb-6 text-gray-600">
            Get AI-generated interview questions tailored to this role, personalized answers based on your resume, and strategic coaching tips.
          </p>
          <a href="/pricing">
            <Button variant="primary" className="bg-gradient-to-r from-purple-600 to-indigo-600">
              Upgrade to Interview Coach
            </Button>
          </a>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
          <p className="text-sm text-gray-500">Loading interview prep...</p>
        </CardContent>
      </Card>
    );
  }

  // Circular progress component
  const CircularProgress = ({ percent, size = 40, strokeWidth = 4, isActive = false }: { percent: number; size?: number; strokeWidth?: number; isActive?: boolean }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percent / 100) * circumference;

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={percent >= 100 ? '#22c55e' : '#9333ea'}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex items-center justify-center">
          {percent >= 100 ? (
            <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ) : isActive ? (
            <span className="text-xs font-semibold text-purple-700">{Math.round(percent)}%</span>
          ) : (
            <span className="text-xs text-gray-400">{Math.round(percent)}%</span>
          )}
        </div>
      </div>
    );
  };

  // Show stuck UI when generation was interrupted
  if (isStuck && !generating) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <svg className="h-8 w-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900">
            Generation Interrupted
          </h3>
          <p className="mb-2 text-gray-600">
            A previous generation was interrupted at step {progressStep} of 8.
          </p>
          <p className="mb-6 text-sm text-gray-500">
            Status: {progressStatus}
          </p>
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              onClick={resetPrep}
            >
              Reset
            </Button>
            <Button
              variant="primary"
              onClick={() => generatePrep(true)}
              className="bg-gradient-to-r from-purple-600 to-indigo-600"
            >
              Start Fresh
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show progress UI when actively generating
  if (generating) {
    const overallPercent = (progressStep / 8) * 100;

    const handleCancel = async () => {
      setGenerating(false);
      setProgressStep(0);
      setProgressStatus('');
      await resetPrep();
    };

    return (
      <Card>
        <CardContent className="py-12">
          <div className="max-w-lg mx-auto">
            {/* Main circular progress */}
            <div className="text-center mb-8">
              <div className="relative inline-block">
                <svg className="transform -rotate-90" width={120} height={120}>
                  <circle
                    cx={60}
                    cy={60}
                    r={52}
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth={8}
                  />
                  <circle
                    cx={60}
                    cy={60}
                    r={52}
                    fill="none"
                    stroke="url(#gradient)"
                    strokeWidth={8}
                    strokeDasharray={326.73}
                    strokeDashoffset={326.73 - (overallPercent / 100) * 326.73}
                    strokeLinecap="round"
                    className="transition-all duration-500 ease-out"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#9333ea" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">{Math.round(overallPercent)}%</span>
                </div>
              </div>

              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                Generating Your Interview Prep
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                This typically takes {ESTIMATED_TIME}
              </p>
            </div>

            {/* Step progress indicators - 2 rows of 4 */}
            <div className="grid grid-cols-4 gap-x-3 gap-y-4 mb-6">
              {STEP_LABELS.slice(1).map((label, index) => {
                const stepNum = index + 1;
                const isActive = progressStep === stepNum;
                const isComplete = progressStep > stepNum;
                const stepPercent = isComplete ? 100 : isActive ? 50 : 0;

                return (
                  <div key={stepNum} className="flex flex-col items-center">
                    <CircularProgress
                      percent={stepPercent}
                      size={36}
                      strokeWidth={3}
                      isActive={isActive}
                    />
                    <span className={`mt-1.5 text-[10px] text-center leading-tight max-w-[70px] ${
                      isComplete
                        ? 'text-green-600 font-medium'
                        : isActive
                          ? 'text-purple-700 font-medium'
                          : 'text-gray-400'
                    }`}>
                      {label.replace('...', '').replace('Creating ', '').replace('Generating ', '').replace('Preparing ', '').replace('Analyzing ', '')}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Current step indicator */}
            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-100">
              <p className="text-sm text-purple-700">
                <span className="font-medium">Step {progressStep} of 8:</span>{' '}
                {STEP_LABELS[progressStep] || 'Processing...'}
              </p>
            </div>

            {/* Cancel/Reset button */}
            <div className="mt-6 text-center">
              <button
                onClick={handleCancel}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Cancel and reset
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!prep) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
            <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900">
            Prepare for Your Interview
          </h3>
          <p className="mb-2 text-gray-600">
            Generate role-specific interview questions with personalized answers based on your resume and this job description.
          </p>
          <p className="mb-6 text-sm text-gray-500">
            Estimated time: {ESTIMATED_TIME}
          </p>
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <Button
            variant="primary"
            onClick={() => generatePrep(true)}
            isLoading={generating}
            disabled={generating}
            className="bg-gradient-to-r from-purple-600 to-indigo-600"
          >
            Generate Interview Prep
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Tips */}
      {prep.quick_tips && prep.quick_tips.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg className="h-5 w-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Quick Strategy Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {prep.quick_tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                    {i + 1}
                  </span>
                  {tip}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Role Context Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Role Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700">Role Summary</h4>
            <p className="mt-1 text-sm text-gray-600">{prep.role_context.role_summary}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="text-sm font-medium text-green-700">Your Strengths for This Role</h4>
              <ul className="mt-2 space-y-1">
                {prep.role_context.candidate_strengths.map((strength, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {strength}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-medium text-amber-700">Potential Gap Areas</h4>
              <ul className="mt-2 space-y-1">
                {prep.role_context.candidate_gaps.map((gap, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {gap}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700">Interviewer Mindset</h4>
            <p className="mt-1 text-sm text-gray-600 italic">{prep.role_context.interviewer_mindset}</p>
          </div>
        </CardContent>
      </Card>

      {/* Questions & Answers */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Interview Questions ({getAllQuestions().length})</CardTitle>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveCategory('all')}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  activeCategory === 'all'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {(Object.keys(CATEGORY_LABELS) as QuestionCategory[]).map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    activeCategory === cat
                      ? 'bg-gray-900 text-white'
                      : `${CATEGORY_COLORS[cat]} hover:opacity-80`
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {getFilteredQuestions().map((question) => {
              const answer = getAnswerForQuestion(question.id);
              const isExpanded = expandedQuestions.has(question.id);

              return (
                <div
                  key={question.id}
                  className="rounded-lg border border-gray-200 overflow-hidden"
                >
                  <button
                    onClick={() => toggleQuestion(question.id)}
                    className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[question.category as QuestionCategory]}`}>
                            {CATEGORY_LABELS[question.category as QuestionCategory]}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${DIFFICULTY_COLORS[question.difficulty] || DIFFICULTY_COLORS.medium}`}>
                            {question.difficulty}
                          </span>
                        </div>
                        <p className="font-medium text-gray-900">{question.question}</p>
                        <p className="mt-1 text-sm text-gray-500">{question.why_asked}</p>
                      </div>
                      <svg
                        className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {isExpanded && answer && (
                    <div className="border-t border-gray-200 bg-gray-50 p-4">
                      <div className="mb-3">
                        <h5 className="text-sm font-medium text-gray-700">What They&apos;re Looking For:</h5>
                        <p className="mt-1 text-sm text-gray-600">{question.what_theyre_looking_for}</p>
                      </div>

                      <div className="mb-3">
                        <h5 className="text-sm font-medium text-green-700">Suggested Answer:</h5>
                        <p className="mt-1 text-sm text-gray-700 bg-white rounded-lg p-3 border border-green-200">
                          {answer.suggested_answer}
                        </p>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <h5 className="text-sm font-medium text-gray-700">Key Points to Hit:</h5>
                          <ul className="mt-1 space-y-1">
                            {answer.key_points.map((point, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                                <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                {point}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {answer.metrics_to_mention.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-700">Metrics to Mention:</h5>
                            <ul className="mt-1 space-y-1">
                              {answer.metrics_to_mention.map((metric, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                                  </svg>
                                  {metric}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <h5 className="text-sm font-medium text-amber-800">Prepare for Follow-up:</h5>
                        <p className="mt-1 text-sm text-amber-700">{answer.follow_up_prep}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Regenerate Button */}
      <div className="text-center">
        <Button
          variant="outline"
          onClick={() => generatePrep(true)}
          isLoading={generating}
          disabled={generating}
        >
          Regenerate Interview Prep
        </Button>
        <p className="mt-2 text-xs text-gray-500">
          Last generated: {new Date(prep.generated_at).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
