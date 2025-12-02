import type { HeroSection as HeroSectionType, User, Job } from '@/types';

interface HeroSectionProps {
  hero: HeroSectionType;
  user: Pick<User, 'full_name' | 'avatar_url' | 'linkedin_url'>;
  job: Pick<Job, 'role_title' | 'company_name'>;
}

export function HeroSection({ hero, user, job }: HeroSectionProps) {
  return (
    <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4 py-16 text-white sm:py-24">
      <div className="mx-auto max-w-4xl text-center">
        {/* Avatar */}
        {user.avatar_url && (
          <div className="mb-6">
            <img
              src={user.avatar_url}
              alt={user.full_name}
              className="mx-auto h-24 w-24 rounded-full border-4 border-white/20 object-cover"
            />
          </div>
        )}

        {/* Name and Role */}
        <div className="mb-4">
          <h1 className="mb-2 text-3xl font-bold sm:text-4xl md:text-5xl">
            {user.full_name}
          </h1>
          <p className="text-lg text-blue-400 sm:text-xl">
            {job.role_title} @ {job.company_name}
          </p>
        </div>

        {/* Tagline */}
        <p className="mb-6 text-xl font-medium text-gray-200 sm:text-2xl md:text-3xl">
          {hero.tagline}
        </p>

        {/* Value Promise */}
        <p className="mx-auto max-w-2xl text-lg text-gray-300">
          {hero.value_promise}
        </p>

        {/* Social Links */}
        <div className="mt-8 flex justify-center gap-4">
          {user.linkedin_url && (
            <a
              href={user.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-white/10 p-3 transition-colors hover:bg-white/20"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
