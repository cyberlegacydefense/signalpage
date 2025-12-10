import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserSubscription } from '@/lib/subscription';
import { getStripe, BILLING_INTERVALS } from '@/lib/stripe';
import Stripe from 'stripe';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await getUserSubscription(user.id);

    // Get Stripe details for paid users
    let stripeDetails = null;
    if (subscription.tier !== 'free' && !subscription.isFreeUser) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_id, stripe_customer_id')
          .eq('id', user.id)
          .single();

        if (profile?.subscription_id) {
          const stripe = getStripe();
          const stripeSubscription = await stripe.subscriptions.retrieve(profile.subscription_id, {
            expand: ['default_payment_method'],
          }) as Stripe.Subscription;

          // Get the subscription item (contains period info in Stripe v20+)
          const subscriptionItem = stripeSubscription.items.data[0];

          // Get price details
          const interval = subscriptionItem?.price.recurring?.interval;
          const intervalCount = subscriptionItem?.price.recurring?.interval_count || 1;

          // Determine billing period
          let billingPeriod = 'monthly';
          if (interval === 'month' && intervalCount === 3) {
            billingPeriod = 'quarterly';
          }

          // Get price from our config
          const tierKey = subscription.tier as 'pro' | 'coach';
          const billingConfig = BILLING_INTERVALS[tierKey]?.[billingPeriod as 'monthly' | 'quarterly'];
          const price = billingConfig?.price || (subscriptionItem?.price.unit_amount || 0) / 100;

          // Get payment method details
          let paymentMethod = null;
          const pm = stripeSubscription.default_payment_method;
          if (pm && typeof pm === 'object' && 'card' in pm && pm.card) {
            paymentMethod = {
              brand: pm.card.brand,
              last4: pm.card.last4,
              expMonth: pm.card.exp_month,
              expYear: pm.card.exp_year,
            };
          }

          // current_period_end is now on the subscription item in Stripe v20+
          const currentPeriodEnd = subscriptionItem?.current_period_end || 0;

          stripeDetails = {
            currentPeriodEnd,
            cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
            billingPeriod,
            price,
            paymentMethod,
          };
        }
      } catch (stripeError) {
        console.error('Error fetching Stripe details:', stripeError);
        // Continue without Stripe details
      }
    }

    return NextResponse.json({
      ...subscription,
      stripeDetails,
    });
  } catch (error) {
    console.error('Error getting subscription status:', error);
    return NextResponse.json(
      { error: 'Failed to get subscription status' },
      { status: 500 }
    );
  }
}
