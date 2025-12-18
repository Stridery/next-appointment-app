/**
 * API Route: Get Subscription Plans
 * GET /api/subscription-plans
 * 
 * Fetches active subscription plans from the database
 */

import { NextResponse } from 'next/server';
import { getActiveSubscriptionPlans } from '@/src/payments/service/subscriptionService';

/**
 * GET /api/subscription-plans
 * 
 * Returns all active subscription plans
 */
export async function GET() {
  try {
    console.log('📋 Fetching active subscription plans...');

    const plans = await getActiveSubscriptionPlans();

    if (!plans || plans.length === 0) {
      console.log('⚠️  No active subscription plans found');
      return NextResponse.json({
        success: true,
        plans: [],
        message: 'No active plans available',
      });
    }

    // Format plans for frontend
    const formattedPlans = plans.map((plan) => {
      // Format billing period
      let billingPeriod: string = plan.billing_interval;
      if (plan.billing_interval_count > 1) {
        billingPeriod = `${plan.billing_interval_count} ${plan.billing_interval}s`;
      }

      return {
        id: plan.id,
        code: plan.code,
        name: plan.name,
        amount: plan.price_cents,
        displayPrice: `$${(plan.price_cents / 100).toFixed(2)}`,
        currency: plan.currency,
        billingInterval: plan.billing_interval,
        billingIntervalCount: plan.billing_interval_count,
        billingPeriod: billingPeriod,
        description: plan.description || '',
        features: plan.features || [],
        isFeatured: plan.is_featured,
        stripePriceId: plan.stripe_price_id,
      };
    });

    console.log(`✅ Found ${formattedPlans.length} active subscription plans`);

    return NextResponse.json({
      success: true,
      plans: formattedPlans,
    });
  } catch (error) {
    console.error('❌ Unexpected error:', error);

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

