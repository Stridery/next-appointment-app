/**
 * Advertising Service
 * Handles advertising-related database operations using `ads` table only
 */

import { createClient } from '@supabase/supabase-js';

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

export interface Ad {
  id: string;
  business_id: string;
  ad_plan_id: string;
  status: string;
  start_at: string | null;
  end_at: string | null;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  billing_interval: string;
  billing_interval_count: number;
  features: string[] | null;
  placement: string | null;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Get user's first business
 * Returns the first business owned by the user
 */
export async function getUserFirstBusiness(userId: string): Promise<{ id: string; name: string } | null> {
  const { data, error } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('owner_id', userId)
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching user business:', error);
    return null;
  }

  return data;
}

/**
 * Get ad plan by package code (from frontend)
 * Package codes: 'starter', 'growth', 'professional'
 */
export async function getAdPlanByPackageId(packageCode: string): Promise<AdPlan | null> {
  const { data, error } = await supabase
    .from('ad_plans')
    .select('*')
    .eq('code', packageCode)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('Error fetching ad plan:', error);
    return null;
  }

  return data;
}

/**
 * Get ad plan by ID
 */
export async function getAdPlan(adPlanId: string): Promise<AdPlan | null> {
  const { data, error } = await supabase
    .from('ad_plans')
    .select('*')
    .eq('id', adPlanId)
    .single();

  if (error) {
    console.error('Error fetching ad plan:', error);
    return null;
  }

  return data;
}

/**
 * Get existing ad for business and specific plan
 */
export async function getExistingAdForPlan(
  businessId: string,
  adPlanId: string
): Promise<Ad | null> {
  const { data, error } = await supabase
    .from('ads')
    .select('*')
    .eq('business_id', businessId)
    .eq('ad_plan_id', adPlanId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching existing ad:', error);
    return null;
  }

  return data && data.length > 0 ? data[0] : null;
}

/**
 * Get latest ad for business (any plan, for getting last end_at)
 */
export async function getLatestAdForBusiness(businessId: string): Promise<Ad | null> {
  const { data, error } = await supabase
    .from('ads')
    .select('*')
    .eq('business_id', businessId)
    .order('end_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching latest ad:', error);
    return null;
  }

  return data && data.length > 0 ? data[0] : null;
}

/**
 * Calculate new ad dates based on plan
 * - Same plan: extend end_at from current end_at
 * - Different plan: start_at = previous end_at (if exists)
 */
export function calculateAdDates(
  adPlan: AdPlan,
  existingAd: Ad | null,
  latestAd: Ad | null
): { startAt: Date; endAt: Date } {
  const now = new Date();
  let startAt: Date;
  let endAt: Date;

  // Determine start date
  if (existingAd) {
    // Same plan: start from current end_at if not expired, else now
    const currentEndAt = new Date(existingAd.end_at!);
    startAt = currentEndAt > now ? currentEndAt : now;
  } else if (latestAd && latestAd.end_at) {
    // Different plan: start from previous ad's end_at
    startAt = new Date(latestAd.end_at);
  } else {
    // First ad ever
    startAt = now;
  }

  // Calculate end date
  endAt = new Date(startAt);
  const intervalCount = adPlan.billing_interval_count || 1;
  
  switch (adPlan.billing_interval) {
    case 'day':
      endAt.setDate(endAt.getDate() + intervalCount);
      break;
    case 'week':
      endAt.setDate(endAt.getDate() + (intervalCount * 7));
      break;
    case 'month':
      endAt.setMonth(endAt.getMonth() + intervalCount);
      break;
    case 'year':
      endAt.setFullYear(endAt.getFullYear() + intervalCount);
      break;
    default:
      endAt.setMonth(endAt.getMonth() + 1);
  }

  return { startAt, endAt };
}

/**
 * Create new ad
 */
export async function createAd(
  businessId: string,
  adPlanId: string,
  startAt: Date,
  endAt: Date,
  stripeSessionId: string,
  paymentIntentId: string
): Promise<Ad | null> {
  const { data, error } = await supabase
    .from('ads')
    .insert({
      business_id: businessId,
      ad_plan_id: adPlanId,
      status: 'active',
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      stripe_session_id: stripeSessionId,
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
 * Update existing ad's end_at (for same plan renewal)
 */
export async function updateAdEndAt(
  adId: string,
  newEndAt: Date,
  stripeSessionId: string,
  paymentIntentId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('ads')
    .update({
      end_at: newEndAt.toISOString(),
      stripe_session_id: stripeSessionId,
      stripe_payment_intent_id: paymentIntentId,
      status: 'active',
    })
    .eq('id', adId);

  if (error) {
    console.error('Error updating ad end_at:', error);
    return false;
  }

  return true;
}

/**
 * Get business ads for display
 */
export async function getBusinessAds(businessId: string): Promise<Ad[]> {
  const { data, error } = await supabase
    .from('ads')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching business ads:', error);
    return [];
  }

  return data || [];
}

/**
 * Get business by owner ID
 */
export async function getBusinessByOwnerId(ownerId: string): Promise<{ id: string; name: string } | null> {
  const { data, error } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('owner_id', ownerId)
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching business:', error);
    return null;
  }

  return data;
}
