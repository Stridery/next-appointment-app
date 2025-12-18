/**
 * API Route: Create Customer Portal Session
 * POST /api/subscription/portal
 * 
 * Generate a Stripe Customer Portal URL for subscription management
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getProfile,
  createCustomerPortalSession,
} from '@/src/payments/service/subscriptionService';

/**
 * POST /api/subscription/portal
 * 
 * Request body:
 * - userId: string (required)
 * - returnUrl?: string (optional, defaults to /payment/membership)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, returnUrl } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing userId',
        },
        { status: 400 }
      );
    }

    // 1. Get user profile
    const profile = await getProfile(userId);
    if (!profile) {
      return NextResponse.json(
        {
          success: false,
          error: 'User profile not found',
        },
        { status: 404 }
      );
    }

    // 2. Check if user has a Stripe customer ID
    if (!profile.stripe_customer_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'No customer record found. Please subscribe first.',
        },
        { status: 400 }
      );
    }

    // 3. Create customer portal session
    const defaultReturnUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/membership`;
    const portalUrl = await createCustomerPortalSession(
      profile.stripe_customer_id,
      returnUrl || defaultReturnUrl
    );

    if (!portalUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create portal session',
        },
        { status: 500 }
      );
    }

    console.log('✅ Customer portal session created');

    return NextResponse.json({
      success: true,
      url: portalUrl,
    });
  } catch (error) {
    console.error('❌ Error creating portal session:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/subscription/portal
 * 
 * Health check
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Subscription Portal API is running',
    endpoint: 'POST /api/subscription/portal',
  });
}

