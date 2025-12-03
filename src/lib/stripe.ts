import Stripe from 'stripe';

// Lazy-initialized Stripe instance
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    _stripe = new Stripe(key, {
      apiVersion: '2025-11-17.clover',
      typescript: true,
    });
  }
  return _stripe;
}

// For backward compatibility
export const stripe = {
  get customers() { return getStripe().customers; },
  get checkout() { return getStripe().checkout; },
  get billingPortal() { return getStripe().billingPortal; },
  get subscriptions() { return getStripe().subscriptions; },
  get webhooks() { return getStripe().webhooks; },
};

// Subscription tiers and their limits
export const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    maxPages: 1,
    features: ['1 Signal Page', 'Basic analytics', 'Standard themes'],
  },
  pro: {
    name: 'Pro',
    maxPages: Infinity,
    features: ['Unlimited Signal Pages', 'Basic analytics', 'Standard themes', 'Priority support'],
  },
} as const;

// Billing intervals with pricing
export const BILLING_INTERVALS = {
  monthly: {
    name: 'Monthly',
    price: 14,
    interval: 'month' as const,
    description: 'Billed monthly',
  },
  quarterly: {
    name: 'Quarterly',
    price: 27,
    interval: 'quarter' as const,
    pricePerMonth: 9,
    description: 'Billed every 3 months',
    savings: '36% off',
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;
export type BillingInterval = keyof typeof BILLING_INTERVALS;

// Get the price ID for a tier and interval
export function getPriceIdForTier(tier: SubscriptionTier, interval: BillingInterval = 'monthly'): string | null {
  if (tier !== 'pro') return null;

  switch (interval) {
    case 'monthly':
      return process.env.STRIPE_PRO_MONTHLY_PRICE_ID || null;
    case 'quarterly':
      return process.env.STRIPE_PRO_QUARTERLY_PRICE_ID || null;
    default:
      return null;
  }
}

// Get tier from price ID
export function getTierFromPriceId(priceId: string): SubscriptionTier {
  if (priceId === process.env.STRIPE_PRO_MONTHLY_PRICE_ID) return 'pro';
  if (priceId === process.env.STRIPE_PRO_QUARTERLY_PRICE_ID) return 'pro';
  return 'free';
}
