/**
 * Advertising Payment Cancel Page
 * Displays message when user cancels payment
 * 
 * Path: /payment/advertising/cancel
 */

'use client';

import Link from 'next/link';

export default function AdvertisingCancelPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full">
        {/* Cancel Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-400 to-red-500 rounded-full mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Payment Cancelled
          </h1>
          <p className="text-lg text-gray-600">
            Your payment was not completed
          </p>
        </div>

        {/* Information */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <div className="space-y-4">
            <div className="flex items-start">
              <svg className="w-6 h-6 text-gray-400 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium text-gray-900">No charges made</p>
                <p className="text-sm text-gray-600">Your payment method was not charged</p>
              </div>
            </div>
            <div className="flex items-start">
              <svg className="w-6 h-6 text-gray-400 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium text-gray-900">Campaign not activated</p>
                <p className="text-sm text-gray-600">No advertising campaign was created</p>
              </div>
            </div>
          </div>
        </div>

        {/* Reasons */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Common reasons for cancellation:
          </h2>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-start">
              <span className="text-purple-500 mr-2">•</span>
              <span>You decided to review the package details again</span>
            </li>
            <li className="flex items-start">
              <span className="text-purple-500 mr-2">•</span>
              <span>You want to compare different advertising packages</span>
            </li>
            <li className="flex items-start">
              <span className="text-purple-500 mr-2">•</span>
              <span>You need to update your payment information</span>
            </li>
            <li className="flex items-start">
              <span className="text-purple-500 mr-2">•</span>
              <span>You accidentally clicked the wrong package</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            What would you like to do?
          </h2>
          <div className="space-y-3">
            <Link
              href="/payment/advertising"
              className="block w-full bg-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-purple-700 transition-colors duration-200 text-center"
            >
              Try Again
            </Link>
            <Link
              href="/"
              className="block w-full bg-gray-100 text-gray-700 font-semibold py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors duration-200 text-center"
            >
              Go to Home
            </Link>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              Need help? <a href="/contact" className="text-purple-600 hover:text-purple-700 font-medium">Contact our support team</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


