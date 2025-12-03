import { NextRequest, NextResponse } from 'next/server';
import { getStripe, getTierFromPriceId } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Lazy-initialized Supabase admin client
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase environment variables are not configured');
  }
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCanceled(subscription);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.supabase_user_id;
  const tier = session.metadata?.tier;

  if (!userId || !tier) {
    console.error('Missing metadata in checkout session');
    return;
  }

  const stripe = getStripe();
  const supabaseAdmin = getSupabaseAdmin();

  // Get the subscription
  const subscriptionId = session.subscription as string;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  await supabaseAdmin
    .from('profiles')
    .update({
      subscription_tier: tier,
      subscription_status: subscription.status,
      subscription_id: subscriptionId,
      stripe_customer_id: session.customer as string,
    })
    .eq('id', userId);

  console.log(`User ${userId} subscribed to ${tier}`);
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const supabaseAdmin = getSupabaseAdmin();

  // Find user by Stripe customer ID
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) {
    console.error('No profile found for customer:', customerId);
    return;
  }

  // Get the price ID to determine tier
  const priceId = subscription.items.data[0]?.price.id;
  const tier = getTierFromPriceId(priceId);

  await supabaseAdmin
    .from('profiles')
    .update({
      subscription_tier: tier,
      subscription_status: subscription.status,
      subscription_id: subscription.id,
    })
    .eq('id', profile.id);

  console.log(`Updated subscription for user ${profile.id}: ${tier} (${subscription.status})`);
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const supabaseAdmin = getSupabaseAdmin();

  // Find user by Stripe customer ID
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) {
    console.error('No profile found for customer:', customerId);
    return;
  }

  await supabaseAdmin
    .from('profiles')
    .update({
      subscription_tier: 'free',
      subscription_status: 'canceled',
      subscription_id: null,
    })
    .eq('id', profile.id);

  console.log(`Subscription canceled for user ${profile.id}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const supabaseAdmin = getSupabaseAdmin();

  // Find user by Stripe customer ID
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) {
    console.error('No profile found for customer:', customerId);
    return;
  }

  await supabaseAdmin
    .from('profiles')
    .update({
      subscription_status: 'past_due',
    })
    .eq('id', profile.id);

  console.log(`Payment failed for user ${profile.id}`);
}
