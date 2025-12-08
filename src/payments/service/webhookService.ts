/**
 * Webhook Service
 * Webhook 事件处理服务
 */

import Stripe from 'stripe';
import { getStripeClient, getStripeConfig } from '../stripe';
import { PaymentCompletedData, WebhookHandlerResult } from '../types';

/**
 * 验证 Webhook 签名并构造事件
 * 
 * @param payload - 请求体（原始字符串）
 * @param signature - Stripe 签名头
 * @returns Stripe Event 对象
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripeClient();
  const config = getStripeConfig();

  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  if (!config.webhookSecret) {
    console.warn('⚠️  Webhook secret not configured, skipping signature verification');
    // 在开发环境中，如果没有配置 secret，可以跳过验证
    return JSON.parse(payload.toString()) as Stripe.Event;
  }

  try {
    // 验证签名并构造事件
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      config.webhookSecret
    );

    console.log('✅ Webhook signature verified:', event.type);
    return event;
  } catch (error) {
    console.error('❌ Webhook signature verification failed:', error);
    throw new Error('Invalid webhook signature');
  }
}

/**
 * 处理支付完成事件
 * 
 * @param session - Checkout Session 对象
 * @returns 处理结果
 * 
 * TODO: 在这里添加您的业务逻辑
 * - 激活会员
 * - 激活广告
 * - 发送确认邮件
 * - 更新数据库
 * 等等...
 */
export async function handlePaymentCompleted(
  session: Stripe.Checkout.Session
): Promise<WebhookHandlerResult> {
  try {
    const paymentData: PaymentCompletedData = {
      sessionId: session.id,
      paymentIntentId: session.payment_intent as string,
      amount: session.amount_total || 0,
      currency: session.currency || 'usd',
      customerEmail: session.customer_details?.email,
      metadata: session.metadata || {},
    };

    console.log('💰 Payment completed:', paymentData);

    // Check product type from metadata
    const productType = session.metadata?.productType;

    if (productType === 'membership') {
      // Handle membership purchase
      return await handleMembershipPurchase(session);
    } else if (productType === 'advertising') {
      // Handle advertising purchase
      return await handleAdvertisingPurchase(session);
    } else {
      // General payment - no specific business logic yet
      console.log('✅ General payment completed (no specific business logic)');
      return {
        success: true,
        message: 'Payment completed successfully',
      };
    }
  } catch (error) {
    console.error('❌ Error handling payment completion:', error);
    
    return {
      success: false,
      message: 'Error processing payment',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Handle membership purchase completion
 */
async function handleMembershipPurchase(
  session: Stripe.Checkout.Session
): Promise<WebhookHandlerResult> {
  try {
    const { membershipOrderId, profileId, membershipPlanId } = session.metadata || {};

    if (!membershipOrderId || !profileId || !membershipPlanId) {
      console.error('❌ Missing required metadata for membership purchase');
      return {
        success: false,
        message: 'Missing required metadata',
      };
    }

    // Import membership service functions
    const {
      getMembershipOrder,
      markOrderAsPaid,
      getMembershipPlan,
      getProfile,
      calculateNewExpirationDate,
      updateProfileMembership,
    } = await import('./membershipService');

    // 1. Get the order
    const order = await getMembershipOrder(membershipOrderId);
    if (!order) {
      console.error('❌ Membership order not found:', membershipOrderId);
      return {
        success: false,
        message: 'Order not found',
      };
    }

    // 2. Check if already paid (idempotency)
    if (order.status === 'paid') {
      console.log('⚠️  Order already marked as paid (idempotent):', order.id);
      return {
        success: true,
        message: 'Order already processed',
      };
    }

    // 3. Mark order as paid
    const paymentIntentId = session.payment_intent as string;
    const orderUpdated = await markOrderAsPaid(order.id, paymentIntentId);
    if (!orderUpdated) {
      console.error('❌ Failed to mark order as paid');
      return {
        success: false,
        message: 'Failed to update order',
      };
    }

    console.log('✅ Membership order marked as paid:', order.id);

    // 4. Get plan and profile
    const [plan, profile] = await Promise.all([
      getMembershipPlan(membershipPlanId),
      getProfile(profileId),
    ]);

    if (!plan || !profile) {
      console.error('❌ Plan or profile not found');
      return {
        success: false,
        message: 'Plan or profile not found',
      };
    }

    // 5. Calculate new expiration date
    // Default to 30 days if interval is 'month'
    const durationDays = plan.interval === 'year' ? 365 : 30;
    const newExpiresAt = calculateNewExpirationDate(
      profile.membership_expires_at,
      durationDays
    );

    console.log('📅 Calculated new expiration:', {
      currentExpires: profile.membership_expires_at,
      durationDays,
      newExpires: newExpiresAt,
    });

    // 6. Update profile with new membership
    const profileUpdated = await updateProfileMembership(
      profile.id,
      plan.id,
      newExpiresAt
    );

    if (!profileUpdated) {
      console.error('❌ Failed to update profile membership');
      return {
        success: false,
        message: 'Failed to update profile',
      };
    }

    console.log('✅ Profile membership updated:', {
      profileId: profile.id,
      planId: plan.id,
      expiresAt: newExpiresAt,
    });

    // TODO: Send confirmation email
    // await sendMembershipConfirmationEmail(profile.email, plan.name, newExpiresAt);

    return {
      success: true,
      message: 'Membership activated successfully',
    };
  } catch (error) {
    console.error('❌ Error handling membership purchase:', error);
    return {
      success: false,
      message: 'Error processing membership purchase',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Handle advertising purchase completion
 */
async function handleAdvertisingPurchase(
  session: Stripe.Checkout.Session
): Promise<WebhookHandlerResult> {
  try {
    const { businessId, adPlanId } = session.metadata || {};

    if (!businessId || !adPlanId) {
      console.error('❌ Missing required metadata for advertising purchase');
      return {
        success: false,
        message: 'Missing required metadata',
      };
    }

    console.log('📢 Processing advertising purchase:', {
      sessionId: session.id,
      businessId,
      adPlanId,
    });

    // Import advertising service functions
    const {
      getExistingAdForPlan,
      getLatestAdForBusiness,
      getAdPlan,
      calculateAdDates,
      createAd,
      updateAdEndAt,
    } = await import('./advertisingService');

    const paymentIntentId = session.payment_intent as string;
    const sessionId = session.id;

    // 1. Get ad plan
    const adPlan = await getAdPlan(adPlanId);
    if (!adPlan) {
      console.error('❌ Ad plan not found:', adPlanId);
      return {
        success: false,
        message: 'Ad plan not found',
      };
    }

    // 2. Check if there's an existing ad for the same plan
    const existingAd = await getExistingAdForPlan(businessId, adPlanId);
    
    // 3. Get latest ad (for different plan case)
    const latestAd = await getLatestAdForBusiness(businessId);

    console.log('📊 Ad status:', {
      adPlanName: adPlan.name,
      existingAdId: existingAd?.id,
      existingEndAt: existingAd?.end_at,
      latestAdId: latestAd?.id,
      latestEndAt: latestAd?.end_at,
    });

    // 4. Calculate dates
    const { startAt, endAt } = calculateAdDates(adPlan, existingAd, latestAd);

    console.log('📅 Calculated dates:', {
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
    });

    // 5. Update or create
    if (existingAd) {
      // Same plan: update end_at
      console.log('🔄 Renewing existing ad:', existingAd.id);
      
      const updated = await updateAdEndAt(
        existingAd.id,
        endAt,
        sessionId,
        paymentIntentId
      );

      if (!updated) {
        console.error('❌ Failed to update ad end_at');
        return {
          success: false,
          message: 'Failed to update ad',
        };
      }

      console.log('✅ Ad renewed:', {
        adId: existingAd.id,
        oldEndAt: existingAd.end_at,
        newEndAt: endAt.toISOString(),
      });
    } else {
      // Different plan or first ad: create new
      console.log('🆕 Creating new ad');
      
      const newAd = await createAd(
        businessId,
        adPlanId,
        startAt,
        endAt,
        sessionId,
        paymentIntentId
      );

      if (!newAd) {
        console.error('❌ Failed to create ad');
        return {
          success: false,
          message: 'Failed to create ad',
        };
      }

      console.log('✅ New ad created:', {
        adId: newAd.id,
        startAt: newAd.start_at,
        endAt: newAd.end_at,
      });
    }

    return {
      success: true,
      message: 'Advertising campaign activated/extended successfully',
    };
  } catch (error) {
    console.error('❌ Error handling advertising purchase:', error);
    return {
      success: false,
      message: 'Error processing advertising purchase',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 处理支付失败事件
 * 
 * @param session - Checkout Session 对象
 * @returns 处理结果
 * 
 * TODO: 在这里添加您的业务逻辑
 */
export async function handlePaymentFailed(
  session: Stripe.Checkout.Session
): Promise<WebhookHandlerResult> {
  try {
    console.log('❌ Payment failed:', session.id);

    // TODO: 实现您的业务逻辑
    // - 记录失败原因
    // - 发送失败通知
    // 等等...

    return {
      success: true,
      message: 'Payment failure handled',
    };
  } catch (error) {
    console.error('❌ Error handling payment failure:', error);
    
    return {
      success: false,
      message: 'Error handling payment failure',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 主 Webhook 事件处理器
 * 
 * @param event - Stripe Event 对象
 * @returns 处理结果
 */
export async function handleWebhookEvent(
  event: Stripe.Event
): Promise<WebhookHandlerResult> {
  console.log('📨 Received webhook event:', event.type);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // 检查支付状态
      if (session.payment_status === 'paid') {
        return await handlePaymentCompleted(session);
      } else {
        console.warn('⚠️  Checkout session completed but payment not paid:', session.id);
        return {
          success: true,
          message: 'Checkout session completed but payment pending',
        };
      }
    }

    case 'checkout.session.async_payment_failed':
    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session;
      return await handlePaymentFailed(session);
    }

    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log('✅ PaymentIntent succeeded:', paymentIntent.id);
      
      // TODO: 如果需要，可以在这里添加额外的处理逻辑
      
      return {
        success: true,
        message: 'PaymentIntent succeeded',
      };
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log('❌ PaymentIntent failed:', paymentIntent.id);
      
      // TODO: 处理支付失败
      
      return {
        success: true,
        message: 'PaymentIntent failed',
      };
    }

    default:
      console.log(`ℹ️  Unhandled event type: ${event.type}`);
      return {
        success: true,
        message: `Unhandled event type: ${event.type}`,
      };
  }
}


