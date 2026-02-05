/**
 * Time formatting utilities for analytics display
 */

/**
 * Format seconds to human-readable duration
 * Examples: "45s", "2m 15s", "1h 30m"
 */
export function formatTimeOnPage(seconds: number): string {
  if (seconds < 0) return '0s';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  if (minutes > 0) {
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  }

  return `${secs}s`;
}

/**
 * Format seconds to compact duration (for small displays)
 * Examples: "45s", "2:15", "1:30:00"
 */
export function formatTimeCompact(seconds: number): string {
  if (seconds < 0) return '0s';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  if (minutes > 0) {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  return `${secs}s`;
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number, decimals: number = 0): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Get time bucket label for analytics display
 */
export function getTimeBucket(seconds: number): string {
  if (seconds < 30) return '<30s';
  if (seconds < 60) return '30s-1m';
  if (seconds < 120) return '1-2m';
  if (seconds < 300) return '2-5m';
  return '5m+';
}

/**
 * Get scroll bucket label for analytics display
 */
export function getScrollBucket(depth: number): string {
  if (depth < 25) return '<25%';
  if (depth < 50) return '25-50%';
  if (depth < 75) return '50-75%';
  return '75-100%';
}
