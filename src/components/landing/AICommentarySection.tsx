interface AICommentarySectionProps {
  commentary: string;
}

export function AICommentarySection({ commentary }: AICommentarySectionProps) {
  if (!commentary) return null;

  return (
    <section className="bg-gradient-to-br from-blue-50 to-indigo-50 px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            AI Career Coach Insights
          </h2>
        </div>

        <div className="rounded-xl border border-blue-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="prose prose-blue mx-auto max-w-none">
            {commentary.split('\n\n').map((paragraph, index) => (
              <p key={index} className="text-gray-700">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
