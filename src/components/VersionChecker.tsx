'use client';

import { useState, useEffect, useCallback } from 'react';

export function VersionChecker() {
  const [initialBuildId, setInitialBuildId] = useState<string | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  const checkVersion = useCallback(async () => {
    if (!initialBuildId) return;

    try {
      const response = await fetch('/api/version', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (!response.ok) return;

      const { buildId } = await response.json();

      // Skip check in development
      if (buildId === 'development' || initialBuildId === 'development') {
        return;
      }

      if (buildId !== initialBuildId) {
        setShowBanner(true);
      }
    } catch {
      // Silently fail - don't interrupt user experience
    }
  }, [initialBuildId]);

  // Fetch initial build ID on mount
  useEffect(() => {
    async function fetchInitialVersion() {
      try {
        const response = await fetch('/api/version');
        if (response.ok) {
          const { buildId } = await response.json();
          setInitialBuildId(buildId);
        }
      } catch {
        // Ignore errors
      }
    }

    fetchInitialVersion();
  }, []);

  // Check version on window focus
  useEffect(() => {
    if (!initialBuildId) return;

    const handleFocus = () => {
      checkVersion();
    };

    window.addEventListener('focus', handleFocus);

    // Also check periodically (every 5 minutes)
    const interval = setInterval(checkVersion, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [initialBuildId, checkVersion]);

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-2 fade-in duration-300">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">
              Update available
            </p>
            <p className="mt-1 text-sm text-blue-700">
              A new version of SignalPage is available.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => window.location.reload()}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Refresh now
              </button>
              <button
                onClick={() => setShowBanner(false)}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Later
              </button>
            </div>
          </div>
          <button
            onClick={() => setShowBanner(false)}
            className="flex-shrink-0 text-blue-400 hover:text-blue-600"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
