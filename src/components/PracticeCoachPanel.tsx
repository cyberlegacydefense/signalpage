'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui';

interface PracticeCoachPanelProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  interviewerName: string;
  interviewerContext: {
    currentRole: string;
    company: string;
    careerArchetype: string;
    whatImpressesThem: string;
    whatConcernsThem: string;
    hiringLens: string;
  };
  conversationHistory: Array<{
    role: 'interviewer' | 'candidate';
    content: string;
  }>;
  currentQuestion: string;
}

export function PracticeCoachPanel({
  isOpen,
  onClose,
  jobId,
  interviewerName,
  interviewerContext,
  conversationHistory,
  currentQuestion,
}: PracticeCoachPanelProps) {
  const [advice, setAdvice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch coaching advice when panel opens
  useEffect(() => {
    if (isOpen && !advice && !isLoading) {
      fetchAdvice();
    }
  }, [isOpen]);

  // Reset when panel closes
  useEffect(() => {
    if (!isOpen) {
      setAdvice(null);
      setError(null);
    }
  }, [isOpen]);

  const fetchAdvice = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/interviewer-model/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          interviewerName,
          interviewerContext,
          conversationHistory,
          currentQuestion,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to get coaching advice');
      }

      const data = await response.json();
      setAdvice(data.advice);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to coach');
    } finally {
      setIsLoading(false);
    }
  };

  // Truncate question for display
  const truncatedQuestion = currentQuestion.length > 100
    ? currentQuestion.slice(0, 100) + '...'
    : currentQuestion;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 z-[100] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 h-full w-full sm:w-[420px] bg-white shadow-2xl z-[101] flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50">
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-amber-100 transition-colors"
          >
            <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-gray-900">
              Coach: How to Respond
            </h2>
            <p className="text-xs text-gray-500 truncate">
              Advice for {interviewerName}
            </p>
          </div>
        </div>

        {/* Current Question */}
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-xs text-gray-500 mb-1">Interviewer said:</p>
          <p className="text-sm text-gray-800 font-medium italic">&ldquo;{truncatedQuestion}&rdquo;</p>
        </div>

        {/* Advice Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
                <p className="text-sm text-gray-500">Getting coaching advice...</p>
              </div>
            </div>
          )}

          {error && !isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm text-red-600 mb-3">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchAdvice}
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {advice && !isLoading && (
            <div className="prose prose-sm max-w-none">
              <FormattedAdvice content={advice} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            Use this advice to craft your response, then close and continue the interview
          </p>
        </div>
      </div>
    </>
  );
}

// Helper component to format the coaching advice
function FormattedAdvice({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listKey = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${listKey++}`} className="list-disc pl-4 my-2 space-y-1">
          {listItems.map((item, i) => (
            <li key={i} className="text-sm text-gray-700">{formatInline(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  const formatInline = (text: string): React.ReactNode => {
    // Bold text **text**
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-gray-900">{part.slice(2, -2)}</strong>;
      }
      // Handle quoted text
      if (part.startsWith('"') && part.endsWith('"')) {
        return <span key={i} className="italic text-purple-700">{part}</span>;
      }
      return part;
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Bold headers like **What They're Really Asking:**
    if (line.match(/^\*\*[^*]+\*\*:?\s*$/)) {
      flushList();
      const headerText = line.replace(/\*\*/g, '').replace(/:$/, '');
      elements.push(
        <h4 key={i} className="font-semibold text-sm text-amber-800 mt-4 mb-2 first:mt-0">
          {headerText}
        </h4>
      );
    }
    // Bullet points
    else if (line.match(/^[-*] /)) {
      listItems.push(line.slice(2));
    } else if (line.match(/^\d+\. /)) {
      listItems.push(line.replace(/^\d+\. /, ''));
    }
    // Empty line
    else if (line.trim() === '') {
      flushList();
    }
    // Regular paragraph
    else if (line.trim()) {
      flushList();
      // Check if it's a quoted suggestion
      if (line.startsWith('"') || line.startsWith("'")) {
        elements.push(
          <div key={i} className="my-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-sm text-purple-800 italic">{line}</p>
          </div>
        );
      } else {
        elements.push(
          <p key={i} className="text-sm text-gray-700 my-1">
            {formatInline(line)}
          </p>
        );
      }
    }
  }

  flushList();

  return <>{elements}</>;
}
