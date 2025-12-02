import type { Plan306090 } from '@/types';

interface Plan306090SectionProps {
  plan: Plan306090;
  companyName: string;
}

export function Plan306090Section({ plan, companyName }: Plan306090SectionProps) {
  const phases = [
    { data: plan.day_30, color: 'blue', label: 'First 30 Days' },
    { data: plan.day_60, color: 'purple', label: 'Days 31-60' },
    { data: plan.day_90, color: 'green', label: 'Days 61-90' },
  ];

  return (
    <section className="bg-white px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-4 text-center text-2xl font-bold text-gray-900 sm:text-3xl">
          My 30/60/90 Day Plan for {companyName}
        </h2>

        {plan.intro && (
          <p className="mx-auto mb-12 max-w-2xl text-center text-gray-600">
            {plan.intro}
          </p>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          {phases.map((phase, index) => {
            const colorMap = {
              blue: {
                bg: 'bg-blue-50',
                border: 'border-blue-200',
                badge: 'bg-blue-600',
                bullet: 'text-blue-600',
              },
              purple: {
                bg: 'bg-purple-50',
                border: 'border-purple-200',
                badge: 'bg-purple-600',
                bullet: 'text-purple-600',
              },
              green: {
                bg: 'bg-green-50',
                border: 'border-green-200',
                badge: 'bg-green-600',
                bullet: 'text-green-600',
              },
            } as const;
            const colorClasses = colorMap[phase.color as keyof typeof colorMap];

            return (
              <div
                key={index}
                className={`rounded-xl border ${colorClasses.border} ${colorClasses.bg} p-6`}
              >
                <div
                  className={`mb-4 inline-block rounded-full ${colorClasses.badge} px-3 py-1 text-sm font-medium text-white`}
                >
                  {phase.label}
                </div>

                <h3 className="mb-4 text-lg font-semibold text-gray-900">
                  {phase.data.title}
                </h3>

                <div className="mb-4">
                  <p className="mb-2 text-sm font-medium text-gray-500">
                    Objectives
                  </p>
                  <ul className="space-y-2">
                    {phase.data.objectives.map((objective, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <svg
                          className={`mt-0.5 h-4 w-4 shrink-0 ${colorClasses.bullet}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {objective}
                      </li>
                    ))}
                  </ul>
                </div>

                {phase.data.deliverables && phase.data.deliverables.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-gray-500">
                      Deliverables
                    </p>
                    <ul className="space-y-1">
                      {phase.data.deliverables.map((deliverable, i) => (
                        <li
                          key={i}
                          className="rounded bg-white/50 px-2 py-1 text-sm text-gray-700"
                        >
                          {deliverable}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
