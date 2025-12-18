/**
 * Advertising Type Definitions
 * Simplified for pay-per-day model without ad plans
 */

/**
 * Ad Campaign Status
 */
export type AdStatus = 
  | 'pending_payment'
  | 'active'
  | 'expired'
  | 'cancelled';

/**
 * Ad Campaign (from database)
 */
export interface Ad {
  id: string;
  business_id: string;
  status: AdStatus;
  start_at: string | null;
  end_at: string | null;
  days_purchased: number | null;
  daily_rate_cents: number | null;
  total_amount_cents: number | null;
  discount_percent: number | null;
  had_membership: boolean | null;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Business info (minimal)
 */
export interface Business {
  id: string;
  name: string;
  owner_id: string;
}

/**
 * Request to create advertising checkout
 */
export interface CreateAdvertisingCheckoutRequest {
  userId: string;
  businessId: string;
  days: number;
}

/**
 * Advertising purchase metadata
 */
export interface AdvertisingPurchaseMetadata {
  productType: 'advertising';
  userId: string;
  businessId: string;
  days: number;
  dailyRateCents: number;
  hasMembership: boolean;
  discountPercent: number;
  totalAmountCents: number;
}

/**
 * Active ad campaign display
 */
export interface ActiveAdDisplay {
  id: string;
  businessName: string;
  status: AdStatus;
  startAt: string;
  endAt: string;
  daysRemaining: number;
  isActive: boolean;
  daysPurchased: number;
  totalAmountPaid: number;
  hadDiscount: boolean;
}

