/**
 * Membership Payment Page
 * Purchase membership subscription plans
 * 
 * Path: /payment/membership
 */

'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Initialize Stripe.js
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
);

interface MembershipPlan {
  id: string;
  code: string;
  name: string;
  amount: number;
  displayPrice: string;
  currency: string;
  interval: string;
  description: string;
  features: string[];
}

interface UserMembership {
  planId: string;
  planCode: string;
  planName: string;
  planDescription: string;
  planInterval: string;
  startedAt: string;
  expiresAt: string;
  isActive: boolean;
  daysRemaining: number;
}

export default function MembershipPaymentPage() {
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [currentMembership, setCurrentMembership] = useState<UserMembership | null>(null);
  const [loadingMembership, setLoadingMembership] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch membership plans from database
   */
  useEffect(() => {
    async function fetchPlans() {
      try {
        setLoadingPlans(true);
        const response = await fetch('/api/membership-plans');
        const data = await response.json();

        if (data.success && data.plans) {
          setMembershipPlans(data.plans);
        } else {
          setError('Failed to load membership plans');
        }
      } catch (err) {
        console.error('Error fetching plans:', err);
        setError('Failed to load membership plans');
      } finally {
        setLoadingPlans(false);
      }
    }

    fetchPlans();
  }, []);

  /**
   * Fetch current user's membership status
   */
  useEffect(() => {
    async function fetchUserMembership() {
      try {
        setLoadingMembership(true);

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          console.log('User not authenticated');
          return;
        }

        // Fetch user profile with membership plan
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select(`
            id,
            email,
            membership_plan_id,
            membership_started_at,
            membership_expires_at,
            membership_plans (
              code,
              name,
              price_cents,
              interval,
              description
            )
          `)
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          return;
        }

        if (!profile.membership_plan_id) {
          return; // No membership
        }

        // Check if membership is active
        const now = new Date();
        const expiresAt = profile.membership_expires_at ? new Date(profile.membership_expires_at) : null;
        const isActive = expiresAt ? expiresAt > now : false;
        const daysRemaining = expiresAt ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

        // Set membership data
        const membershipPlans = profile.membership_plans as any;
        setCurrentMembership({
          planId: profile.membership_plan_id,
          planCode: membershipPlans?.code || '',
          planName: membershipPlans?.name || '',
          planDescription: membershipPlans?.description || '',
          planInterval: membershipPlans?.interval || 'month',
          startedAt: profile.membership_started_at || '',
          expiresAt: profile.membership_expires_at || '',
          isActive,
          daysRemaining,
        });

      } catch (err) {
        console.error('Error fetching user membership:', err);
      } finally {
        setLoadingMembership(false);
      }
    }

    fetchUserMembership();
  }, []);

  /**
   * Format date and time for display (converts UTC to local time)
   */
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  /**
   * Handle plan selection
   */
  const handlePlanSelect = (plan: MembershipPlan) => {
    setSelectedPlan(plan);
    setError(null);
  };

  /**
   * Handle payment - redirect to Stripe Checkout
   */
  const handlePayment = async () => {
    if (!selectedPlan) {
      setError('Please select a membership plan');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Please sign in to purchase membership');
      }

      // Create checkout session for membership purchase
      const response = await fetch('/api/payment/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productType: 'membership',
          membershipPlanId: selectedPlan.id,
          userId: user.id,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      console.log('✅ Session created:', data.sessionId);

      // Redirect to Stripe Checkout
      const stripe = await stripePromise;

      if (!stripe) {
        throw new Error('Stripe.js failed to load');
      }

      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

    } catch (err) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Membership Plan
          </h1>
          <p className="text-lg text-gray-600">
            Select a plan and complete your payment
          </p>
        </div>

        {/* Current Membership Status */}
        {!loadingMembership && (
          <div className="mb-8">
            {currentMembership && currentMembership.isActive ? (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        Active Membership: {currentMembership.planName}
                      </h3>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Started:</span> {formatDateTime(currentMembership.startedAt)}
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Expires:</span> {formatDateTime(currentMembership.expiresAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Active
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      {currentMembership.daysRemaining > 0 ? (
                        <span className="font-medium text-blue-700">
                          {currentMembership.daysRemaining} day{currentMembership.daysRemaining !== 1 ? 's' : ''} remaining
                        </span>
                      ) : (
                        <span className="font-medium text-orange-700">
                          Expires today
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <p className="text-sm text-gray-600">
                    You can upgrade or extend your membership by selecting a new plan below.
                  </p>
                </div>
              </div>
            ) : currentMembership && !currentMembership.isActive ? (
              <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-xl p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      Membership Expired
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      Your <span className="font-medium">{currentMembership.planName}</span> membership expired on {formatDateTime(currentMembership.expiresAt)}.
                    </p>
                    <p className="text-sm text-gray-600">
                      Renew your membership below to continue enjoying all the benefits.
                    </p>
                  </div>
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                    Expired
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-gray-50 to-slate-50 border-2 border-gray-200 rounded-xl p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gray-400 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      No Active Membership
                    </h3>
                    <p className="text-sm text-gray-600">
                      You don't have an active membership. Select a plan below to get started!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="max-w-5xl mx-auto">
          {/* Membership Plans */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Select a Plan
            </h2>

            {/* Loading State */}
            {loadingPlans && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-gray-600">Loading membership plans...</p>
                </div>
              </div>
            )}

            {/* Plans Grid */}
            {!loadingPlans && membershipPlans.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {membershipPlans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => handlePlanSelect(plan)}
                  disabled={loading}
                  className={`
                    relative bg-white rounded-xl p-6 text-left
                    transition-all duration-200
                    border-2 hover:shadow-lg
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${
                      selectedPlan?.id === plan.id
                        ? 'border-blue-500 shadow-lg'
                        : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  {/* Checkmark */}
                  {selectedPlan?.id === plan.id && (
                    <div className="absolute top-4 right-4 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}

                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-500 mb-1">
                      {plan.name}
                    </div>
                    <div className="text-3xl font-bold text-gray-900">
                      {plan.displayPrice}
                      <span className="text-lg font-normal text-gray-500">/{plan.interval}</span>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 mb-4">
                    {plan.description}
                  </div>

                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start text-sm text-gray-600">
                        <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
              </div>
            )}

            {/* No Plans Found */}
            {!loadingPlans && membershipPlans.length === 0 && (
              <div className="text-center py-12 bg-white rounded-xl border-2 border-gray-200">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-gray-600 text-lg mb-2">No membership plans available</p>
                <p className="text-gray-500 text-sm">Please check back later or contact support</p>
              </div>
            )}
          </div>

          {/* Selected Plan and Pay Button */}
          {selectedPlan && (
            <div className="mt-8">
              <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl mx-auto">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {selectedPlan.name} Membership
                    </h3>
                    <p className="text-gray-600">{selectedPlan.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-blue-600">
                      {selectedPlan.displayPrice}
                    </div>
                    <div className="text-sm text-gray-500">
                      per {selectedPlan.interval}
                    </div>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex">
                      <svg className="h-5 w-5 text-red-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <p className="ml-3 text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                )}

                {/* Pay Button */}
                <button
                  onClick={handlePayment}
                  disabled={loading}
                  className="
                    w-full bg-blue-600 text-white font-semibold py-4 px-6 rounded-lg text-lg
                    hover:bg-blue-700 
                    disabled:bg-gray-400 disabled:cursor-not-allowed
                    transition-colors duration-200
                    flex items-center justify-center
                  "
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                      Proceed to Payment - {selectedPlan.displayPrice}
                    </>
                  )}
                </button>

                {/* Security Note */}
                <div className="mt-6 flex items-center justify-center text-sm text-gray-500">
                  <svg className="w-5 h-5 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  Secure checkout powered by Stripe
                </div>

                <p className="mt-4 text-center text-sm text-gray-500">
                  You will be redirected to Stripe's secure payment page
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
