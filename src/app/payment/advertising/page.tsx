/**
 * Advertising Payment Page
 * Purchase advertising packages
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

interface AdvertisingPackage {
  id: string; // code from database
  uuid: string; // actual UUID from database
  code: string;
  name: string;
  amount: number;
  displayPrice: string;
  currency: string;
  billingInterval: string;
  billingIntervalCount: number;
  description: string;
  features: string[];
  placement: string;
  isFeatured: boolean;
  isActive: boolean;
}

interface ActiveAd {
  id: string;
  business_id: string;
  business_name: string;
  ad_plan_name: string;
  status: string;
  start_at: string;
  end_at: string;
  isActive: boolean;
  daysRemaining: number;
}

export default function AdvertisingPaymentPage() {
  const [selectedPackage, setSelectedPackage] = useState<AdvertisingPackage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeAds, setActiveAds] = useState<ActiveAd[]>([]);
  const [loadingAds, setLoadingAds] = useState(true);
  const [adPlans, setAdPlans] = useState<AdvertisingPackage[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  /**
   * Fetch ad plans from database
   */
  useEffect(() => {
    async function fetchAdPlans() {
      try {
        setLoadingPlans(true);
        const response = await fetch('/api/ad-plans');
        const data = await response.json();

        if (!response.ok || data.error) {
          throw new Error(data.error || 'Failed to fetch ad plans');
        }

        setAdPlans(data.plans);
      } catch (err) {
        console.error('Error fetching ad plans:', err);
        setError(err instanceof Error ? err.message : 'Failed to load advertising packages');
      } finally {
        setLoadingPlans(false);
      }
    }

    fetchAdPlans();
  }, []);

  /**
   * Fetch user's active advertising campaigns
   */
  useEffect(() => {
    async function fetchActiveAds() {
      try {
        setLoadingAds(true);

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          console.log('User not authenticated');
          return;
        }

        // Get user's businesses
        const { data: businesses, error: businessError } = await supabase
          .from('businesses')
          .select('id, name')
          .eq('owner_id', user.id);

        if (businessError || !businesses || businesses.length === 0) {
          console.log('No businesses found for user');
          return;
        }

        // Get active ads for all user's businesses
        const businessIds = businesses.map(b => b.id);
        const { data: ads, error: adsError } = await supabase
          .from('ads')
          .select(`
            id,
            business_id,
            status,
            start_at,
            end_at,
            ad_plans (
              name
            )
          `)
          .in('business_id', businessIds)
          .in('status', ['active', 'pending_payment'])
          .order('created_at', { ascending: false });

        if (adsError) {
          console.error('Error fetching ads:', adsError);
          return;
        }

        if (!ads || ads.length === 0) {
          return;
        }

        // Process ads data
        const now = new Date();
        const processedAds: ActiveAd[] = ads.map((ad: any) => {
          const business = businesses.find(b => b.id === ad.business_id);
          const endAt = ad.end_at ? new Date(ad.end_at) : null;
          const isActive = ad.status === 'active' && endAt && endAt > now;
          const daysRemaining = endAt ? Math.ceil((endAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

          return {
            id: ad.id,
            business_id: ad.business_id,
            business_name: business?.name || 'Unknown Business',
            ad_plan_name: ad.ad_plans?.name || 'Unknown Plan',
            status: ad.status,
            start_at: ad.start_at || '',
            end_at: ad.end_at || '',
            isActive,
            daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
          };
        });

        setActiveAds(processedAds);
      } catch (err) {
        console.error('Error fetching active ads:', err);
      } finally {
        setLoadingAds(false);
      }
    }

    fetchActiveAds();
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
   * Handle package selection
   */
  const handlePackageSelect = (pkg: AdvertisingPackage) => {
    setSelectedPackage(pkg);
    setError(null);
  };

  /**
   * Handle payment - redirect to Stripe Checkout
   */
  const handlePayment = async () => {
    if (!selectedPackage) {
      setError('Please select an advertising package');
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
          amount: selectedPackage.amount,
          description: `${selectedPackage.name} Advertising Package`,
          currency: selectedPackage.currency,
          metadata: {
            productType: 'advertising',
            packageId: selectedPackage.code, // Use code as packageId
            packageName: selectedPackage.name,
            userId: user.id,
          },
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Advertising Package
          </h1>
          <p className="text-lg text-gray-600">
            Select a package and start your campaign today
          </p>
        </div>

        {/* Active Campaigns Status */}
        {!loadingAds && activeAds.length > 0 && (
          <div className="mb-8">
            {activeAds.map((ad) => (
              <div key={ad.id} className="mb-4 last:mb-0">
                {ad.isActive && ad.status === 'active' ? (
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                            </svg>
                          </div>
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            Active Campaign: {ad.ad_plan_name}
                          </h3>
                          <p className="text-sm text-gray-600 mb-1">
                            Business: {ad.business_name}
                          </p>
                          <div className="space-y-1">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Started:</span> {formatDateTime(ad.start_at)}
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Expires:</span> {formatDateTime(ad.end_at)}
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
                          {ad.daysRemaining > 0 ? (
                            <span className="font-medium text-purple-700">
                              {ad.daysRemaining} day{ad.daysRemaining !== 1 ? 's' : ''} remaining
                            </span>
                          ) : (
                            <span className="font-medium text-orange-700">
                              Expires today
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : ad.status === 'pending_payment' ? (
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl p-6">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4 flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          Pending Payment: {ad.ad_plan_name}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          Business: {ad.business_name}
                        </p>
                        <p className="text-sm text-gray-600">
                          Complete your payment to activate this campaign.
                        </p>
                      </div>
                      <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                        Pending
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-gray-50 to-slate-50 border-2 border-gray-200 rounded-xl p-6">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gray-400 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4 flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          Campaign Ended: {ad.ad_plan_name}
                        </h3>
                        <p className="text-sm text-gray-600 mb-1">
                          Business: {ad.business_name}
                        </p>
                        <p className="text-sm text-gray-600">
                          Ended on {formatDateTime(ad.end_at)}
                        </p>
                      </div>
                      <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                        {ad.status === 'expired' ? 'Expired' : 'Cancelled'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!loadingAds && activeAds.length === 0 && (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 border-2 border-gray-200 rounded-xl p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gray-400 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    No Active Campaigns
                  </h3>
                  <p className="text-sm text-gray-600">
                    You don't have any active advertising campaigns. Select a package below to get started!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-5xl mx-auto">
          {/* Loading State */}
          {loadingPlans && (
            <div className="text-center py-12">
              <svg className="animate-spin h-10 w-10 text-purple-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-600">Loading advertising packages...</p>
            </div>
          )}

          {/* No Plans Available */}
          {!loadingPlans && adPlans.length === 0 && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Advertising Packages Available
              </h3>
              <p className="text-gray-600">
                Please contact support to set up advertising packages.
              </p>
            </div>
          )}

          {/* Advertising Packages */}
          {!loadingPlans && adPlans.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                Select a Package
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {adPlans.map((pkg) => (
                  <button
                    key={pkg.id}
                    onClick={() => handlePackageSelect(pkg)}
                    disabled={loading}
                    className={`
                      relative bg-white rounded-xl p-6 text-left
                      transition-all duration-200
                      border-2 hover:shadow-lg
                      disabled:opacity-50 disabled:cursor-not-allowed
                      ${
                        selectedPackage?.id === pkg.id
                          ? 'border-purple-500 shadow-lg'
                          : 'border-gray-200 hover:border-gray-300'
                      }
                    `}
                  >
                    {/* Featured Badge */}
                    {pkg.isFeatured && (
                      <div className="absolute top-0 right-4 -mt-3">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md">
                          ⭐ Popular
                        </span>
                      </div>
                    )}

                    {/* Checkmark */}
                    {selectedPackage?.id === pkg.id && (
                      <div className="absolute top-4 right-4 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}

                    <div className="mb-4">
                      <div className="text-sm font-medium text-gray-500 mb-1">
                        {pkg.name}
                      </div>
                      <div className="text-3xl font-bold text-gray-900 mb-1">
                        {pkg.displayPrice}
                      </div>
                      <div className="text-xs text-gray-500">
                        per {pkg.billingIntervalCount > 1 ? `${pkg.billingIntervalCount} ` : ''}
                        {pkg.billingInterval}{pkg.billingIntervalCount > 1 ? 's' : ''}
                      </div>
                    </div>

                    <div className="text-sm text-gray-600 mb-4">
                      {pkg.description}
                    </div>

                    <ul className="space-y-2">
                      {pkg.features.map((feature, index) => (
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
            </div>
          )}

          {/* Selected Package and Pay Button */}
          {selectedPackage && (
            <div className="mt-8">
              <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl mx-auto">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {selectedPackage.name} Package
                    </h3>
                    <p className="text-gray-600">{selectedPackage.description}</p>
                    <p className="text-purple-600 font-semibold mt-2">
                      Campaign duration: {selectedPackage.billingIntervalCount} {selectedPackage.billingInterval}{selectedPackage.billingIntervalCount > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-purple-600">
                      {selectedPackage.displayPrice}
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
                    w-full bg-purple-600 text-white font-semibold py-4 px-6 rounded-lg text-lg
                    hover:bg-purple-700 
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
                      Proceed to Payment - {selectedPackage.displayPrice}
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
