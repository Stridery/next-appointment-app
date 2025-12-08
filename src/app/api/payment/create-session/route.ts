/**
 * API Route: Create Checkout Session
 * POST /api/payment/create-session
 * 
 * 创建 Stripe Checkout Session (支持 membership 和 advertising)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession } from '@/src/payments';
import type { CreateMembershipSessionRequest } from '@/src/payments/types/membership';
import {
  getMembershipPlan,
  createMembershipOrder,
  updateOrderStripeSession as updateMembershipStripeSession,
} from '@/src/payments/service/membershipService';
import {
  getUserFirstBusiness,
  getAdPlanByPackageId,
} from '@/src/payments/service/advertisingService';

/**
 * POST /api/payment/create-session
 * 
 * 支持三种产品类型：
 * 1. membership - 会员购买
 * 2. advertising - 广告投放
 * 3. 普通支付（原有逻辑）
 */
export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body = await request.json();

    // Check if this is a membership purchase
    if (body.productType === 'membership') {
      return handleMembershipPurchase(body as CreateMembershipSessionRequest);
    }

    // Check if this is an advertising purchase
    if (body.metadata?.productType === 'advertising') {
      return handleAdvertisingPurchase(body);
    }

    // 普通支付逻辑（原有的）
    // 验证必填字段
    if (!body.amount || typeof body.amount !== 'number') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid amount. Must be a number in cents.' 
        },
        { status: 400 }
      );
    }

    if (!body.description || typeof body.description !== 'string') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Description is required.' 
        },
        { status: 400 }
      );
    }

    // 金额验证（至少 50 分）
    if (body.amount < 50) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Amount must be at least 50 cents.' 
        },
        { status: 400 }
      );
    }

    console.log('📝 Creating checkout session:', {
      amount: body.amount,
      description: body.description,
      currency: body.currency || 'usd',
    });

    // 调用服务层创建 Session
    const result = await createCheckoutSession(body);

    console.log('✅ Checkout session created successfully:', result.sessionId);

    return NextResponse.json({
      success: true,
      sessionId: result.sessionId,
      url: result.url,
    });

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
 * Handle membership purchase
 */
async function handleMembershipPurchase(body: CreateMembershipSessionRequest) {
  try {
    const { membershipPlanId, userId } = body;

    // Validate required fields
    if (!membershipPlanId || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing membershipPlanId or userId',
        },
        { status: 400 }
      );
    }

    // 1. Get membership plan
    const plan = await getMembershipPlan(membershipPlanId);
    if (!plan) {
      return NextResponse.json(
        {
          success: false,
          error: 'Membership plan not found or inactive',
        },
        { status: 404 }
      );
    }

    // 2. Create membership order (directly use userId, no need to query profile)
    const order = await createMembershipOrder(
      userId,
      plan.id,
      plan.price_cents,
      plan.currency
    );

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create membership order',
        },
        { status: 500 }
      );
    }

    console.log('✅ Membership order created:', order.id);

    // 3. Create Stripe Checkout Session
    const result = await createCheckoutSession({
      amount: plan.price_cents,
      description: `${plan.name} Membership`,
      currency: plan.currency,
      metadata: {
        productType: 'membership',
        membershipOrderId: order.id,
        profileId: userId,
        membershipPlanId: plan.id,
      },
    });

    // 4. Update order with Stripe session ID
    await updateMembershipStripeSession(order.id, result.sessionId);

    console.log('✅ Stripe session created for membership:', result.sessionId);

    return NextResponse.json({
      success: true,
      sessionId: result.sessionId,
      url: result.url,
    });
  } catch (error) {
    console.error('❌ Error handling membership purchase:', error);

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
 * Handle advertising purchase
 */
async function handleAdvertisingPurchase(body: any) {
  try {
    const { amount, description, currency, metadata } = body;
    const { packageId, packageName, userId } = metadata;

    // Validate required fields
    if (!packageId || !packageName || !userId || !amount) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields for advertising purchase',
        },
        { status: 400 }
      );
    }

    // 1. Get user's first business
    const business = await getUserFirstBusiness(userId);
    if (!business) {
      return NextResponse.json(
        {
          success: false,
          error: 'No business found for this user. Please create a business first.',
        },
        { status: 404 }
      );
    }

    console.log('✅ Found business:', business.name);

    // 2. Get ad plan based on package ID
    const adPlan = await getAdPlanByPackageId(packageId);
    if (!adPlan) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ad plan not found. Please contact support.',
        },
        { status: 404 }
      );
    }

    console.log('✅ Found ad plan:', adPlan.name);

    // 3. Create Stripe Checkout Session
    const result = await createCheckoutSession({
      amount,
      description: description || `${packageName} Advertising Package`,
      currency: currency || 'usd',
      metadata: {
        productType: 'advertising',
        businessId: business.id,
        adPlanId: adPlan.id,
        packageId,
        userId,
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


