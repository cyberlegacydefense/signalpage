import { createClient } from '@/lib/supabase/server';
import { SUBSCRIPTION_TIERS, type SubscriptionTier } from './stripe';

export interface UserSubscription {
  tier: SubscriptionTier;
  status: string;
  isFreeUser: boolean;
  maxPages: number;
  currentPageCount: number;
  canCreatePage: boolean;
}

/**
 * Get the current user's subscription status and limits
 */
export async function getUserSubscription(userId: string): Promise<UserSubscription> {
  const supabase = await createClient();

  // Get user profile with subscription info
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, subscription_status, is_free_user')
    .eq('id', userId)
    .single();

  // Get current page count
  const { count: pageCount } = await supabase
    .from('signal_pages')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  const tier = (profile?.subscription_tier || 'free') as SubscriptionTier;
  const status = profile?.subscription_status || 'active';
  const isFreeUser = profile?.is_free_user || false;
  const currentPageCount = pageCount || 0;

  // Free users bypass all limits
  if (isFreeUser) {
    return {
      tier,
      status,
      isFreeUser: true,
      maxPages: Infinity,
      currentPageCount,
      canCreatePage: true,
    };
  }

  const tierConfig = SUBSCRIPTION_TIERS[tier];
  const maxPages = tierConfig.maxPages;
  const canCreatePage = status === 'active' && currentPageCount < maxPages;

  return {
    tier,
    status,
    isFreeUser: false,
    maxPages,
    currentPageCount,
    canCreatePage,
  };
}

/**
 * Check if user can create a new page
 */
export async function canUserCreatePage(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  subscription: UserSubscription;
}> {
  const subscription = await getUserSubscription(userId);

  if (subscription.canCreatePage) {
    return { allowed: true, subscription };
  }

  if (subscription.status !== 'active') {
    return {
      allowed: false,
      reason: 'Your subscription is not active. Please update your payment method.',
      subscription,
    };
  }

  return {
    allowed: false,
    reason: `You've reached your limit of ${subscription.maxPages} page${subscription.maxPages === 1 ? '' : 's'}. Upgrade to Pro for unlimited pages.`,
    subscription,
  };
}

/**
 * Get subscription info for display
 */
export function getSubscriptionDisplayInfo(subscription: UserSubscription) {
  if (subscription.isFreeUser) {
    return {
      label: 'Free (Unlimited)',
      description: 'You have unlimited access',
      showUpgrade: false,
    };
  }

  const tierConfig = SUBSCRIPTION_TIERS[subscription.tier];

  if (subscription.tier === 'free') {
    return {
      label: 'Free',
      description: `${subscription.currentPageCount} of ${subscription.maxPages} pages used`,
      showUpgrade: true,
    };
  }

  return {
    label: tierConfig.name,
    description: 'Unlimited pages',
    showUpgrade: false, // Pro is the only paid tier now
  };
}
