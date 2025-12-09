import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui';
import { PublicHeader } from '@/components/PublicHeader';

export default function TermsPage() {
  const currentYear = new Date().getFullYear();
  const lastUpdated = 'December 3, 2024';

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <PublicHeader showNavLinks={false} />

      {/* Content */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Terms of Service
          </h1>
          <p className="mt-4 text-sm text-gray-500">
            Last updated: {lastUpdated}
          </p>

          <div className="mt-12 prose prose-gray max-w-none">
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              1. Acceptance of Terms
            </h2>
            <p className="text-gray-600 mb-4">
              By accessing or using SignalPage (&quot;the Service&quot;), operated by Applied AI Ventures (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              2. Description of Service
            </h2>
            <p className="text-gray-600 mb-4">
              SignalPage is a platform that helps job seekers create personalized, role-specific landing pages to showcase their qualifications to potential employers. The Service uses artificial intelligence to generate content based on user-provided information including resumes and job descriptions.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              3. User Accounts
            </h2>
            <p className="text-gray-600 mb-4">
              To use certain features of the Service, you must create an account. You are responsible for:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized use of your account</li>
              <li>Providing accurate and complete information when creating your account</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              4. User Content
            </h2>
            <p className="text-gray-600 mb-4">
              You retain ownership of all content you upload to the Service, including resumes, job descriptions, and personal information. By using the Service, you grant us a limited license to process this content solely for the purpose of providing the Service to you.
            </p>
            <p className="text-gray-600 mb-4">
              You represent and warrant that:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
              <li>You have the right to upload and use all content you provide</li>
              <li>Your content does not infringe on any third party&apos;s intellectual property rights</li>
              <li>Your content is accurate and not misleading</li>
              <li>Your use of the Service complies with all applicable laws</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              5. AI-Generated Content
            </h2>
            <p className="text-gray-600 mb-4">
              The Service uses artificial intelligence to generate content for your Signal Pages. You acknowledge that:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
              <li>AI-generated content may require review and editing before use</li>
              <li>You are responsible for reviewing all generated content for accuracy</li>
              <li>We do not guarantee the accuracy, completeness, or suitability of AI-generated content</li>
              <li>You are solely responsible for the content you publish and share with potential employers</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              6. Subscription and Payments
            </h2>
            <p className="text-gray-600 mb-4">
              Some features of the Service require a paid subscription. By subscribing, you agree to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
              <li>Pay all applicable fees as described at the time of purchase</li>
              <li>Automatic renewal of your subscription unless cancelled</li>
              <li>Provide accurate billing information</li>
            </ul>
            <p className="text-gray-600 mb-4">
              Refunds are handled on a case-by-case basis. Contact us at info@signalpage.ai for refund requests.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              7. Prohibited Uses
            </h2>
            <p className="text-gray-600 mb-4">
              You agree not to use the Service to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
              <li>Create false, misleading, or fraudulent content</li>
              <li>Impersonate another person or misrepresent your qualifications</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Attempt to gain unauthorized access to any part of the Service</li>
              <li>Use the Service for any illegal or unauthorized purpose</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              8. Intellectual Property
            </h2>
            <p className="text-gray-600 mb-4">
              The Service, including its design, features, and content (excluding user content), is owned by Applied AI Ventures and protected by intellectual property laws. You may not copy, modify, distribute, or create derivative works based on the Service without our express written permission.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              9. Disclaimer of Warranties
            </h2>
            <p className="text-gray-600 mb-4">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT GUARANTEE THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE. WE DO NOT GUARANTEE ANY SPECIFIC RESULTS FROM USING THE SERVICE, INCLUDING BUT NOT LIMITED TO JOB INTERVIEWS OR EMPLOYMENT OFFERS.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              10. Limitation of Liability
            </h2>
            <p className="text-gray-600 mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, APPLIED AI VENTURES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR EMPLOYMENT OPPORTUNITIES, ARISING FROM YOUR USE OF THE SERVICE.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              11. Termination
            </h2>
            <p className="text-gray-600 mb-4">
              We reserve the right to suspend or terminate your account at any time for any reason, including violation of these Terms. Upon termination, your right to use the Service will immediately cease. You may terminate your account at any time by contacting us.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              12. Changes to Terms
            </h2>
            <p className="text-gray-600 mb-4">
              We may modify these Terms at any time. We will notify you of material changes by posting the updated Terms on the Service or by email. Your continued use of the Service after changes become effective constitutes acceptance of the new Terms.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              13. Governing Law
            </h2>
            <p className="text-gray-600 mb-4">
              These Terms shall be governed by and construed in accordance with the laws of the State of Florida, without regard to its conflict of law provisions.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
              14. Contact Us
            </h2>
            <p className="text-gray-600 mb-4">
              If you have questions about these Terms, please contact us at:
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
