/**
 * Engagement Score Calculator
 * Computes a composite engagement score (0-100) from multiple metrics
 */

export interface EngagementMetrics {
  avgTimeOnPage: number;      // seconds
  avgScrollDepth: number;     // 0-100 percentage
  returnVisitorRate: number;  // 0-1 decimal
  highEngagementRate: number; // 0-1 decimal (% of visitors with 2+ min)
}

/**
 * Calculate composite engagement score (0-100)
 *
 * Weights:
 * - Time on page: 30% (scaled from 0-5 minutes)
 * - Scroll depth: 25% (direct percentage)
 * - Return visitors: 25% (scaled from 0-30%)
 * - High engagement: 20% (scaled from 0-20%)
 */
export function calculateEngagementScore(metrics: EngagementMetrics): number {
  // Time score: 0-100 based on 0-5 minute scale (300 seconds)
  const timeScore = Math.min(100, (metrics.avgTimeOnPage / 300) * 100);

  // Scroll score: direct percentage
  const scrollScore = metrics.avgScrollDepth;

  // Return visitor score: 0-100 based on 0-30% return rate
  const returnScore = Math.min(100, (metrics.returnVisitorRate / 0.3) * 100);

  // High engagement score: 0-100 based on 0-20% high engagement rate
  const highEngScore = Math.min(100, (metrics.highEngagementRate / 0.2) * 100);

  // Weighted composite
  const score = Math.round(
    timeScore * 0.30 +
    scrollScore * 0.25 +
    returnScore * 0.25 +
    highEngScore * 0.20
  );

  return Math.min(100, Math.max(0, score));
}

/**
 * Get engagement level label from score
 */
export function getEngagementLevel(score: number): {
  label: string;
  color: string;
  bgColor: string;
} {
  if (score >= 80) {
    return { label: 'Excellent', color: 'text-green-700', bgColor: 'bg-green-100' };
  } else if (score >= 60) {
    return { label: 'Good', color: 'text-blue-700', bgColor: 'bg-blue-100' };
  } else if (score >= 40) {
    return { label: 'Average', color: 'text-yellow-700', bgColor: 'bg-yellow-100' };
  } else if (score >= 20) {
    return { label: 'Low', color: 'text-orange-700', bgColor: 'bg-orange-100' };
  } else {
    return { label: 'Very Low', color: 'text-red-700', bgColor: 'bg-red-100' };
  }
}

/**
 * Calculate engagement metrics from raw analytics data
 */
export function computeEngagementMetrics(data: {
  totalViews: number;
  uniqueVisitors: number;
  returnVisitors: number;
  avgTimeOnPage: number;
  avgScrollDepth: number;
  highEngagementCount: number;
}): EngagementMetrics {
  const returnVisitorRate = data.uniqueVisitors > 0
    ? data.returnVisitors / data.uniqueVisitors
    : 0;

  const highEngagementRate = data.totalViews > 0
    ? data.highEngagementCount / data.totalViews
    : 0;

  return {
    avgTimeOnPage: data.avgTimeOnPage,
    avgScrollDepth: data.avgScrollDepth,
    returnVisitorRate,
    highEngagementRate,
  };
}
