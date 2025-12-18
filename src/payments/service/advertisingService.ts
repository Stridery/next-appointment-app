/**
 * Advertising Service (Simplified)
 * Handles ad campaign operations without ad plans
 */

import { createClient } from '@supabase/supabase-js';
import type { Ad, Business } from '../types/advertising';

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
 * Get user's first business (for simplicity)
 */
export async function getUserFirstBusiness(userId: string): Promise<Business | null> {
  const { data, error } = await supabase
    .from('businesses')
    .select('id, name, owner_id')
    .eq('owner_id', userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching business:', error);
    return null;
  }

  return data;
}

/**
 * Get active ad for a business
 */
export async function getActiveAd(businessId: string): Promise<Ad | null> {
  const { data, error } = await supabase
    .from('ads')
    .select('*')
    .eq('business_id', businessId)
    .in('status', ['active', 'pending_payment'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching active ad:', error);
    return null;
  }

  return data;
}

/**
 * Get latest ad for a business (including expired)
 */
export async function getLatestAd(businessId: string): Promise<Ad | null> {
  const { data, error } = await supabase
    .from('ads')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching latest ad:', error);
    return null;
  }

  return data;
}

/**
 * Create new ad campaign
 */
export async function createAd(
  businessId: string,
  days: number,
  dailyRateCents: number,
  totalAmountCents: number,
  discountPercent: number,
  hadMembership: boolean,
  startAt: Date,
  endAt: Date,
  sessionId: string,
  paymentIntentId: string | null
): Promise<Ad | null> {
  const { data, error } = await supabase
    .from('ads')
    .insert({
      business_id: businessId,
      status: 'active',
      days_purchased: days,
      daily_rate_cents: dailyRateCents,
      total_amount_cents: totalAmountCents,
      discount_percent: discountPercent,
      had_membership: hadMembership,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      stripe_session_id: sessionId,
      stripe_payment_intent_id: paymentIntentId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating ad:', error);
    return null;
  }

  return data;
}

/**
 * Extend existing ad campaign
 */
export async function extendAd(
  adId: string,
  additionalDays: number,
  dailyRateCents: number,
  additionalAmount: number,
  discountPercent: number,
  hadMembership: boolean,
  newEndAt: Date,
  sessionId: string,
  paymentIntentId: string | null
): Promise<boolean> {
  // Get current ad to calculate new totals
  const { data: currentAd, error: fetchError } = await supabase
    .from('ads')
    .select('days_purchased, total_amount_cents')
    .eq('id', adId)
    .single();

  if (fetchError) {
    console.error('Error fetching current ad:', fetchError);
    return false;
  }

  const newTotalDays = (currentAd.days_purchased || 0) + additionalDays;
  const newTotalAmount = (currentAd.total_amount_cents || 0) + additionalAmount;

  const { error } = await supabase
    .from('ads')
    .update({
      end_at: newEndAt.toISOString(),
      days_purchased: newTotalDays,
      total_amount_cents: newTotalAmount,
      // Keep the original discount/membership info, or update if needed
      stripe_session_id: sessionId,
      stripe_payment_intent_id: paymentIntentId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', adId);

  if (error) {
    console.error('Error extending ad:', error);
    return false;
  }

  return true;
}

/**
 * Calculate dates for ad campaign
 * If user has active ad, extend from end_at
 * Otherwise, start from now
 */
export function calculateAdDates(
  days: number,
  existingAd: Ad | null
): { startAt: Date; endAt: Date } {
  const now = new Date();
  let startAt: Date;

  if (existingAd && existingAd.end_at) {
    const existingEndAt = new Date(existingAd.end_at);
    // If ad hasn't expired yet, extend from end_at
    if (existingEndAt > now) {
      startAt = existingEndAt;
    } else {
      startAt = now;
    }
  } else {
    startAt = now;
  }

  const endAt = new Date(startAt);
  endAt.setDate(endAt.getDate() + days);

  return { startAt, endAt };
}

/**
 * Calculate price with membership discount
 */
export function calculateAdPrice(
  days: number,
  dailyRateCents: number,
  hasMembership: boolean
): {
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
} {
  const subtotal = days * dailyRateCents;
  const discountPercent = hasMembership ? 5.0 : 0;
  const discountAmount = Math.round(subtotal * (discountPercent / 100));
  const total = subtotal - discountAmount;

  return {
    subtotal,
    discountPercent,
    discountAmount,
    total,
  };
}
