import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe, getPriceIdForTier, type BillingInterval } from '@/lib/stripe';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { interval } = await request.json() as { interval: BillingInterval };

    if (!interval || !['monthly', 'quarterly'].includes(interval)) {
      return NextResponse.json({ error: 'Invalid billing interval' }, { status: 400 });
    }

    const priceId = getPriceIdForTier('pro', interval);
    if (!priceId) {
      console.error('Price ID not found for interval:', interval);
      console.error('Monthly price ID:', process.env.STRIPE_PRO_MONTHLY_PRICE_ID);
      console.error('Quarterly price ID:', process.env.STRIPE_PRO_QUARTERLY_PRICE_ID);
      return NextResponse.json({ error: `Price not configured for ${interval}` }, { status: 500 });
    }

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email, full_name')
      .eq('id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: profile?.email || user.email,
        name: profile?.full_name || undefined,
        metadata: {
          supabase_user_id: user.id,
        },
      });

      customerId = customer.id;

      // Save customer ID to profile
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // Create checkout session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/dashboard?checkout=success`,
      cancel_url: `${appUrl}/pricing?checkout=canceled`,
      metadata: {
        supabase_user_id: user.id,
        tier: 'pro',
        interval,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to create checkout session: ${errorMessage}` },
      { status: 500 }
    );
  }
}
