/**
 * Membership Payment Types
 */

export interface MembershipOrder {
  id: string;
  profile_id: string;
  membership_plan_id: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  amount_cents: number;
  currency: string;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  created_at: string;
  paid_at: string | null;
}

export interface MembershipPlan {
  id: string;
  code: string;
  name: string;
  price_cents: number;
  currency: string;
  interval: string;
  description: string | null;
  features: string[] | null;
  is_active: boolean;
}

export interface Profile {
  id: string;
  email: string;
  membership_plan_id: string | null;
  membership_started_at: string | null;
  membership_expires_at: string | null;
}

export interface CreateMembershipSessionRequest {
  productType: 'membership';
  membershipPlanId: string;
  userId: string; // From authenticated user
}

export interface CreateMembershipSessionResponse {
  success: boolean;
  sessionId?: string;
  error?: string;
}


