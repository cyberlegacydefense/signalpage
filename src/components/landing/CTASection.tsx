import type { User } from '@/types';

interface CTASectionProps {
  user: Pick<User, 'full_name' | 'email' | 'linkedin_url' | 'portfolio_url'>;
  companyName: string;
  roleTitle: string;
}

export function CTASection({ user, companyName, roleTitle }: CTASectionProps) {
  return (
    <section className="bg-gray-900 px-4 py-16 text-white sm:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="mb-4 text-2xl font-bold sm:text-3xl">
          Let&apos;s Talk About The {roleTitle} Role
        </h2>
        <p className="mb-8 text-lg text-gray-300">
          I&apos;m excited about the opportunity at {companyName}. Let&apos;s connect and
          discuss how I can contribute to your team.
        </p>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          {user.linkedin_url && (
            <a
              href={user.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
              Connect on LinkedIn
            </a>
          )}

          <a
            href={`mailto:${user.email}?subject=Re: ${roleTitle} at ${companyName}`}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-medium text-gray-900 transition-colors hover:bg-gray-100"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            Send an Email
          </a>
        </div>

        {user.portfolio_url && (
          <p className="mt-6 text-sm text-gray-400">
            Or explore more of my work at{' '}
            <a
              href={user.portfolio_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline hover:text-blue-300"
            >
              my portfolio
            </a>
          </p>
        )}
      </div>
    </section>
  );
}
