import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui';
import { FeatureShowcase } from '@/components/FeatureShowcase';
import { PublicHeader } from '@/components/PublicHeader';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <PublicHeader />

      {/* Hero */}
      <section className="px-4 py-20 sm:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-purple-100 px-4 py-1.5 text-sm font-medium text-purple-700">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Now with AI Interview Coach
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            Land the interview.{' '}
            <span className="text-blue-600">Ace the interview.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 sm:text-xl">
            Create role-specific landing pages that get you noticed, then prepare with
            AI-generated interview questions and personalized answers based on your actual resume.
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
                The job search is broken
              </h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start gap-2">
                  <svg className="mt-1 h-5 w-5 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Generic applications blend in with hundreds of others
                </li>
                <li className="flex items-start gap-2">
                  <svg className="mt-1 h-5 w-5 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  No way to show you&apos;ve researched the company
                </li>
                <li className="flex items-start gap-2">
                  <svg className="mt-1 h-5 w-5 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Interview prep is generic and not role-specific
                </li>
                <li className="flex items-start gap-2">
                  <svg className="mt-1 h-5 w-5 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  You land interviews but don&apos;t know how to leverage your experience
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-green-100 bg-white p-8">
              <div className="mb-4 inline-block rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                The Solution
              </div>
              <h3 className="mb-4 text-2xl font-bold text-gray-900">
                One platform, complete preparation
              </h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start gap-2">
                  <svg className="mt-1 h-5 w-5 shrink-0 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Role-specific landing pages that get you noticed
                </li>
                <li className="flex items-start gap-2">
                  <svg className="mt-1 h-5 w-5 shrink-0 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  AI interview questions tailored to the job + your resume
                </li>
                <li className="flex items-start gap-2">
                  <svg className="mt-1 h-5 w-5 shrink-0 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Personalized answer scripts using your actual experience
                </li>
                <li className="flex items-start gap-2">
                  <svg className="mt-1 h-5 w-5 shrink-0 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Gap analysis to address concerns before they ask
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Interactive Feature Showcase */}
      <FeatureShowcase />

      {/* What's Included */}
      <section className="bg-gray-900 px-4 py-20 text-white">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-4 text-center text-3xl font-bold sm:text-4xl">
            Everything You Need to Succeed
          </h2>
          <p className="mb-12 text-center text-gray-400 text-lg max-w-2xl mx-auto">
            From standing out in your application to acing the interview
          </p>

          {/* Signal Page Features */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-blue-400 mb-6 flex items-center gap-2">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Signal Page Builder
            </h3>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: 'Personalized Hero',
                  description: 'A compelling tagline tailored to the specific company and role.',
                },
                {
                  title: 'Requirement Mapping',
                  description: 'Map your experience directly to job requirements.',
                },
                {
                  title: '30/60/90 Day Plan',
                  description: 'Show how you\'d approach the first 90 days on the job.',
                },
                {
                  title: 'Career Highlights',
                  description: 'Your most relevant achievements for this opportunity.',
                },
                {
                  title: 'Cover Letters & Emails',
                  description: 'Generate tailored cover letters and interview follow-up emails.',
                },
                {
                  title: 'View Tracking',
                  description: 'Know when recruiters view your page and what they focus on.',
                },
              ].map((feature, i) => (
                <div key={i} className="rounded-xl bg-gray-800 p-5">
                  <h4 className="mb-2 font-semibold">{feature.title}</h4>
                  <p className="text-sm text-gray-400">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Interview Coach Features */}
          <div className="mt-12 pt-8 border-t border-gray-800">
            <h3 className="text-xl font-semibold text-purple-400 mb-6 flex items-center gap-2">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              AI Interview Coach
              <span className="ml-2 text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">Premium</span>
            </h3>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: 'Role-Specific Questions',
                  description: '20+ interview questions likely to be asked for this exact role.',
                },
                {
                  title: 'Personalized Answers',
                  description: 'AI-generated answer scripts using your actual resume experience.',
                },
                {
                  title: 'Gap Analysis',
                  description: 'Identify skill gaps and prepare responses to address them.',
                },
                {
                  title: 'Strength Highlights',
                  description: 'Know exactly which experiences to emphasize in your answers.',
                },
                {
                  title: 'Strategic Tips',
                  description: 'Quick insights on company culture and what interviewers want.',
                },
                {
                  title: 'Category Coverage',
                  description: 'Behavioral, technical, culture fit, and role-specific questions.',
                },
              ].map((feature, i) => (
                <div key={i} className="rounded-xl bg-gray-800/50 border border-purple-500/20 p-5">
                  <h4 className="mb-2 font-semibold">{feature.title}</h4>
                  <p className="text-sm text-gray-400">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Interview Coach Highlight */}
      <section className="px-4 py-20 bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-purple-100 px-4 py-1.5 text-sm font-medium text-purple-700">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                AI Interview Coach
              </div>
              <h2 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl">
                Don&apos;t just land the interview.{' '}
                <span className="text-purple-600">Crush it.</span>
              </h2>
              <p className="mb-6 text-lg text-gray-600">
                Most candidates prepare with generic interview questions. With Interview Coach,
                you get AI-generated questions and personalized answer scripts based on the
                specific job posting and your actual resume experience.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <svg className="mt-0.5 h-6 w-6 text-purple-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-700">Know exactly what questions to expect for this specific role</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="mt-0.5 h-6 w-6 text-purple-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-700">Get answer scripts that highlight your relevant experience</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="mt-0.5 h-6 w-6 text-purple-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-700">Prepare for gap-probing questions about your experience</span>
                </li>
              </ul>
              <Link href="/pricing">
                <Button variant="primary" size="lg" className="bg-purple-600 hover:bg-purple-700">
                  Upgrade to Interview Coach
                </Button>
              </Link>
            </div>
            <div className="relative">
              <div className="rounded-2xl bg-white shadow-xl p-6 border border-gray-100">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Sample Question</span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Behavioral</span>
                </div>
                <p className="text-lg font-medium text-gray-900 mb-4">
                  &quot;Tell me about a time you had to lead a project with tight deadlines and limited resources.&quot;
                </p>
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="h-5 w-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="text-sm font-medium text-purple-700">AI-Generated Answer</span>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    &quot;At [Previous Company], I led the migration of our payment system to a new
                    provider on a 6-week timeline. With budget constraints, I prioritized ruthlessly,
                    identifying the 3 critical integrations needed for launch and deferring
                    nice-to-haves. I held daily 15-minute standups to surface blockers fast...&quot;
                  </p>
                  <p className="text-xs text-gray-400 mt-2 italic">
                    Based on your resume: Payment Systems Lead at TechCorp
                  </p>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 rounded-xl bg-purple-600 text-white p-4 shadow-lg">
                <p className="text-2xl font-bold">20+</p>
                <p className="text-sm text-purple-200">Tailored Questions</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl">
            Ready to land your dream job?
          </h2>
          <p className="mb-8 text-lg text-gray-600">
            Create your first Signal Page for free. When you land the interview,
            upgrade to Interview Coach to prepare with confidence.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/signup">
              <Button variant="primary" size="xl">
                Create Your First Page
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" size="xl">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-auto">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span>&copy; {new Date().getFullYear()} SignalPage</span>
              <span className="text-gray-300">·</span>
              <a href="mailto:info@signalpage.ai" className="hover:text-gray-700">Support</a>
              <span className="text-gray-300">·</span>
              <Link href="/privacy" className="hover:text-gray-700">Privacy</Link>
              <span className="text-gray-300">·</span>
              <Link href="/terms" className="hover:text-gray-700">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
