import type { CaseStudy } from '@/types';

interface CaseStudiesSectionProps {
  caseStudies: CaseStudy[];
}

export function CaseStudiesSection({ caseStudies }: CaseStudiesSectionProps) {
  if (!caseStudies || caseStudies.length === 0) return null;

  return (
    <section className="bg-gray-50 px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-12 text-center text-2xl font-bold text-gray-900 sm:text-3xl">
          Relevant Projects & Case Studies
        </h2>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {caseStudies.map((study, index) => (
            <div
              key={index}
              className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              {study.image_url && (
                <div className="aspect-video bg-gray-100">
                  <img
                    src={study.image_url}
                    alt={study.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              <div className="flex flex-1 flex-col p-5">
                <span className="mb-2 text-xs font-medium uppercase tracking-wide text-blue-600">
                  {study.relevance}
                </span>

                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  {study.title}
                </h3>

                <p className="mb-4 flex-1 text-sm text-gray-600">
                  {study.description}
                </p>

                {study.link && (
                  <a
                    href={study.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    View Project
                    <svg
                      className="ml-1 h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
