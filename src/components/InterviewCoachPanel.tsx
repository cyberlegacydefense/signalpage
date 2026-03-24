'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui';
import type { InterviewQuestion, InterviewAnswer } from '@/types';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface InterviewCoachPanelProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  question: InterviewQuestion;
  answer?: InterviewAnswer;
}

export function InterviewCoachPanel({
  isOpen,
  onClose,
  jobId,
  question,
  answer,
}: InterviewCoachPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Send initial coaching request when panel opens
  useEffect(() => {
    if (isOpen && !hasInitialized && messages.length === 0) {
      setHasInitialized(true);
      // Inline the API call to avoid dependency issues
      const fetchInitialGuidance = async () => {
        setIsLoading(true);
        setError(null);

        try {
          const response = await fetch('/api/interview-prep/coach', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jobId,
              questionId: question.id,
              question: question.question,
              whatTheyReLookingFor: question.what_theyre_looking_for,
              suggestedAnswer: answer?.suggested_answer,
              messages: [],
            }),
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to get coaching guidance');
          }

          const data = await response.json();
          setMessages([{ role: 'assistant', content: data.message }]);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to connect to coach');
        } finally {
          setIsLoading(false);
        }
      };

      fetchInitialGuidance();
    }
  }, [isOpen, hasInitialized, messages.length, jobId, question, answer]);

  // Reset state when panel closes
  useEffect(() => {
    if (!isOpen) {
      setMessages([]);
      setInputValue('');
      setError(null);
      setHasInitialized(false);
    }
  }, [isOpen]);

  const retryInitialMessage = () => {
    setHasInitialized(false);
    setError(null);
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setError(null);

    // Add user message immediately
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch('/api/interview-prep/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          questionId: question.id,
          question: question.question,
          whatTheyReLookingFor: question.what_theyre_looking_for,
          suggestedAnswer: answer?.suggested_answer,
          messages: newMessages,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to get response');
      }

      const data = await response.json();
      setMessages([...newMessages, { role: 'assistant', content: data.message }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Truncate question for header
  const truncatedQuestion = question.question.length > 60
    ? question.question.slice(0, 60) + '...'
    : question.question;

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
        className={`fixed right-0 top-0 h-full w-full sm:w-[450px] bg-white shadow-2xl z-[101] flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3 bg-gradient-to-r from-purple-50 to-indigo-50">
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-purple-100 transition-colors"
          >
            <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-gray-900 truncate">
              Coach: How to answer this question
            </h2>
          </div>
        </div>

        {/* Question Preview */}
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-xs text-gray-500 mb-1">Question:</p>
          <p className="text-sm text-gray-800 font-medium">{truncatedQuestion}</p>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 && isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
                <p className="text-sm text-gray-500">Getting coaching guidance...</p>
              </div>
            </div>
          )}

          {messages.length === 0 && !isLoading && error && (
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
                  onClick={retryInitialMessage}
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="text-sm prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:mt-3 prose-headings:mb-1 prose-headings:text-gray-800 prose-strong:text-gray-900">
                      <FormattedMessage content={msg.content} />
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}

            {isLoading && messages.length > 0 && (
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
        </div>

        {/* Error Banner */}
        {error && messages.length > 0 && (
          <div className="px-4 py-2 bg-red-50 border-t border-red-200">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4 bg-white">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a follow-up question..."
              rows={2}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              disabled={isLoading || messages.length === 0}
            />
            <Button
              variant="primary"
              onClick={sendMessage}
              disabled={isLoading || !inputValue.trim() || messages.length === 0}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 px-3"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </Button>
          </div>
          <p className="mt-2 text-xs text-gray-400 text-center">
            Shift+Enter for new line
          </p>
        </div>
      </div>
    </>
  );
}

// Helper component to format markdown-like content
function FormattedMessage({ content }: { content: string }) {
  // Simple markdown-like formatting
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listKey = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${listKey++}`} className="list-disc pl-4 my-2">
          {listItems.map((item, i) => (
            <li key={i} className="text-sm">{formatInline(item)}</li>
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
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Headers
    if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <h4 key={i} className="font-semibold text-sm mt-3 mb-1">
          {formatInline(line.slice(4))}
        </h4>
      );
    } else if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <h3 key={i} className="font-semibold text-sm mt-3 mb-1">
          {formatInline(line.slice(3))}
        </h3>
      );
    } else if (line.startsWith('# ')) {
      flushList();
      elements.push(
        <h2 key={i} className="font-bold text-sm mt-3 mb-1">
          {formatInline(line.slice(2))}
        </h2>
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
      elements.push(<div key={i} className="h-2" />);
    }
    // Regular paragraph
    else {
      flushList();
      elements.push(
        <p key={i} className="text-sm my-1">
          {formatInline(line)}
        </p>
      );
    }
  }

  flushList();

  return <>{elements}</>;
}
