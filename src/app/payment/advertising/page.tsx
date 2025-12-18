/**
 * Advertising Payment Page
 * Purchase advertising campaigns with daily rates
 * 
 * Path: /payment/advertising
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

interface ActiveAd {
  id: string;
  businessId: string;
  businessName: string;
  status: string;
  startAt: string;
  endAt: string;
  daysRemaining: number;
  daysPurchased: number;
  totalAmountPaid: number;
}

export default function AdvertisingPaymentPage() {
  const [activeAd, setActiveAd] = useState<ActiveAd | null>(null);
  const [loadingAd, setLoadingAd] = useState(true);
  const [days, setDays] = useState<number>(7);
  const [hasMembership, setHasMembership] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);

  const DAILY_RATE_CENTS = 500; // $5.00 per day
  const MEMBERSHIP_DISCOUNT = 0.05; // 5%

  /**
   * Calculate pricing
   */
  const calculatePrice = () => {
    const subtotal = days * DAILY_RATE_CENTS;
    const discountAmount = hasMembership ? Math.round(subtotal * MEMBERSHIP_DISCOUNT) : 0;
    const total = subtotal - discountAmount;

    return {
      subtotal,
      discountAmount,
      total,
      dailyRate: DAILY_RATE_CENTS,
    };
  };

  /**
   * Fetch user's business and active ad
   */
  useEffect(() => {
    async function fetchData() {
      try {
        setLoadingAd(true);

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          console.log('User not authenticated');
          return;
        }

        // Fetch user's first business
        const { data: business, error: businessError } = await supabase
          .from('businesses')
          .select('id, name')
          .eq('owner_id', user.id)
          .limit(1)
          .maybeSingle();

        if (businessError) {
          console.error('Error fetching business:', businessError);
          setError('Failed to load business information');
          return;
        }

        if (!business) {
          setError('No business found. Please create a business first.');
          return;
        }

        setBusinessId(business.id);

        // Fetch latest ad for this business (including expired ones to show last campaign)
        const { data: ad, error: adError } = await supabase
          .from('ads')
          .select('*')
          .eq('business_id', business.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (adError) {
          console.error('Error fetching ad:', adError);
        }

        if (ad) {
          const now = new Date();
          const endAt = ad.end_at ? new Date(ad.end_at) : null;
          const daysRemaining = endAt ? Math.ceil((endAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

          setActiveAd({
            id: ad.id,
            businessId: business.id,
            businessName: business.name,
            status: ad.status,
            startAt: ad.start_at || '',
            endAt: ad.end_at || '',
            daysRemaining,
            daysPurchased: ad.days_purchased || 0,
            totalAmountPaid: ad.total_amount_cents || 0,
          });
        }

        // Check membership status
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('profile_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        setHasMembership(!!subscription);

      } catch (err) {
        console.error('Error fetching data:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoadingAd(false);
      }
    }

    fetchData();
  }, []);

  /**
   * Format date and time for display
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
   * Handle purchase
   */
  const handlePurchase = async () => {
    if (!businessId) {
      setError('Business information not loaded');
      return;
    }

    if (days < 1) {
      setError('Please enter at least 1 day');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Please sign in to purchase advertising');
      }

      // Create checkout session
      const response = await fetch('/api/payment/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productType: 'advertising',
          userId: user.id,
          businessId: businessId,
          days: days,
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

  const pricing = calculatePrice();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Advertising Campaigns
          </h1>
          <p className="text-lg text-gray-600">
            Boost your business visibility with targeted advertising
          </p>
        </div>

        {/* Error Message */}
        {error && !loading && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-red-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="ml-3 text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Active Campaign Status */}
        {!loadingAd && activeAd && (
          <div className="mb-8">
            {activeAd.status === 'active' && activeAd.daysRemaining > 0 ? (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start flex-1">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Active Campaign: {activeAd.businessName}
                      </h3>
                      <div className="space-y-2">
                        <div className="bg-white rounded-lg px-3 py-2 border border-gray-200">
                          <p className="text-xs text-gray-500 mb-1">Campaign Period</p>
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Started:</span> {formatDateTime(activeAd.startAt)}
                          </p>
                          <p className="text-sm font-semibold text-blue-700 mt-1">
                            <span className="font-medium text-gray-700">Expires:</span> {formatDateTime(activeAd.endAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 mb-2">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Active
                    </div>
                    <div className="text-sm text-gray-600">
                      {activeAd.daysRemaining > 0 ? (
                        <span className="font-medium text-green-700">
                          {activeAd.daysRemaining} day{activeAd.daysRemaining !== 1 ? 's' : ''} remaining
                        </span>
                      ) : (
                        <span className="font-medium text-orange-700">
                          Expires today
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-green-200">
                  <p className="text-sm text-gray-600">
                    You can extend your campaign by purchasing additional days below.
                  </p>
                </div>
              </div>
            ) : activeAd ? (
              <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-xl p-6">
                <div className="flex items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Campaign Expired
                    </h3>
                    <div className="bg-white rounded-lg px-3 py-2 border border-orange-200 mb-2">
                      <p className="text-xs text-gray-500 mb-1">Last Campaign</p>
                      <p className="text-sm font-semibold text-orange-700">
                        <span className="font-medium text-gray-700">Expired on:</span> {formatDateTime(activeAd.endAt)}
                      </p>
                    </div>
                    <p className="text-sm text-gray-600">
                      Renew your campaign below to continue advertising.
                    </p>
                  </div>
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                    Expired
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-gray-50 to-slate-50 border-2 border-gray-200 rounded-xl p-6">
                <div className="flex items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      No Campaign Yet
                    </h3>
                    <p className="text-sm text-gray-600">
                      Start advertising your business today!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Purchase Section */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {activeAd ? 'Extend Your Campaign' : 'Start New Campaign'}
          </h2>

          {/* Days Input */}
          <div className="mb-6">
            <label htmlFor="days" className="block text-sm font-medium text-gray-700 mb-2">
              How many days would you like to advertise?
            </label>
            <div className="relative">
              <input
                type="number"
                id="days"
                min="1"
                max="1000"
                value={days}
                onChange={(e) => setDays(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                disabled={loading}
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                days
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Minimum: 1 day • Maximum: 1000 days
            </p>
          </div>

          {/* Pricing Breakdown */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Price Calculation</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-gray-700">
                <span>Daily rate:</span>
                <span className="font-medium">${(pricing.dailyRate / 100).toFixed(2)}/day</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Number of days:</span>
                <span className="font-medium">{days} day{days !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Subtotal:</span>
                <span className="font-medium">${(pricing.subtotal / 100).toFixed(2)}</span>
              </div>
              {hasMembership && (
                <div className="flex justify-between text-green-700">
                  <span className="flex items-center">
                    <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    Membership discount (5%):
                  </span>
                  <span className="font-medium">-${(pricing.discountAmount / 100).toFixed(2)}</span>
                </div>
              )}
              {!hasMembership && (
                <div className="flex justify-between text-gray-500 text-sm italic">
                  <span>💡 Become a member to save 5%!</span>
                  <span></span>
                </div>
              )}
              <div className="pt-3 border-t-2 border-blue-200">
                <div className="flex justify-between text-xl font-bold text-gray-900">
                  <span>Total:</span>
                  <span className="text-blue-600">${(pricing.total / 100).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Campaign Info */}
          {activeAd && activeAd.daysRemaining > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <svg className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-gray-700">
                  <p className="font-medium mb-1">Extending your campaign</p>
                  <p>The additional {days} day{days !== 1 ? 's' : ''} will be added to your current campaign, extending it to {new Date(new Date(activeAd.endAt).getTime() + days * 24 * 60 * 60 * 1000).toLocaleDateString()}.</p>
                </div>
              </div>
            </div>
          )}

          {/* Purchase Button */}
          <button
            onClick={handlePurchase}
            disabled={loading || !businessId}
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
                Continue to Payment - ${(pricing.total / 100).toFixed(2)}
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
        </div>
      </div>
    </div>
  );
}
