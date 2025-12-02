import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui';

const faqs = [
  {
    question: 'What is SignalPage?',
    answer:
      'SignalPage is a platform that helps job seekers create role-specific landing pages for each job application. Instead of sending the same generic resume to every company, you create a tailored page that maps your experience directly to each job\'s requirements.',
  },
  {
    question: 'How does it work?',
    answer:
      'First, you upload your resume and create a profile. Then, for each job you\'re interested in, you paste the job description. Our AI analyzes both and generates a personalized landing page with a tailored headline, requirement mapping, relevant career highlights, a 30/60/90 day plan, and case studies.',
  },
  {
    question: 'What\'s included in each Signal Page?',
    answer:
      'Every Signal Page includes: a personalized hero section with a compelling tagline, a "Why I\'m a Fit" section mapping job requirements to your experience, relevant career highlights with metrics, a customized 30/60/90 day plan, case studies showcasing relevant projects, and AI coach commentary explaining why you\'re a strong match.',
  },
  {
    question: 'How do I share my Signal Page?',
    answer:
      'Each Signal Page has a unique URL (e.g., signalpage.com/yourname/company-role). You can include this link in your cover letters, emails to recruiters, LinkedIn messages, or even as a QR code on your resume.',
  },
  {
    question: 'Can I have multiple resumes?',
    answer:
      'Yes! You can upload up to 5 different resumes tailored for different types of roles (e.g., Technical, Management, Sales). You can tag each resume and select which one to use when generating a new Signal Page.',
  },
  {
    question: 'Can I edit the generated content?',
    answer:
      'Yes, you can preview your page before publishing and make adjustments. The AI provides a great starting point, but you have full control over the final content.',
  },
  {
    question: 'Is my data secure?',
    answer:
      'Absolutely. We use enterprise-grade security and encryption. Your resume data is only used to generate your Signal Pages and is never shared with third parties. See our Privacy Policy for more details.',
  },
  {
    question: 'Can I track who views my page?',
    answer:
      'Yes! Each Signal Page includes basic analytics showing page views and engagement. This helps you understand which companies are interested in your profile.',
  },
  {
    question: 'What AI technology do you use?',
    answer:
      'We use a combination of OpenAI and Anthropic\'s Claude models to analyze job descriptions and generate personalized content. Our prompts are carefully crafted to produce professional, relevant, and accurate content.',
  },
  {
    question: 'Is SignalPage free?',
    answer:
      'We offer a free tier that lets you create Signal Pages to try out the platform. For unlimited pages and advanced features, we offer premium plans. Contact us for pricing details.',
  },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 sm:h-20 items-center justify-between">
            <Link href="/" className="flex-shrink-0">
              <Image
                src="/signalpage-logo.png"
                alt="SignalPage"
                width={822}
                height={234}
                className="h-8 sm:h-10 md:h-12 w-auto"
                priority
              />
            </Link>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/auth/login">
                <Button variant="ghost" className="text-xs sm:text-sm px-2 sm:px-4">Sign in</Button>
              </Link>
              <Link href="/auth/signup">
                <Button variant="primary" className="text-xs sm:text-sm px-2 sm:px-4">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-b from-blue-50 to-white px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Frequently Asked Questions
          </h1>
          <p className="mt-6 text-lg text-gray-600">
            Everything you need to know about SignalPage and how it helps you stand out in your job search.
          </p>
        </div>
      </section>

      {/* FAQ List */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <div className="divide-y divide-gray-200">
            {faqs.map((faq, index) => (
              <div key={index} className="py-8">
                <h3 className="text-lg font-semibold text-gray-900">
                  {faq.question}
                </h3>
                <p className="mt-3 text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works - Visual Steps */}
      <section className="bg-gray-50 px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-gray-900">
            How It Works
          </h2>

          <div className="grid gap-8 md:grid-cols-2">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600">
                1
              </div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900">
                Upload Your Resume
              </h3>
              <p className="text-gray-600">
                Paste your resume text or upload a PDF/DOC file. Our AI parses your experience, skills, education, and achievements.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600">
                2
              </div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900">
                Paste a Job Description
              </h3>
              <p className="text-gray-600">
                For each role you&apos;re targeting, paste the job posting. We extract requirements, responsibilities, and company context.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600">
                3
              </div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900">
                AI Generates Your Page
              </h3>
              <p className="text-gray-600">
                In seconds, we create a role-specific landing page with tailored content, a 30/60/90 plan, and relevant highlights.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600">
                4
              </div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900">
                Share & Track
              </h3>
              <p className="text-gray-600">
                Publish your page, copy the URL, and include it in your applications. Track views and engagement in your dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900">
            Ready to stand out?
          </h2>
          <p className="mb-8 text-lg text-gray-600">
            Create your first Signal Page in minutes and show companies you&apos;re serious about their opportunity.
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
              width={822}
              height={234}
              className="h-10 w-auto"
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
