import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-100">
        <div className="mx-auto flex h-32 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center">
            <Image
              src="/signalpage-logo.png"
              alt="SignalPage"
              width={600}
              height={150}
              className="h-24 sm:h-28 w-auto"
              priority
            />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/faq" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              How It Works
            </Link>
            <Link href="/auth/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/auth/signup">
              <Button variant="primary">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-4 py-20 sm:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            Stop sending the same resume to{' '}
            <span className="text-blue-600">100 jobs</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 sm:text-xl">
            Create role-specific landing pages that prove you did your homework.
            Show companies exactly why you&apos;re a great fit with tailored content,
            a 30/60/90 day plan, and AI-powered insights.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/auth/signup">
              <Button variant="primary" size="xl">
                Create Your First Page
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button variant="outline" size="xl">
                See How It Works
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Problem/Solution */}
      <section className="bg-gray-50 px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 md:grid-cols-2">
            <div className="rounded-2xl border border-red-100 bg-white p-8">
              <div className="mb-4 inline-block rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
                The Problem
              </div>
              <h3 className="mb-4 text-2xl font-bold text-gray-900">
                Generic applications get ignored
              </h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start gap-2">
                  <svg className="mt-1 h-5 w-5 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  LinkedIn shows the same profile to every company
                </li>
                <li className="flex items-start gap-2">
                  <svg className="mt-1 h-5 w-5 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Resumes are static and hard to fully tailor
                </li>
                <li className="flex items-start gap-2">
                  <svg className="mt-1 h-5 w-5 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  No way to show you researched the company
                </li>
                <li className="flex items-start gap-2">
                  <svg className="mt-1 h-5 w-5 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  You blend in with hundreds of other applicants
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-green-100 bg-white p-8">
              <div className="mb-4 inline-block rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                The Solution
              </div>
              <h3 className="mb-4 text-2xl font-bold text-gray-900">
                Role-specific landing pages
              </h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start gap-2">
                  <svg className="mt-1 h-5 w-5 shrink-0 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Map your experience directly to job requirements
                </li>
                <li className="flex items-start gap-2">
                  <svg className="mt-1 h-5 w-5 shrink-0 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Show a custom 30/60/90 day plan for the role
                </li>
                <li className="flex items-start gap-2">
                  <svg className="mt-1 h-5 w-5 shrink-0 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Highlight relevant projects and case studies
                </li>
                <li className="flex items-start gap-2">
                  <svg className="mt-1 h-5 w-5 shrink-0 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Track who views your page and what they focus on
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-gray-900 sm:text-4xl">
            How It Works
          </h2>

          <div className="space-y-12">
            <div className="flex gap-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
                1
              </div>
              <div>
                <h3 className="mb-2 text-xl font-semibold text-gray-900">
                  Upload your resume once
                </h3>
                <p className="text-gray-600">
                  Our AI parses your experience, skills, and achievements to understand
                  your professional background.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
                2
              </div>
              <div>
                <h3 className="mb-2 text-xl font-semibold text-gray-900">
                  Paste a job description
                </h3>
                <p className="text-gray-600">
                  For each role you&apos;re interested in, just paste the job description
                  and company URL.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
                3
              </div>
              <div>
                <h3 className="mb-2 text-xl font-semibold text-gray-900">
                  AI generates your Signal Page
                </h3>
                <p className="text-gray-600">
                  In seconds, we create a role-specific landing page with requirement
                  mapping, a 30/60/90 plan, and relevant highlights.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
                4
              </div>
              <div>
                <h3 className="mb-2 text-xl font-semibold text-gray-900">
                  Share your unique URL
                </h3>
                <p className="text-gray-600">
                  Include your SignalPage link in applications, emails to recruiters,
                  or even as a QR code on your resume.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="bg-gray-900 px-4 py-20 text-white">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold sm:text-4xl">
            Every Signal Page Includes
          </h2>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: 'Personalized Hero',
                description: 'A compelling tagline and value proposition tailored to the specific company and role.',
              },
              {
                title: 'Requirement Mapping',
                description: 'Explicit connections between job requirements and your relevant experience.',
              },
              {
                title: 'Career Highlights',
                description: 'Your most relevant achievements, selected and framed for this opportunity.',
              },
              {
                title: '30/60/90 Day Plan',
                description: 'A concrete plan showing how you\'d approach the first 90 days on the job.',
              },
              {
                title: 'Case Studies',
                description: 'Relevant projects from your background that demonstrate applicable skills.',
              },
              {
                title: 'AI Coach Insights',
                description: 'Strategic commentary explaining why you\'re a strong match for this role.',
              },
            ].map((feature, i) => (
              <div key={i} className="rounded-xl bg-gray-800 p-6">
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl">
            Ready to stand out?
          </h2>
          <p className="mb-8 text-lg text-gray-600">
            Create your first Signal Page in minutes. Show companies you&apos;re serious
            about their opportunity.
          </p>
          <Link href="/auth/signup">
            <Button variant="primary" size="xl">
              Get Started Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <Image
              src="/signalpage-logo.png"
              alt="SignalPage"
              width={400}
              height={100}
              className="h-20 w-auto"
            />
            <div className="flex items-center gap-6 text-sm">
              <Link href="/faq" className="text-gray-600 hover:text-gray-900">
                FAQ
              </Link>
              <Link href="/privacy" className="text-gray-600 hover:text-gray-900">
                Privacy Policy
              </Link>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-200 pt-8 text-center text-sm text-gray-500">
            <p>&copy; {new Date().getFullYear()} SignalPage. A product of Applied AI Ventures.</p>
            <p className="mt-1">Stand out, don&apos;t blend in.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
