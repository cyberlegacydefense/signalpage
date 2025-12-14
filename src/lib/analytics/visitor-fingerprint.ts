/**
 * Visitor Fingerprinting for Analytics
 * Generates a unique visitor hash based on browser characteristics
 * Used for return visitor detection and engagement tracking
 */

// Generate a simple hash from string
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// Get or create a persistent visitor ID
function getVisitorId(): string {
  const STORAGE_KEY = 'sp_visitor_id';

  if (typeof window === 'undefined') return '';

  let visitorId = localStorage.getItem(STORAGE_KEY);

  if (!visitorId) {
    // Generate a new unique ID
    visitorId = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem(STORAGE_KEY, visitorId);
  }

  return visitorId;
}

// Get screen resolution
function getScreenResolution(): string {
  if (typeof window === 'undefined') return '';
  return `${window.screen.width}x${window.screen.height}`;
}

// Get timezone
function getTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return '';
  }
}

// Get browser language
function getLanguage(): string {
  if (typeof navigator === 'undefined') return '';
  return navigator.language || '';
}

// Get user agent (truncated for privacy)
function getUserAgentHash(): string {
  if (typeof navigator === 'undefined') return '';
  // Only hash the user agent, don't send full string
  return simpleHash(navigator.userAgent);
}

export interface VisitorFingerprint {
  visitor_hash: string;
  screen_resolution: string;
  timezone: string;
  language: string;
}

/**
 * Generate a visitor fingerprint
 * Combines multiple signals for more accurate visitor identification
 */
export function generateVisitorFingerprint(): VisitorFingerprint {
  const visitorId = getVisitorId();
  const screenRes = getScreenResolution();
  const timezone = getTimezone();
  const language = getLanguage();
  const uaHash = getUserAgentHash();

  // Create composite hash from all signals
  const composite = `${visitorId}-${screenRes}-${timezone}-${language}-${uaHash}`;
  const visitorHash = simpleHash(composite);

  return {
    visitor_hash: visitorHash,
    screen_resolution: screenRes,
    timezone: timezone,
    language: language,
  };
}

/**
 * Track time on page
 * Returns a function to get the current time spent
 */
export function createTimeTracker(): {
  getTimeOnPage: () => number;
  startTime: number;
} {
  const startTime = Date.now();

  return {
    startTime,
    getTimeOnPage: () => Math.floor((Date.now() - startTime) / 1000),
  };
}

/**
 * Send analytics event with fingerprint
 */
export async function sendEnhancedAnalytics(
  pageId: string,
  eventType: string,
  options?: {
    sectionId?: string;
    metadata?: Record<string, unknown>;
    timeOnPage?: number;
  }
): Promise<void> {
  const fingerprint = generateVisitorFingerprint();

  try {
    await fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pageId,
        eventType,
        sectionId: options?.sectionId,
        metadata: options?.metadata,
        visitorFingerprint: fingerprint,
        timeOnPage: options?.timeOnPage,
      }),
    });
  } catch (error) {
    console.error('Failed to send analytics:', error);
  }
}

/**
 * Send engagement event when user has been on page for X seconds
 */
export function setupEngagementTracking(
  pageId: string,
  thresholdSeconds: number = 120 // 2 minutes default
): () => void {
  let hasSentEngagement = false;
  const tracker = createTimeTracker();

  const checkEngagement = () => {
    if (hasSentEngagement) return;

    const timeOnPage = tracker.getTimeOnPage();
    if (timeOnPage >= thresholdSeconds) {
      hasSentEngagement = true;
      sendEnhancedAnalytics(pageId, 'high_engagement', {
        timeOnPage,
        metadata: { threshold: thresholdSeconds },
      });
    }
  };

  // Check every 30 seconds
  const intervalId = setInterval(checkEngagement, 30000);

  // Also send on page unload
  const handleUnload = () => {
    const timeOnPage = tracker.getTimeOnPage();
    // Use sendBeacon for reliable unload tracking
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const fingerprint = generateVisitorFingerprint();
      const data = JSON.stringify({
        pageId,
        eventType: 'page_leave',
        timeOnPage,
        visitorFingerprint: fingerprint,
      });
      navigator.sendBeacon('/api/analytics', data);
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', handleUnload);
  }

  // Return cleanup function
  return () => {
    clearInterval(intervalId);
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', handleUnload);
    }
  };
}
