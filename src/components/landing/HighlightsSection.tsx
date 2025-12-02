import type { HighlightSection } from '@/types';

interface HighlightsSectionProps {
  highlights: HighlightSection[];
}

export function HighlightsSection({ highlights }: HighlightsSectionProps) {
  if (!highlights || highlights.length === 0) return null;

  return (
    <section className="bg-gray-50 px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-12 text-center text-2xl font-bold text-gray-900 sm:text-3xl">
          Relevant Career Highlights
        </h2>

        <div className="space-y-8">
          {highlights.map((highlight, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
            >
              {/* Header */}
              <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {highlight.role}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {highlight.company}
                      {highlight.domain && ` · ${highlight.domain}`}
                    </p>
                  </div>
                  {highlight.relevance_note && (
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                      Relevant: {highlight.relevance_note}
                    </span>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="space-y-4 p-6">
                <div>
                  <p className="mb-1 text-sm font-medium uppercase tracking-wide text-gray-500">
                    The Challenge
                  </p>
                  <p className="text-gray-700">{highlight.problem}</p>
                </div>

                <div>
                  <p className="mb-1 text-sm font-medium uppercase tracking-wide text-gray-500">
                    What I Did
                  </p>
                  <p className="text-gray-700">{highlight.solution}</p>
                </div>

                <div>
                  <p className="mb-1 text-sm font-medium uppercase tracking-wide text-gray-500">
                    The Impact
                  </p>
                  <p className="font-medium text-gray-900">{highlight.impact}</p>

                  {highlight.metrics && highlight.metrics.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {highlight.metrics.map((metric, i) => (
                        <span
                          key={i}
                          className="rounded-lg bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700"
                        >
                          {metric}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
