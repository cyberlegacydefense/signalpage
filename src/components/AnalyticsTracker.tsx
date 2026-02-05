'use client';

import { useEffect, useRef } from 'react';
import {
  sendEnhancedAnalytics,
  setupFullTracking,
} from '@/lib/analytics/visitor-fingerprint';

interface AnalyticsTrackerProps {
  pageId: string;
  isOwner: boolean;
}

/**
 * Client-side analytics tracker component
 * Handles:
 * - Enhanced page view tracking with fingerprint
 * - Engagement scoring (time on page)
 * - Scroll depth tracking
 * - Return visitor detection
 */
export function AnalyticsTracker({ pageId, isOwner }: AnalyticsTrackerProps) {
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    // Don't track owner views
    if (isOwner) return;

    // Only track once per page load
    if (hasTrackedRef.current) return;
    hasTrackedRef.current = true;

    // Send enhanced page view with fingerprint
    sendEnhancedAnalytics(pageId, 'page_view');

    // Setup full tracking (time on page + scroll depth + high engagement)
    const cleanup = setupFullTracking(pageId, 120);

    return () => {
      cleanup();
    };
  }, [pageId, isOwner]);

  // This component renders nothing - it's just for tracking
  return null;
}
