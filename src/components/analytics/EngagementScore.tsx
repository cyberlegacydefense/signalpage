'use client';

import { getEngagementLevel } from '@/lib/analytics/engagement-score';

interface EngagementScoreProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function EngagementScore({
  score,
  size = 'md',
  showLabel = true,
}: EngagementScoreProps) {
  const { label, color, bgColor } = getEngagementLevel(score);

  const sizeClasses = {
    sm: {
      container: 'h-1.5',
      text: 'text-xs',
      wrapper: 'gap-1',
    },
    md: {
      container: 'h-2',
      text: 'text-sm',
      wrapper: 'gap-2',
    },
    lg: {
      container: 'h-3',
      text: 'text-base',
      wrapper: 'gap-3',
    },
  };

  const classes = sizeClasses[size];

  return (
    <div className={`flex items-center ${classes.wrapper}`}>
      {/* Progress bar */}
      <div className={`flex-1 bg-gray-200 rounded-full overflow-hidden ${classes.container}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            score >= 80 ? 'bg-green-500' :
            score >= 60 ? 'bg-blue-500' :
            score >= 40 ? 'bg-yellow-500' :
            score >= 20 ? 'bg-orange-500' : 'bg-red-500'
          }`}
          style={{ width: `${score}%` }}
        />
      </div>

      {/* Score and label */}
      <div className={`flex items-center gap-1 ${classes.text}`}>
        <span className="font-semibold text-gray-900">{score}</span>
        {showLabel && (
          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${bgColor} ${color}`}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Compact score badge for tables
 */
export function EngagementScoreBadge({ score }: { score: number }) {
  const { label, color, bgColor } = getEngagementLevel(score);

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bgColor} ${color}`}>
      <span className="font-bold">{score}</span>
      <span className="hidden sm:inline">- {label}</span>
    </span>
  );
}
