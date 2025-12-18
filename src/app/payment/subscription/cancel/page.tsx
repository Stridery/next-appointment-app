/**
 * Subscription Cancel Page
 * Displayed when user cancels the checkout process
 * 
 * Path: /payment/subscription/cancel
 */

'use client';

import { useRouter } from 'next/navigation';

export default function SubscriptionCancelPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center">
          {/* Cancel Icon */}
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-gray-100 mb-6">
            <svg className="h-10 w-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Subscription Cancelled
          </h1>
          <p className="text-gray-600 mb-8">
            You cancelled the subscription process. No charges were made.
          </p>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8 text-left">
            <div className="flex">
              <svg className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="text-sm text-gray-700">
                <p className="font-medium mb-1">Changed your mind?</p>
                <p>You can start a subscription anytime by selecting a plan on the membership page.</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => router.push('/payment/membership')}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              View Plans Again
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full bg-white text-gray-700 py-3 px-6 rounded-lg border-2 border-gray-300 hover:bg-gray-50 transition-colors font-medium"
            >
              Go to Home
            </button>
          </div>

          {/* Help Text */}
          <p className="mt-6 text-sm text-gray-500">
            Need help? <a href="/contact" className="text-blue-600 hover:text-blue-700 font-medium">Contact support</a>
          </p>
        </div>
      </div>
    </div>
  );
}

