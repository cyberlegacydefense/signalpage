import type { FitSection as FitSectionType } from '@/types';

interface FitSectionProps {
  fitSection: FitSectionType;
  companyName: string;
}

export function FitSection({ fitSection, companyName }: FitSectionProps) {
  return (
    <section className="bg-white px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-4 text-center text-2xl font-bold text-gray-900 sm:text-3xl">
          Why I&apos;m a Strong Fit for {companyName}
        </h2>

        {fitSection.intro && (
          <p className="mx-auto mb-12 max-w-2xl text-center text-gray-600">
            {fitSection.intro}
          </p>
        )}

        <div className="space-y-6">
          {fitSection.fit_bullets.map((bullet, index) => (
            <div
              key={index}
              className="rounded-xl border border-gray-200 bg-gray-50 p-6 transition-shadow hover:shadow-md"
            >
              <div className="mb-3 flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium text-gray-500">
                    Your requirement:
                  </p>
                  <p className="text-gray-900">{bullet.requirement}</p>
                </div>
              </div>
              <div className="ml-11">
                <p className="font-medium text-gray-500">My experience:</p>
                <p className="text-gray-900">{bullet.evidence}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
