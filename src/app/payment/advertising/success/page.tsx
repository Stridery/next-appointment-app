/**
 * Advertising Payment Success Page
 * Displays success message after completing advertising purchase
 * 
 * Path: /payment/advertising/success
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface ActiveCampaign {
  id: string;
  business_name: string;
  ad_plan_name: string;
  start_at: string;
  end_at: string;
}

export default function AdvertisingSuccessPage() {
  const [loading, setLoading] = useState(true);
  const [activeCampaigns, setActiveCampaigns] = useState<ActiveCampaign[]>([]);

  useEffect(() => {
    async function fetchActiveCampaigns() {
      try {
        setLoading(true);

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('User not authenticated');
          return;
        }

        // Get user's businesses
        const { data: businesses } = await supabase
          .from('businesses')
          .select('id, name')
          .eq('owner_id', user.id);

        if (!businesses || businesses.length === 0) {
          return;
        }

        // Get active ads
        const businessIds = businesses.map(b => b.id);
        const { data: ads } = await supabase
          .from('ads')
          .select(`
            id,
            business_id,
            start_at,
            end_at,
            ad_plans (
              name
            )
          `)
          .in('business_id', businessIds)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(5);

        if (ads && ads.length > 0) {
          const campaigns: ActiveCampaign[] = ads.map((ad: any) => {
            const business = businesses.find(b => b.id === ad.business_id);
            return {
              id: ad.id,
              business_name: business?.name || 'Unknown',
              ad_plan_name: ad.ad_plans?.name || 'Unknown Plan',
              start_at: ad.start_at,
              end_at: ad.end_at,
            };
          });
          setActiveCampaigns(campaigns);
        }
      } catch (err) {
        console.error('Error fetching campaigns:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchActiveCampaigns();
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full mb-6 animate-bounce">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Payment Successful! 🎉
          </h1>
          <p className="text-lg text-gray-600">
            Your advertising campaign has been activated
          </p>
        </div>

        {/* Campaign Details */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <svg className="animate-spin h-8 w-8 text-purple-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-600">Loading campaign details...</p>
          </div>
        ) : activeCampaigns.length > 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Active Campaigns
            </h2>
            <div className="space-y-4">
              {activeCampaigns.map((campaign) => (
                <div key={campaign.id} className="border-l-4 border-purple-500 pl-4 py-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {campaign.ad_plan_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        Business: {campaign.business_name}
                      </p>
                      <p className="text-sm text-gray-600 mt-2">
                        <span className="font-medium">Campaign Period:</span>
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatDateTime(campaign.start_at)} - {formatDateTime(campaign.end_at)}
                      </p>
                    </div>
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
            <div className="text-center">
              <svg className="w-16 h-16 text-purple-600 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
              </svg>
              <p className="text-gray-600">
                Your campaign is being processed. It will appear shortly.
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="space-y-4">
            <div className="flex items-start">
              <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium text-gray-900">Payment confirmed</p>
                <p className="text-sm text-gray-600">Your payment has been processed successfully</p>
              </div>
            </div>
            <div className="flex items-start">
              <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium text-gray-900">Campaign activated</p>
                <p className="text-sm text-gray-600">Your advertising campaign is now live</p>
              </div>
            </div>
            <div className="flex items-start">
              <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              <div>
                <p className="font-medium text-gray-900">Confirmation email sent</p>
                <p className="text-sm text-gray-600">Check your inbox for campaign details</p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Link
              href="/payment/advertising"
              className="flex-1 bg-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-purple-700 transition-colors duration-200 text-center"
            >
              View Campaigns
            </Link>
            <Link
              href="/"
              className="flex-1 bg-gray-100 text-gray-700 font-semibold py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors duration-200 text-center"
            >
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}


