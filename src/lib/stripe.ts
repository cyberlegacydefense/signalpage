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
    features: [
      'Unlimited Signal Pages',
      'Advanced analytics',
      'All themes',
      'Priority support',
    ],
  },
  coach: {
    name: 'Interview Coach',
    maxPages: Infinity,
    features: [
      'Everything in Pro',
      'AI-generated interview questions',
      'Personalized answer scripts',
      'Gap analysis & preparation tips',
      'Role-specific mock interview prep',
    ],
  },
} as const;

// Billing intervals with pricing for each tier
export const BILLING_INTERVALS = {
  pro: {
    monthly: {
      name: 'Monthly',
      price: 19,
      interval: 'month' as const,
      description: 'Billed monthly',
    },
    quarterly: {
      name: 'Quarterly',
      price: 49,
      interval: 'quarter' as const,
      pricePerMonth: 16,
      description: 'Billed every 3 months',
      savings: '14% off',
    },
  },
  coach: {
    monthly: {
      name: 'Monthly',
      price: 39,
      interval: 'month' as const,
      description: 'Billed monthly',
    },
    quarterly: {
      name: 'Quarterly',
      price: 99,
      interval: 'quarter' as const,
      pricePerMonth: 33,
      description: 'Billed every 3 months',
      savings: '15% off',
    },
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;
export type PaidTier = 'pro' | 'coach';
export type BillingPeriod = 'monthly' | 'quarterly';

// Get the price ID for a tier and interval
export function getPriceIdForTier(tier: PaidTier, interval: BillingPeriod = 'monthly'): string | null {
  if (tier === 'pro') {
    switch (interval) {
      case 'monthly':
        return process.env.STRIPE_PRO_MONTHLY_PRICE_ID || null;
      case 'quarterly':
        return process.env.STRIPE_PRO_QUARTERLY_PRICE_ID || null;
      default:
        return null;
    }
  }

  if (tier === 'coach') {
    switch (interval) {
      case 'monthly':
        return process.env.STRIPE_COACH_MONTHLY_PRICE_ID || null;
      case 'quarterly':
        return process.env.STRIPE_COACH_QUARTERLY_PRICE_ID || null;
      default:
        return null;
    }
  }

  return null;
}

// Get tier from price ID
export function getTierFromPriceId(priceId: string): SubscriptionTier {
  if (priceId === process.env.STRIPE_PRO_MONTHLY_PRICE_ID) return 'pro';
  if (priceId === process.env.STRIPE_PRO_QUARTERLY_PRICE_ID) return 'pro';
  if (priceId === process.env.STRIPE_COACH_MONTHLY_PRICE_ID) return 'coach';
  if (priceId === process.env.STRIPE_COACH_QUARTERLY_PRICE_ID) return 'coach';
  return 'free';
}

// Check if a tier has interview coach features
export function hasCoachAccess(tier: SubscriptionTier): boolean {
  return tier === 'coach';
}

// Check if a tier has Pro features (pro or coach)
export function hasProAccess(tier: SubscriptionTier): boolean {
  return tier === 'pro' || tier === 'coach';
}
