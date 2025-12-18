/**
 * API Route: Create Checkout Session
 * POST /api/payment/create-session
 * 
 * 创建 Stripe Checkout Session (支持 subscription 和 advertising)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/src/payments/stripe';
import {
  getSubscriptionPlan,
  getOrCreateStripeCustomer,
  getActiveSubscription,
  getProfile,
} from '@/src/payments/service/subscriptionService';
import {
  getUserFirstBusiness,
  calculateAdPrice,
} from '@/src/payments/service/advertisingService';
import { createCheckoutSession } from '@/src/payments';

/**
 * POST /api/payment/create-session
 * 
 * 支持两种产品类型：
 * 1. subscription - 订阅会员
 * 2. advertising - 广告投放
 */
export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body = await request.json();

    // Check if this is a subscription purchase
    if (body.productType === 'subscription') {
      return handleSubscriptionPurchase(body);
    }

    // Check if this is an advertising purchase
    if (body.productType === 'advertising') {
      return handleAdvertisingPurchase(body);
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Invalid product type. Must be "subscription" or "advertising".' 
      },
      { status: 400 }
    );

  } catch (error) {
    console.error('❌ Error creating checkout session:', error);

    const errorMessage = error instanceof Error 
      ? error.message 
      : 'An unexpected error occurred';

    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage 
      },
      { status: 500 }
    );
  }
}

/**
 * Handle subscription purchase
 */
async function handleSubscriptionPurchase(body: any) {
  try {
    const { subscriptionPlanId, userId } = body;
    const stripe = getStripeClient();

    if (!stripe) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment system not configured',
        },
        { status: 500 }
      );
    }

    // Validate required fields
    if (!subscriptionPlanId || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing subscriptionPlanId or userId',
        },
        { status: 400 }
      );
    }

    // 1. Get subscription plan
    const plan = await getSubscriptionPlan(subscriptionPlanId);
    if (!plan || !plan.stripe_price_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Subscription plan not found or not properly configured',
        },
        { status: 404 }
      );
    }

    console.log('✅ Found subscription plan:', plan.name);

    // 2. Get user profile
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

    // 3. Check if user already has an active subscription
    const existingSubscription = await getActiveSubscription(userId);
    if (existingSubscription) {
      return NextResponse.json(
        {
          success: false,
          error: 'You already have an active subscription. Please manage it through the customer portal.',
        },
        { status: 400 }
      );
    }

    // 4. Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(
      userId,
      profile.email,
      profile.name || undefined
    );

    if (!customerId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create customer record',
        },
        { status: 500 }
      );
    }

    console.log('✅ Stripe customer ID:', customerId);

    // 5. Create Stripe Checkout Session for subscription
    const successUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/subscription/cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          price: plan.stripe_price_id,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        productType: 'subscription',
        profileId: userId,
        subscriptionPlanId: plan.id,
      },
      subscription_data: {
        metadata: {
          profile_id: userId,
          subscription_plan_id: plan.id,
        },
      },
    });

    console.log('✅ Stripe checkout session created:', session.id);

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('❌ Error handling subscription purchase:', error);

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
 * Handle advertising purchase (pay-per-day model)
 */
async function handleAdvertisingPurchase(body: any) {
  try {
    const { userId, businessId, days } = body;

    // Validate required fields
    if (!userId || !businessId || !days) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: userId, businessId, or days',
        },
        { status: 400 }
      );
    }

    // Validate days is a positive number
    if (typeof days !== 'number' || days < 1) {
      return NextResponse.json(
        {
          success: false,
          error: 'Days must be a positive number (minimum 1)',
        },
        { status: 400 }
      );
    }

    // 1. Get user's business
    const business = await getUserFirstBusiness(userId);
    if (!business || business.id !== businessId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Business not found or does not belong to this user',
        },
        { status: 404 }
      );
    }

    console.log('✅ Found business:', business.name);

    // 2. Check if user has active membership
    const subscription = await getActiveSubscription(userId);
    const hasMembership = subscription?.status === 'active';

    console.log('🎖️ Membership status:', hasMembership ? 'Active (5% discount)' : 'None');

    // 3. Calculate price
    const dailyRateCents = 500; // $5.00 per day
    const pricing = calculateAdPrice(days, dailyRateCents, hasMembership);

    console.log('💰 Pricing:', {
      days,
      dailyRate: `$${dailyRateCents / 100}`,
      subtotal: `$${pricing.subtotal / 100}`,
      discount: hasMembership ? `${pricing.discountPercent}% (-$${pricing.discountAmount / 100})` : 'None',
      total: `$${pricing.total / 100}`,
    });

    // 4. Create Stripe Checkout Session
    const result = await createCheckoutSession({
      amount: pricing.total,
      description: `Advertising Campaign - ${days} day${days > 1 ? 's' : ''}`,
      currency: 'usd',
      metadata: {
        productType: 'advertising',
        userId,
        businessId: business.id,
        days: days.toString(),
        dailyRateCents: dailyRateCents.toString(),
        hasMembership: hasMembership.toString(),
        discountPercent: pricing.discountPercent.toString(),
        totalAmountCents: pricing.total.toString(),
      },
    });

    console.log('✅ Stripe session created:', result.sessionId);

    return NextResponse.json({
      success: true,
      sessionId: result.sessionId,
      url: result.url,
    });
  } catch (error) {
    console.error('❌ Error handling advertising purchase:', error);

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
 * GET /api/payment/create-session
 * 
 * 用于健康检查
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Payment API is running',
    endpoint: 'POST /api/payment/create-session',
    supportedProductTypes: ['membership', 'advertising', 'general'],
  });
}


