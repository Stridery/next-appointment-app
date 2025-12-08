/**
 * Membership Service
 * Handles membership-related database operations
 */

import { createClient } from '@supabase/supabase-js';
import type { MembershipOrder, MembershipPlan, Profile } from '../types/membership';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create Supabase client for server-side operations
// Service role key bypasses RLS policies
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Get membership plan by ID
 */
export async function getMembershipPlan(planId: string): Promise<MembershipPlan | null> {
  const { data, error } = await supabase
    .from('membership_plans')
    .select('*')
    .eq('id', planId)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('Error fetching membership plan:', error);
    return null;
  }

  return data;
}

/**
 * Get profile by user ID
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, membership_plan_id, membership_started_at, membership_expires_at')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data;
}

/**
 * Create a new membership order
 */
export async function createMembershipOrder(
  profileId: string,
  planId: string,
  amountCents: number,
  currency: string
): Promise<MembershipOrder | null> {
  const { data, error } = await supabase
    .from('membership_orders')
    .insert({
      profile_id: profileId,
      membership_plan_id: planId,
      status: 'pending',
      amount_cents: amountCents,
      currency: currency,
      stripe_session_id: null,
      stripe_payment_intent_id: null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating membership order:', error);
    return null;
  }

  return data;
}

/**
 * Update membership order with Stripe session ID
 */
export async function updateOrderStripeSession(
  orderId: string,
  sessionId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('membership_orders')
    .update({ stripe_session_id: sessionId })
    .eq('id', orderId);

  if (error) {
    console.error('Error updating order stripe session:', error);
    return false;
  }

  return true;
}

/**
 * Get membership order by ID
 */
export async function getMembershipOrder(orderId: string): Promise<MembershipOrder | null> {
  const { data, error } = await supabase
    .from('membership_orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (error) {
    console.error('Error fetching membership order:', error);
    return null;
  }

  return data;
}

/**
 * Mark order as paid and update payment intent ID
 */
export async function markOrderAsPaid(
  orderId: string,
  paymentIntentId: string | null
): Promise<boolean> {
  const { error } = await supabase
    .from('membership_orders')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id: paymentIntentId,
    })
    .eq('id', orderId);

  if (error) {
    console.error('Error marking order as paid:', error);
    return false;
  }

  return true;
}

/**
 * Calculate new membership expiration date
 * If user has existing active membership, extend from that date
 * Otherwise, start from now
 */
export function calculateNewExpirationDate(
  currentExpiresAt: string | null,
  durationDays: number
): Date {
  const now = new Date();
  let baseDate: Date;

  if (currentExpiresAt) {
    const expiresDate = new Date(currentExpiresAt);
    // If membership hasn't expired yet, extend from expiration date
    if (expiresDate > now) {
      baseDate = expiresDate;
    } else {
      baseDate = now;
    }
  } else {
    baseDate = now;
  }

  // Add duration days
  const newExpiresAt = new Date(baseDate);
  newExpiresAt.setDate(newExpiresAt.getDate() + durationDays);

  return newExpiresAt;
}

/**
 * Update profile with new membership
 */
export async function updateProfileMembership(
  profileId: string,
  planId: string,
  expiresAt: Date
): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({
      membership_plan_id: planId,
      membership_started_at: new Date().toISOString(),
      membership_expires_at: expiresAt.toISOString(),
    })
    .eq('id', profileId);

  if (error) {
    console.error('Error updating profile membership:', error);
    return false;
  }

  return true;
}

