'use client';

import { useState } from 'react';

interface TrendDataPoint {
  date: string;
  views: number;
  uniqueVisitors: number;
}

interface TrendChartProps {
  data: TrendDataPoint[];
  height?: number;
}

export function TrendChart({ data, height = 200 }: TrendChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [metric, setMetric] = useState<'views' | 'uniqueVisitors'>('views');

  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200"
        style={{ height }}
      >
        <p className="text-sm text-gray-500">No data available</p>
      </div>
    );
  }

  const values = data.map(d => d[metric]);
  const maxValue = Math.max(...values, 1);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div>
      {/* Metric Toggle */}
      <div className="flex justify-end mb-3">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
          <button
            onClick={() => setMetric('views')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              metric === 'views'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Views
          </button>
          <button
            onClick={() => setMetric('uniqueVisitors')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              metric === 'uniqueVisitors'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Unique
          </button>
        </div>
      </div>

      {/* Chart */}
      <div
        className="relative bg-gray-50 rounded-lg border border-gray-200 p-4"
        style={{ height }}
      >
        {/* Y-axis labels */}
        <div className="absolute left-2 top-4 bottom-8 flex flex-col justify-between text-xs text-gray-400">
          <span>{maxValue}</span>
          <span>{Math.round(maxValue / 2)}</span>
          <span>0</span>
        </div>

        {/* Bars */}
        <div className="ml-8 h-full flex items-end gap-1 pb-6">
          {data.map((point, index) => {
            const value = point[metric];
            const barHeight = maxValue > 0 ? (value / maxValue) * 100 : 0;
            const isHovered = hoveredIndex === index;

            return (
              <div
                key={point.date}
                className="flex-1 flex flex-col items-center relative"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Tooltip */}
                {isHovered && (
                  <div className="absolute bottom-full mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-10">
                    <div className="font-medium">{formatDate(point.date)}</div>
                    <div>{value} {metric === 'views' ? 'views' : 'visitors'}</div>
                  </div>
                )}

                {/* Bar */}
                <div
                  className={`w-full rounded-t transition-all duration-150 cursor-pointer ${
                    isHovered ? 'bg-blue-500' : 'bg-blue-400'
                  }`}
                  style={{
                    height: `${barHeight}%`,
                    minHeight: value > 0 ? '4px' : '0',
                  }}
                />

                {/* X-axis label (show every other for space) */}
                {index % 2 === 0 && (
                  <span className="absolute -bottom-5 text-[10px] text-gray-400 whitespace-nowrap">
                    {formatDate(point.date).split(' ')[1]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
