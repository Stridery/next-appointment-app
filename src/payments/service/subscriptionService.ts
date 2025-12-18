/**
 * Subscription Service
 * Handles subscription-related database operations and Stripe integration
 */

import { createClient } from '@supabase/supabase-js';
import { getStripeClient } from '../stripe';
import type { 
  SubscriptionPlan, 
  Subscription, 
  ProfileWithSubscription,
  SubscriptionStatus 
} from '../types/subscription';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create Supabase client for server-side operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Get subscription plan by ID
 */
export async function getSubscriptionPlan(planId: string): Promise<SubscriptionPlan | null> {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', planId)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('Error fetching subscription plan:', error);
    return null;
  }

  return data;
}

/**
 * Get all active subscription plans
 */
export async function getActiveSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('price_cents', { ascending: true });

  if (error) {
    console.error('Error fetching subscription plans:', error);
    return [];
  }

  return data || [];
}

/**
 * Get profile by user ID
 */
export async function getProfile(userId: string): Promise<ProfileWithSubscription | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, name, stripe_customer_id, current_subscription_id')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data;
}

/**
 * Get or create Stripe Customer for a user
 */
export async function getOrCreateStripeCustomer(
  profileId: string,
  email: string,
  name?: string
): Promise<string | null> {
  const stripe = getStripeClient();
  if (!stripe) {
    console.error('Stripe not configured');
    return null;
  }

  // Check if customer already exists in database
  const profile = await getProfile(profileId);
  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id;
  }

  // Create new Stripe customer
  try {
    const customer = await stripe.customers.create({
      email,
      name: name || undefined,
      metadata: {
        profile_id: profileId,
      },
    });

    // Update profile with customer ID
    const { error } = await supabase
      .from('profiles')
      .update({ stripe_customer_id: customer.id })
      .eq('id', profileId);

    if (error) {
      console.error('Error updating profile with customer ID:', error);
      return null;
    }

    console.log('✅ Created Stripe customer:', customer.id);
    return customer.id;
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    return null;
  }
}

/**
 * Get active subscription for a profile
 */
export async function getActiveSubscription(profileId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('profile_id', profileId)
    .in('status', ['active', 'trialing', 'past_due'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching active subscription:', error);
    return null;
  }

  return data;
}

/**
 * Get subscription by Stripe subscription ID
 */
export async function getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .single();

  if (error) {
    console.error('Error fetching subscription by stripe ID:', error);
    return null;
  }

  return data;
}

/**
 * Create a new subscription record
 */
export async function createSubscription(
  profileId: string,
  planId: string,
  stripeSubscriptionId: string,
  stripeCustomerId: string,
  stripePriceId: string,
  status: SubscriptionStatus,
  currentPeriodStart: Date,
  currentPeriodEnd: Date
): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .insert({
      profile_id: profileId,
      subscription_plan_id: planId,
      stripe_subscription_id: stripeSubscriptionId,
      stripe_customer_id: stripeCustomerId,
      stripe_price_id: stripePriceId,
      status: status,
      cancel_at_period_end: false,
      current_period_start: currentPeriodStart.toISOString(),
      current_period_end: currentPeriodEnd.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating subscription:', error);
    return null;
  }

  // Update profile's current_subscription_id
  await supabase
    .from('profiles')
    .update({ current_subscription_id: data.id })
    .eq('id', profileId);

  return data;
}

/**
 * Update subscription status and details
 */
export async function updateSubscription(
  subscriptionId: string,
  updates: {
    status?: SubscriptionStatus;
    cancel_at_period_end?: boolean;
    current_period_start?: Date;
    current_period_end?: Date;
    canceled_at?: Date | null;
    ended_at?: Date | null;
  }
): Promise<boolean> {
  const updateData: any = {};

  if (updates.status) updateData.status = updates.status;
  if (updates.cancel_at_period_end !== undefined) updateData.cancel_at_period_end = updates.cancel_at_period_end;
  if (updates.current_period_start) updateData.current_period_start = updates.current_period_start.toISOString();
  if (updates.current_period_end) updateData.current_period_end = updates.current_period_end.toISOString();
  if (updates.canceled_at !== undefined) updateData.canceled_at = updates.canceled_at ? updates.canceled_at.toISOString() : null;
  if (updates.ended_at !== undefined) updateData.ended_at = updates.ended_at ? updates.ended_at.toISOString() : null;

  const { error } = await supabase
    .from('subscriptions')
    .update(updateData)
    .eq('id', subscriptionId);

  if (error) {
    console.error('Error updating subscription:', error);
    return false;
  }

  return true;
}

/**
 * Create a subscription payment record (optional - if keeping the table)
 */
export async function createSubscriptionPayment(
  subscriptionId: string,
  profileId: string,
  stripeInvoiceId: string,
  stripePaymentIntentId: string | null,
  amountCents: number,
  currency: string,
  billingReason: string | null,
  periodStart: Date,
  periodEnd: Date,
  status: 'pending' | 'paid' | 'failed' = 'pending'
): Promise<boolean> {
  const { error } = await supabase
    .from('subscription_payments')
    .insert({
      subscription_id: subscriptionId,
      profile_id: profileId,
      stripe_invoice_id: stripeInvoiceId,
      stripe_payment_intent_id: stripePaymentIntentId,
      amount_cents: amountCents,
      currency: currency,
      status: status,
      billing_reason: billingReason,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      paid_at: status === 'paid' ? new Date().toISOString() : null,
    });

  if (error) {
    console.error('Error creating subscription payment:', error);
    return false;
  }

  return true;
}

/**
 * Update subscription payment status
 */
export async function updateSubscriptionPaymentStatus(
  stripeInvoiceId: string,
  status: 'paid' | 'failed',
  paymentIntentId?: string
): Promise<boolean> {
  const updateData: any = {
    status: status,
  };

  if (status === 'paid') {
    updateData.paid_at = new Date().toISOString();
  }

  if (paymentIntentId) {
    updateData.stripe_payment_intent_id = paymentIntentId;
  }

  const { error } = await supabase
    .from('subscription_payments')
    .update(updateData)
    .eq('stripe_invoice_id', stripeInvoiceId);

  if (error) {
    console.error('Error updating subscription payment:', error);
    return false;
  }

  return true;
}

/**
 * Generate Stripe Customer Portal URL
 */
export async function createCustomerPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string | null> {
  const stripe = getStripeClient();
  if (!stripe) {
    console.error('Stripe not configured');
    return null;
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session.url;
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    return null;
  }
}

