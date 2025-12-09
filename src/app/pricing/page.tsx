'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui';
import { PublicHeader } from '@/components/PublicHeader';
import { SUBSCRIPTION_TIERS, BILLING_INTERVALS, type PaidTier, type BillingPeriod } from '@/lib/stripe';

function PricingContent() {
  const searchParams = useSearchParams();
  const canceled = searchParams.get('checkout') === 'canceled';
  const [loading, setLoading] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('quarterly');

  const handleSubscribe = async (tier: PaidTier) => {
    setLoading(tier);

    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, interval: billingPeriod }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to start checkout');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <PublicHeader showNavLinks={false} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-blue-50 to-white px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Simple, Transparent Pricing
          </h1>
          <p className="mt-6 text-lg text-gray-600">
            Start free, upgrade when you need more. No hidden fees.
          </p>
          {canceled && (
            <div className="mt-4 rounded-lg bg-yellow-50 border border-yellow-200 p-4">
              <p className="text-sm text-yellow-800">
                Checkout was canceled. You can try again when you&apos;re ready.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          {/* Billing Toggle */}
          <div className="mb-12 flex justify-center">
            <div className="inline-flex items-center rounded-full bg-gray-100 p-1">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  billingPeriod === 'monthly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('quarterly')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  billingPeriod === 'quarterly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Quarterly
                <span className="ml-1.5 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                  Save 15%
                </span>
              </button>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Free Tier */}
            <div className="rounded-2xl border border-gray-200 p-8">
              <h3 className="text-lg font-semibold text-gray-900">
                {SUBSCRIPTION_TIERS.free.name}
              </h3>
              <div className="mt-4 flex items-baseline">
                <span className="text-4xl font-bold text-gray-900">$0</span>
                <span className="ml-1 text-gray-500">/month</span>
              </div>
              <p className="mt-4 text-sm text-gray-600">
                Perfect for trying out SignalPage
              </p>

              <ul className="mt-8 space-y-3">
                {SUBSCRIPTION_TIERS.free.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <svg className="h-5 w-5 flex-shrink-0 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Link href="/auth/signup">
                  <Button variant="outline" className="w-full">
                    Get Started Free
                  </Button>
                </Link>
              </div>
            </div>

            {/* Pro Tier */}
            <div className="rounded-2xl border-2 border-blue-600 p-8 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Most Popular
                </span>
              </div>

              <h3 className="text-lg font-semibold text-gray-900">
                {SUBSCRIPTION_TIERS.pro.name}
              </h3>
              <div className="mt-4 flex items-baseline">
                {billingPeriod === 'quarterly' ? (
                  <>
                    <span className="text-4xl font-bold text-gray-900">${BILLING_INTERVALS.pro.quarterly.pricePerMonth}</span>
                    <span className="ml-1 text-gray-500">/month</span>
                    <span className="ml-2 text-sm text-gray-400 line-through">${BILLING_INTERVALS.pro.monthly.price}</span>
                  </>
                ) : (
                  <>
                    <span className="text-4xl font-bold text-gray-900">${BILLING_INTERVALS.pro.monthly.price}</span>
                    <span className="ml-1 text-gray-500">/month</span>
                  </>
                )}
              </div>
              <p className="mt-2 text-sm text-gray-500">
                {billingPeriod === 'quarterly'
                  ? `$${BILLING_INTERVALS.pro.quarterly.price} billed every 3 months`
                  : 'Billed monthly'
                }
              </p>
              <p className="mt-4 text-sm text-gray-600">
                For active job seekers
              </p>

              <ul className="mt-8 space-y-3">
                {SUBSCRIPTION_TIERS.pro.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <svg className="h-5 w-5 flex-shrink-0 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => handleSubscribe('pro')}
                  isLoading={loading === 'pro'}
                  disabled={loading !== null}
                >
                  Subscribe to Pro
                </Button>
              </div>
            </div>

            {/* Interview Coach Tier */}
            <div className="rounded-2xl border-2 border-purple-600 p-8 relative bg-gradient-to-b from-purple-50/50 to-white">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Best Value
                </span>
              </div>

              <h3 className="text-lg font-semibold text-gray-900">
                {SUBSCRIPTION_TIERS.coach.name}
              </h3>
              <div className="mt-4 flex items-baseline">
                {billingPeriod === 'quarterly' ? (
                  <>
                    <span className="text-4xl font-bold text-gray-900">${BILLING_INTERVALS.coach.quarterly.pricePerMonth}</span>
                    <span className="ml-1 text-gray-500">/month</span>
                    <span className="ml-2 text-sm text-gray-400 line-through">${BILLING_INTERVALS.coach.monthly.price}</span>
                  </>
                ) : (
                  <>
                    <span className="text-4xl font-bold text-gray-900">${BILLING_INTERVALS.coach.monthly.price}</span>
                    <span className="ml-1 text-gray-500">/month</span>
                  </>
                )}
              </div>
              <p className="mt-2 text-sm text-gray-500">
                {billingPeriod === 'quarterly'
                  ? `$${BILLING_INTERVALS.coach.quarterly.price} billed every 3 months`
                  : 'Billed monthly'
                }
              </p>
              <p className="mt-4 text-sm text-gray-600">
                Complete interview preparation
              </p>

              <ul className="mt-8 space-y-3">
                {SUBSCRIPTION_TIERS.coach.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <svg className="h-5 w-5 flex-shrink-0 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Button
                  variant="primary"
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                  onClick={() => handleSubscribe('coach')}
                  isLoading={loading === 'coach'}
                  disabled={loading !== null}
                >
                  Subscribe to Interview Coach
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gray-50 px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-center text-2xl font-bold text-gray-900">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900">Can I cancel anytime?</h3>
              <p className="mt-2 text-gray-600">
                Yes! You can cancel your subscription at any time. You&apos;ll continue to have access until the end of your billing period.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">What happens to my pages if I downgrade?</h3>
              <p className="mt-2 text-gray-600">
                Your existing pages will remain published. You just won&apos;t be able to create new ones until you&apos;re under your plan&apos;s limit.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">What&apos;s the difference between Pro and Interview Coach?</h3>
              <p className="mt-2 text-gray-600">
                Pro gives you unlimited Signal Pages with analytics. Interview Coach includes everything in Pro, plus AI-powered interview preparation: predicted questions, personalized answers based on your resume, and gap analysis for each role you&apos;re targeting.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Do you offer refunds?</h3>
              <p className="mt-2 text-gray-600">
                We offer a 7-day money-back guarantee if you&apos;re not satisfied with the service.
              </p>
            </div>
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

export default function PricingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-sm text-gray-500">Loading pricing...</p>
        </div>
      </div>
    }>
      <PricingContent />
    </Suspense>
  );
}
