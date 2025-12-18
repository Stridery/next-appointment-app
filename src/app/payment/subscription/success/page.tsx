/**
 * Subscription Success Page
 * Displayed after successful subscription creation
 * 
 * Path: /payment/subscription/success
 */

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface SubscriptionInfo {
  planName: string;
  planDescription: string;
  currentPeriodEnd: string;
  status: string;
}

export default function SubscriptionSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  
  const [loading, setLoading] = useState(true);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSubscriptionInfo() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setError('Please sign in to view your subscription');
          setLoading(false);
          return;
        }

        // Fetch user's subscription
        const { data: subscription, error: subError } = await supabase
          .from('subscriptions')
          .select(`
            status,
            current_period_end,
            subscription_plans (
              name,
              description
            )
          `)
          .eq('profile_id', user.id)
          .in('status', ['active', 'trialing'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (subError) {
          console.error('Error fetching subscription:', subError);
          setError('Failed to load subscription information');
          return;
        }

        if (subscription) {
          const plan = subscription.subscription_plans as any;
          setSubscriptionInfo({
            planName: plan?.name || 'Premium',
            planDescription: plan?.description || '',
            currentPeriodEnd: subscription.current_period_end,
            status: subscription.status,
          });
        }
      } catch (err) {
        console.error('Error:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    }

    // Small delay to allow webhook to process
    const timer = setTimeout(() => {
      fetchSubscriptionInfo();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center px-4">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-green-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-lg text-gray-700">Processing your subscription...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.push('/payment/membership')}
              className="w-full bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Back to Membership
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center">
          {/* Success Icon */}
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
            <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Subscription Activated!
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Welcome to {subscriptionInfo?.planName || 'Premium'}
          </p>

          {/* Subscription Details */}
          {subscriptionInfo && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-8 text-left">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Subscription Details</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Plan:</span>
                  <span className="font-medium text-gray-900">{subscriptionInfo.planName}</span>
                </div>
                {subscriptionInfo.planDescription && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Benefits:</span>
                    <span className="font-medium text-gray-900">{subscriptionInfo.planDescription}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {subscriptionInfo.status === 'trialing' ? 'Trial' : 'Active'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Next Billing Date:</span>
                  <span className="font-medium text-gray-900">{formatDate(subscriptionInfo.currentPeriodEnd)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <div className="flex">
              <svg className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="text-sm text-gray-700">
                <p className="font-medium mb-1">Your subscription will automatically renew</p>
                <p>You can manage your subscription, update payment methods, or cancel anytime through the customer portal on the membership page.</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => router.push('/payment/membership')}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Manage Subscription
            </button>
            <button
              onClick={() => router.push('/')}
              className="flex-1 bg-white text-gray-700 py-3 px-6 rounded-lg border-2 border-gray-300 hover:bg-gray-50 transition-colors font-medium"
            >
              Go to Home
            </button>
          </div>

          {/* Session ID (for debugging) */}
          {sessionId && (
            <p className="mt-6 text-xs text-gray-400">
              Session ID: {sessionId}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

