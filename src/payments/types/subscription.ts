/**
 * Subscription Type Definitions
 * Types for subscription-based membership system
 */

/**
 * Subscription status from Stripe
 */
export type SubscriptionStatus = 
  | 'active' 
  | 'canceled' 
  | 'past_due' 
  | 'unpaid' 
  | 'incomplete' 
  | 'incomplete_expired'
  | 'trialing';

/**
 * Subscription Plan (from database)
 */
export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  price_cents: number;
  currency: string;
  billing_interval: 'day' | 'week' | 'month' | 'year';
  billing_interval_count: number;
  description: string | null;
  features: string[] | null;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Subscription (from database)
 */
export interface Subscription {
  id: string;
  profile_id: string;
  subscription_plan_id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  stripe_price_id: string;
  status: SubscriptionStatus;
  cancel_at_period_end: boolean;
  current_period_start: string;
  current_period_end: string;
  canceled_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Profile with subscription fields
 */
export interface ProfileWithSubscription {
  id: string;
  email: string;
  name: string | null;
  stripe_customer_id: string | null;
  current_subscription_id: string | null;
}

/**
 * Subscription Payment (optional - if keeping the table)
 */
export interface SubscriptionPayment {
  id: string;
  subscription_id: string;
  profile_id: string;
  stripe_invoice_id: string;
  stripe_payment_intent_id: string | null;
  amount_cents: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  billing_reason: string | null;
  period_start: string;
  period_end: string;
  paid_at: string | null;
  created_at: string;
}

/**
 * Frontend display types
 */
export interface SubscriptionPlanDisplay extends SubscriptionPlan {
  displayPrice: string;
  billingPeriod: string;
}

export interface UserSubscriptionStatus {
  hasActiveSubscription: boolean;
  subscription: Subscription | null;
  plan: SubscriptionPlan | null;
  canSubscribe: boolean;
  statusMessage: string;
}

