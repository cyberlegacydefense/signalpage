import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui';
import { PublicHeader } from '@/components/PublicHeader';

export default function PrivacyPage() {
  const currentYear = new Date().getFullYear();
  const lastUpdated = 'December 2, 2024';

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <PublicHeader showNavLinks={false} />

      {/* Content */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Privacy Policy
          </h1>
          <p className="mt-4 text-sm text-gray-500">
            Last updated: {lastUpdated}
          </p>

          <div className="mt-12 prose prose-gray max-w-none">
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              Introduction
            </h2>
            <p className="text-gray-600 mb-4">
              SignalPage (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy.
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information
              when you use our website and services. SignalPage is a product of Applied AI Ventures.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              Information We Collect
            </h2>
            <h3 className="text-lg font-medium text-gray-900 mt-6 mb-3">
              Information You Provide
            </h3>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li>Account information (name, email address, password)</li>
              <li>Profile information (headline, bio, social media links)</li>
              <li>Resume content (work experience, education, skills)</li>
              <li>Job descriptions and company information you submit</li>
              <li>Content you create or edit on your Signal Pages</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mt-6 mb-3">
              Information Collected Automatically
            </h3>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li>Log data (IP address, browser type, pages visited)</li>
              <li>Device information (device type, operating system)</li>
              <li>Usage data (features used, time spent on pages)</li>
              <li>Analytics data for your Signal Pages (page views, visitor count)</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              How We Use Your Information
            </h2>
            <p className="text-gray-600 mb-4">We use your information to:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li>Provide and maintain our services</li>
              <li>Generate personalized Signal Pages using AI</li>
              <li>Process your resume and match it to job requirements</li>
              <li>Provide analytics about your Signal Page performance</li>
              <li>Send you service-related communications</li>
              <li>Improve and develop new features</li>
              <li>Protect against fraud and abuse</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              AI Processing
            </h2>
            <p className="text-gray-600 mb-4">
              We use AI services (including OpenAI and Anthropic) to process your resume and job
              descriptions to generate personalized content. This processing is done securely, and
              your data is not used to train AI models. The AI-generated content is stored in your
              account and is only visible to you and those you share your Signal Page URL with.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              Data Sharing
            </h2>
            <p className="text-gray-600 mb-4">We do not sell your personal information. We may share your information with:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li>Service providers who help us operate our platform (hosting, analytics)</li>
              <li>AI providers for content generation (with appropriate data processing agreements)</li>
              <li>Legal authorities when required by law</li>
            </ul>
            <p className="text-gray-600 mb-4">
              Your public Signal Pages are visible to anyone with the URL. You control when to
              publish or unpublish each page.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              Data Security
            </h2>
            <p className="text-gray-600 mb-4">
              We implement industry-standard security measures to protect your data, including:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li>Encryption of data in transit (HTTPS/TLS)</li>
              <li>Encryption of data at rest</li>
              <li>Secure authentication practices</li>
              <li>Regular security audits and monitoring</li>
              <li>Access controls and employee training</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              Your Rights
            </h2>
            <p className="text-gray-600 mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your account and associated data</li>
              <li>Export your data</li>
              <li>Opt out of marketing communications</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              Data Retention
            </h2>
            <p className="text-gray-600 mb-4">
              We retain your data for as long as your account is active or as needed to provide
              services. You can delete your account at any time, and we will remove your personal
              data within 30 days, except where we are required to retain it for legal purposes.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              Cookies
            </h2>
            <p className="text-gray-600 mb-4">
              We use essential cookies to enable core functionality like authentication. We may
              also use analytics cookies to understand how users interact with our service. You
              can control cookie preferences through your browser settings.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              Children&apos;s Privacy
            </h2>
            <p className="text-gray-600 mb-4">
              Our services are not intended for users under 16 years of age. We do not knowingly
              collect personal information from children.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              Changes to This Policy
            </h2>
            <p className="text-gray-600 mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any
              material changes by posting the new policy on this page and updating the
              &quot;Last updated&quot; date.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              Contact Us
            </h2>
            <p className="text-gray-600 mb-4">
              If you have questions about this Privacy Policy or our data practices, please contact us at:
            </p>
            <p className="text-gray-600 mb-4">
              <strong>Applied AI Ventures</strong><br />
              Email: <a href="mailto:info@signalpage.ai" className="text-blue-600 hover:underline">info@signalpage.ai</a>
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-auto">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span>&copy; {currentYear} SignalPage</span>
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
