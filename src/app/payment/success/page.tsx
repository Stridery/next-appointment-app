/**
 * Payment Success Page
 * 
 * Path: /payment/success
 */

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface MembershipInfo {
  planName: string;
  expiresAt: string;
  isActive: boolean;
}

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  
  const [loading, setLoading] = useState(true);
  const [membership, setMembership] = useState<MembershipInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMembershipStatus() {
      try {
        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          setError('Please sign in to view your membership');
          return;
        }

        // Fetch user profile with membership plan
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select(`
            id,
            membership_plan_id,
            membership_expires_at,
            membership_plans (
              name
            )
          `)
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          setError('Failed to load membership information');
          return;
        }

        if (profile.membership_plan_id && profile.membership_expires_at) {
          const expiresAt = new Date(profile.membership_expires_at);
          const isActive = expiresAt > new Date();
          const membershipPlans = profile.membership_plans as any;

          setMembership({
            planName: membershipPlans?.name || 'Membership',
            expiresAt: profile.membership_expires_at,
            isActive,
          });
        }
      } catch (err) {
        console.error('Error:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchMembershipStatus();
  }, []);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500 rounded-full mb-6">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Payment Successful!
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            Your payment has been processed successfully
          </p>
          <p className="text-sm text-gray-500">
            Thank you for your purchase!
          </p>
        </div>

        {/* Payment Information */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <svg className="animate-spin h-8 w-8 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="ml-3 text-gray-600">Loading membership information...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          ) : membership && membership.isActive ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-900 mb-2">
                  {membership.planName} Activated!
                </h3>
                <p className="text-sm text-green-800">
                  Your membership is now active and ready to use.
                </p>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-500 mb-1">
                  Membership Expires
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatDateTime(membership.expiresAt)}
                </div>
              </div>

              {sessionId && (
                <div className="pt-4 border-t">
                  <div className="text-sm font-medium text-gray-500 mb-1">
                    Session ID
                  </div>
                  <div className="text-xs font-mono text-gray-800 bg-gray-50 p-2 rounded break-all">
                    {sessionId}
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Payment confirmed
                </div>
                <div className="flex items-center text-sm text-gray-600 mt-2">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  Confirmation email sent
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                Payment successful, but membership information is being processed. Please refresh the page in a moment.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link
            href="/payment/membership"
            className="block w-full bg-blue-600 text-white text-center font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            View Membership
          </Link>
          <Link
            href="/account"
            className="block w-full bg-white text-gray-700 text-center font-semibold py-3 px-6 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors duration-200"
          >
            Go to Account
          </Link>
          <Link
            href="/"
            className="block w-full bg-white text-gray-700 text-center font-semibold py-3 px-6 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors duration-200"
          >
            Return to Home
          </Link>
        </div>

        {/* Help Information */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            If you have any questions, please contact our support team
          </p>
        </div>
      </div>
    </div>
  );
}

