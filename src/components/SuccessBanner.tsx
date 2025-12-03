'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SuccessBannerProps {
  title: string;
  message: string;
  autoDismiss?: boolean;
  dismissAfter?: number;
}

export function SuccessBanner({
  title,
  message,
  autoDismiss = true,
  dismissAfter = 10000,
}: SuccessBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (autoDismiss) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, dismissAfter);
      return () => clearTimeout(timer);
    }
  }, [autoDismiss, dismissAfter]);

  const handleDismiss = () => {
    setIsVisible(false);
    // Remove the query param from URL without refresh
    router.replace('/dashboard', { scroll: false });
  };

  if (!isVisible) return null;

  return (
    <div className="mb-6 rounded-lg bg-green-50 border border-green-200 p-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg
            className="h-6 w-6 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-semibold text-green-800">{title}</h3>
          <p className="mt-1 text-sm text-green-700">{message}</p>
        </div>
        <button
          onClick={handleDismiss}
          className="ml-4 flex-shrink-0 text-green-500 hover:text-green-700"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
