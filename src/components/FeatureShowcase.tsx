'use client';

import { useState, useEffect } from 'react';

const features = [
  {
    step: 1,
    title: 'Upload Your Resume',
    description: 'Our AI parses your experience, skills, and achievements to understand your professional background. Just upload once and we handle the rest.',
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    visual: (
      <div className="relative mx-auto w-full max-w-md">
        <div className="rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="text-sm font-medium text-blue-700">Drop your resume here</p>
          <p className="mt-1 text-xs text-blue-500">PDF, DOC, or DOCX</p>
        </div>
        <div className="absolute -right-4 -top-4 rounded-lg bg-green-500 px-3 py-1 text-xs font-medium text-white shadow-lg">
          AI Parsing
        </div>
      </div>
    ),
  },
  {
    step: 2,
    title: 'Paste the Job Description',
    description: 'For each role you\'re targeting, paste the job description. Our AI analyzes requirements, responsibilities, and company context.',
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    visual: (
      <div className="mx-auto w-full max-w-md rounded-xl bg-white p-6 shadow-xl ring-1 ring-gray-200">
        <div className="mb-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600" />
          <div>
            <p className="font-semibold text-gray-900">Senior Data Engineer</p>
            <p className="text-sm text-gray-500">Acme Corp</p>
          </div>
        </div>
        <div className="space-y-2 rounded-lg bg-gray-50 p-3">
          <div className="h-2 w-full rounded bg-gray-200" />
          <div className="h-2 w-5/6 rounded bg-gray-200" />
          <div className="h-2 w-4/6 rounded bg-gray-200" />
          <div className="h-2 w-full rounded bg-gray-200" />
          <div className="h-2 w-3/4 rounded bg-gray-200" />
        </div>
        <div className="mt-4 flex gap-2">
          <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">Python</span>
          <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">Spark</span>
          <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">AWS</span>
        </div>
      </div>
    ),
  },
  {
    step: 3,
    title: 'AI Generates Your Signal Page',
    description: 'In seconds, we create a role-specific landing page with requirement mapping, a 30/60/90 day plan, career highlights, and AI insights.',
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    visual: (
      <div className="mx-auto w-full max-w-md space-y-3">
        <div className="rounded-xl bg-gradient-to-r from-gray-900 to-gray-800 p-4 text-white shadow-xl">
          <p className="text-xs text-gray-400">Hero Section</p>
          <p className="mt-1 font-semibold">Data Engineering Leader Ready to Scale Your Pipeline</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-green-50 p-3 ring-1 ring-green-200">
            <p className="text-xs font-medium text-green-700">Why I&apos;m a Fit</p>
            <div className="mt-2 space-y-1">
              <div className="h-1.5 w-full rounded bg-green-200" />
              <div className="h-1.5 w-4/5 rounded bg-green-200" />
            </div>
          </div>
          <div className="rounded-lg bg-blue-50 p-3 ring-1 ring-blue-200">
            <p className="text-xs font-medium text-blue-700">30/60/90 Plan</p>
            <div className="mt-2 space-y-1">
              <div className="h-1.5 w-full rounded bg-blue-200" />
              <div className="h-1.5 w-3/4 rounded bg-blue-200" />
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-purple-50 p-3 ring-1 ring-purple-200">
          <p className="text-xs font-medium text-purple-700">AI Career Coach Insights</p>
          <div className="mt-2 space-y-1">
            <div className="h-1.5 w-full rounded bg-purple-200" />
            <div className="h-1.5 w-5/6 rounded bg-purple-200" />
          </div>
        </div>
      </div>
    ),
  },
  {
    step: 4,
    title: 'Share Your Unique URL',
    description: 'Include your SignalPage link in applications, emails to recruiters, or LinkedIn messages. Track views and engagement in real-time.',
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
      </svg>
    ),
    visual: (
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-xl bg-white p-5 shadow-xl ring-1 ring-gray-200">
          <p className="mb-3 text-sm font-medium text-gray-700">Your Signal Page URL</p>
          <div className="flex items-center gap-2 rounded-lg bg-gray-100 p-3">
            <span className="flex-1 truncate text-sm text-gray-600">signalpage.ai/jsmith/acme-data-engineer</span>
            <button className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white">
              Copy
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-2xl font-bold text-gray-900">24</p>
              <p className="text-xs text-gray-500">Views</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-2xl font-bold text-blue-600">2h</p>
              <p className="text-xs text-gray-500">First View</p>
            </div>
            <div className="rounded-lg bg-green-50 p-3">
              <p className="text-2xl font-bold text-green-600">5m</p>
              <p className="text-xs text-gray-500">Last View</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    step: 5,
    title: 'See a Sample Page',
    description: 'Here\'s what a complete Signal Page looks like. Each section is AI-generated and fully customizable to tell your unique story.',
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    visual: (
      <div className="mx-auto w-full max-w-md">
        {/* Sample Signal Page Preview */}
        <div className="rounded-xl bg-white shadow-2xl ring-1 ring-gray-200 overflow-hidden">
          {/* Mini Hero */}
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-4 text-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-sm font-bold">
                AJ
              </div>
              <div>
                <p className="font-semibold text-sm">Alex Johnson</p>
                <p className="text-xs text-gray-300">Senior Full-Stack Engineer @ Nexus Tech</p>
              </div>
            </div>
            <p className="text-xs text-blue-300 font-medium">&quot;Scaling systems from 10K to 10M users&quot;</p>
          </div>

          {/* Mini Sections */}
          <div className="p-3 space-y-2">
            {/* Why I'm a Fit */}
            <div className="rounded-lg bg-green-50 p-2 ring-1 ring-green-100">
              <p className="text-[10px] font-semibold text-green-700 mb-1">Why I&apos;m a Fit</p>
              <div className="space-y-1">
                <div className="flex items-start gap-1">
                  <svg className="h-3 w-3 text-green-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <p className="text-[9px] text-gray-600">6+ years React/Node.js experience</p>
                </div>
                <div className="flex items-start gap-1">
                  <svg className="h-3 w-3 text-green-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <p className="text-[9px] text-gray-600">Led migration to microservices architecture</p>
                </div>
              </div>
            </div>

            {/* 30/60/90 Day Plan Preview */}
            <div className="rounded-lg bg-blue-50 p-2 ring-1 ring-blue-100">
              <p className="text-[10px] font-semibold text-blue-700 mb-1">30/60/90 Day Plan</p>
              <div className="grid grid-cols-3 gap-1 text-center">
                <div className="bg-white rounded p-1">
                  <p className="text-[8px] font-bold text-blue-600">Day 30</p>
                  <p className="text-[7px] text-gray-500">Onboard & Ship</p>
                </div>
                <div className="bg-white rounded p-1">
                  <p className="text-[8px] font-bold text-blue-600">Day 60</p>
                  <p className="text-[7px] text-gray-500">Lead Features</p>
                </div>
                <div className="bg-white rounded p-1">
                  <p className="text-[8px] font-bold text-blue-600">Day 90</p>
                  <p className="text-[7px] text-gray-500">Drive Impact</p>
                </div>
              </div>
            </div>

            {/* Career Highlight */}
            <div className="rounded-lg bg-amber-50 p-2 ring-1 ring-amber-100">
              <p className="text-[10px] font-semibold text-amber-700 mb-1">Career Highlight</p>
              <p className="text-[9px] text-gray-600">Reduced API latency by 68% serving 2M+ daily requests at CloudScale Inc.</p>
            </div>

            {/* Match Score Badge */}
            <div className="flex items-center justify-center pt-1">
              <div className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 px-2 py-0.5">
                <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-[9px] font-bold text-white">92% Match</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
];

export function FeatureShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % features.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isPaused]);

  return (
    <section id="how-it-works" className="px-4 py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-4 text-center text-3xl font-bold text-gray-900 sm:text-4xl">
          How It Works
        </h2>
        <p className="mb-12 text-center text-lg text-gray-600 max-w-2xl mx-auto">
          Create your first Signal Page in under 5 minutes
        </p>

        <div
          className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Left side - Steps */}
          <div className="space-y-4">
            {features.map((feature, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`w-full text-left rounded-xl p-5 transition-all duration-300 ${
                  activeIndex === index
                    ? 'bg-white shadow-lg ring-2 ring-blue-500'
                    : 'bg-white/50 hover:bg-white hover:shadow-md'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors ${
                    activeIndex === index
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {feature.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${
                        activeIndex === index ? 'text-blue-600' : 'text-gray-400'
                      }`}>
                        STEP {feature.step}
                      </span>
                    </div>
                    <h3 className={`mt-1 font-semibold ${
                      activeIndex === index ? 'text-gray-900' : 'text-gray-700'
                    }`}>
                      {feature.title}
                    </h3>
                    <p className={`mt-1 text-sm transition-all duration-300 ${
                      activeIndex === index
                        ? 'text-gray-600 max-h-20 opacity-100'
                        : 'text-gray-500 max-h-0 opacity-0 overflow-hidden'
                    }`}>
                      {feature.description}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                {activeIndex === index && !isPaused && (
                  <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-blue-600 animate-progress"
                      style={{ animationDuration: '5s' }}
                    />
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Right side - Visual */}
          <div className="relative min-h-[400px] flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-3xl" />
            <div className="relative z-10 w-full p-6">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className={`transition-all duration-500 ${
                    activeIndex === index
                      ? 'opacity-100 scale-100'
                      : 'opacity-0 scale-95 absolute inset-0 pointer-events-none'
                  }`}
                >
                  {feature.visual}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile dots indicator */}
        <div className="mt-8 flex justify-center gap-2 lg:hidden">
          {features.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`h-2 rounded-full transition-all ${
                activeIndex === index
                  ? 'w-8 bg-blue-600'
                  : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
        .animate-progress {
          animation: progress linear forwards;
        }
      `}</style>
    </section>
  );
}
