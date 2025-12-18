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

    if (productType === 'subscription') {
      // Handle subscription checkout
      return await handleSubscriptionCheckout(session);
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
 * Handle subscription creation (checkout.session.completed with subscription)
 */
async function handleSubscriptionCheckout(
  session: Stripe.Checkout.Session
): Promise<WebhookHandlerResult> {
  try {
    const { profileId, subscriptionPlanId } = session.metadata || {};

    if (!profileId || !subscriptionPlanId) {
      console.error('❌ Missing required metadata for subscription checkout');
      return {
        success: false,
        message: 'Missing required metadata',
      };
    }

    // Import subscription service functions
    const {
      getSubscriptionPlan,
      createSubscription,
      getSubscriptionByStripeId,
      createSubscriptionPayment,
    } = await import('./subscriptionService');

    const stripe = getStripeClient();
    if (!stripe) {
      return {
        success: false,
        message: 'Stripe not configured',
      };
    }

    // 1. Get Stripe subscription details
    const stripeSubscriptionId = session.subscription as string;
    if (!stripeSubscriptionId) {
      console.error('❌ No subscription ID in session');
      return {
        success: false,
        message: 'No subscription ID',
      };
    }

    // Check if already processed (idempotency)
    const existingSubscription = await getSubscriptionByStripeId(stripeSubscriptionId);
    if (existingSubscription) {
      console.log('⚠️  Subscription already processed (idempotent):', stripeSubscriptionId);
      return {
        success: true,
        message: 'Subscription already processed',
      };
    }

    // 2. Get subscription from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

    // 3. Get plan
    const plan = await getSubscriptionPlan(subscriptionPlanId);
    if (!plan) {
      console.error('❌ Subscription plan not found');
      return {
        success: false,
        message: 'Plan not found',
      };
    }

    // 4. Create subscription record
    const subscription = await createSubscription(
      profileId,
      plan.id,
      stripeSubscription.id,
      stripeSubscription.customer as string,
      stripeSubscription.items.data[0].price.id,
      stripeSubscription.status as any,
      new Date(stripeSubscription.current_period_start * 1000),
      new Date(stripeSubscription.current_period_end * 1000)
    );

    if (!subscription) {
      console.error('❌ Failed to create subscription record');
      return {
        success: false,
        message: 'Failed to create subscription',
      };
    }

    console.log('✅ Subscription created:', {
      subscriptionId: subscription.id,
      stripeSubscriptionId: stripeSubscription.id,
      planName: plan.name,
      status: stripeSubscription.status,
    });

    // 5. Record initial payment if subscription_payments table exists
    if (stripeSubscription.latest_invoice) {
      const invoice = await stripe.invoices.retrieve(stripeSubscription.latest_invoice as string);
      
      await createSubscriptionPayment(
        subscription.id,
        profileId,
        invoice.id,
        invoice.payment_intent as string,
        invoice.amount_paid,
        invoice.currency,
        invoice.billing_reason,
        new Date(invoice.period_start * 1000),
        new Date(invoice.period_end * 1000),
        invoice.status === 'paid' ? 'paid' : 'pending'
      );
    }

    return {
      success: true,
      message: 'Subscription created successfully',
    };
  } catch (error) {
    console.error('❌ Error handling subscription checkout:', error);
    return {
      success: false,
      message: 'Error processing subscription checkout',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Handle advertising purchase completion (pay-per-day model)
 */
async function handleAdvertisingPurchase(
  session: Stripe.Checkout.Session
): Promise<WebhookHandlerResult> {
  try {
    const metadata = session.metadata || {};
    const {
      businessId,
      days,
      dailyRateCents,
      hasMembership,
      discountPercent,
      totalAmountCents,
    } = metadata;

    // Validate metadata
    if (!businessId || !days || !dailyRateCents || !totalAmountCents) {
      console.error('❌ Missing required metadata for advertising purchase');
      return {
        success: false,
        message: 'Missing required metadata',
      };
    }

    // Parse numeric values
    const daysPurchased = parseInt(days, 10);
    const dailyRate = parseInt(dailyRateCents, 10);
    const totalAmount = parseInt(totalAmountCents, 10);
    const discount = parseFloat(discountPercent || '0');
    const hadMembership = hasMembership === 'true';

    console.log('📢 Processing advertising purchase:', {
      sessionId: session.id,
      businessId,
      days: daysPurchased,
      dailyRate: `$${dailyRate / 100}`,
      total: `$${totalAmount / 100}`,
      discount: discount > 0 ? `${discount}%` : 'None',
    });

    // Import advertising service functions
    const {
      getActiveAd,
      calculateAdDates,
      createAd,
      extendAd,
    } = await import('./advertisingService');

    const paymentIntentId = session.payment_intent as string;
    const sessionId = session.id;

    // 1. Check for existing active ad
    const activeAd = await getActiveAd(businessId);

    // 2. Calculate campaign dates
    const { startAt, endAt } = calculateAdDates(daysPurchased, activeAd);

    console.log('📅 Campaign dates:', {
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      action: activeAd ? 'Extending existing campaign' : 'Creating new campaign',
    });

    // 3. Create or extend campaign
    if (activeAd) {
      // Extend existing campaign
      console.log('🔄 Extending existing campaign:', activeAd.id);

      const extended = await extendAd(
        activeAd.id,
        daysPurchased,
        dailyRate,
        totalAmount,
        discount,
        hadMembership,
        endAt,
        sessionId,
        paymentIntentId
      );

      if (!extended) {
        console.error('❌ Failed to extend ad campaign');
        return {
          success: false,
          message: 'Failed to extend campaign',
        };
      }

      console.log('✅ Campaign extended:', {
        adId: activeAd.id,
        previousEndAt: activeAd.end_at,
        newEndAt: endAt.toISOString(),
        additionalDays: daysPurchased,
      });
    } else {
      // Create new campaign
      console.log('🆕 Creating new ad campaign');

      const newAd = await createAd(
        businessId,
        daysPurchased,
        dailyRate,
        totalAmount,
        discount,
        hadMembership,
        startAt,
        endAt,
        sessionId,
        paymentIntentId
      );

      if (!newAd) {
        console.error('❌ Failed to create ad campaign');
        return {
          success: false,
          message: 'Failed to create campaign',
        };
      }

      console.log('✅ New campaign created:', {
        adId: newAd.id,
        startAt: newAd.start_at,
        endAt: newAd.end_at,
        days: daysPurchased,
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
 * Handle subscription updates (renewals, cancellations, etc.)
 */
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<WebhookHandlerResult> {
  try {
    const {
      getSubscriptionByStripeId,
      updateSubscription,
    } = await import('./subscriptionService');

    // 1. Get subscription from database
    const dbSubscription = await getSubscriptionByStripeId(subscription.id);
    if (!dbSubscription) {
      console.error('❌ Subscription not found in database:', subscription.id);
      return {
        success: false,
        message: 'Subscription not found',
      };
    }

    // 2. Update subscription
    const updated = await updateSubscription(dbSubscription.id, {
      status: subscription.status as any,
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000),
      canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
    });

    if (!updated) {
      console.error('❌ Failed to update subscription');
      return {
        success: false,
        message: 'Failed to update subscription',
      };
    }

    console.log('✅ Subscription updated:', {
      subscriptionId: dbSubscription.id,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });

    return {
      success: true,
      message: 'Subscription updated successfully',
    };
  } catch (error) {
    console.error('❌ Error handling subscription update:', error);
    return {
      success: false,
      message: 'Error processing subscription update',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Handle subscription deletion
 */
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<WebhookHandlerResult> {
  try {
    const {
      getSubscriptionByStripeId,
      updateSubscription,
    } = await import('./subscriptionService');

    // 1. Get subscription from database
    const dbSubscription = await getSubscriptionByStripeId(subscription.id);
    if (!dbSubscription) {
      console.log('⚠️  Subscription already deleted or not found:', subscription.id);
      return {
        success: true,
        message: 'Subscription not found (already deleted)',
      };
    }

    // 2. Update subscription status
    const updated = await updateSubscription(dbSubscription.id, {
      status: 'canceled',
      ended_at: new Date(),
    });

    if (!updated) {
      console.error('❌ Failed to mark subscription as deleted');
      return {
        success: false,
        message: 'Failed to update subscription',
      };
    }

    console.log('✅ Subscription deleted:', {
      subscriptionId: dbSubscription.id,
    });

    return {
      success: true,
      message: 'Subscription deleted successfully',
    };
  } catch (error) {
    console.error('❌ Error handling subscription deletion:', error);
    return {
      success: false,
      message: 'Error processing subscription deletion',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Handle invoice payment succeeded
 */
async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice
): Promise<WebhookHandlerResult> {
  try {
    const {
      getSubscriptionByStripeId,
      createSubscriptionPayment,
      updateSubscriptionPaymentStatus,
    } = await import('./subscriptionService');

    // Get subscription
    if (!invoice.subscription) {
      console.log('ℹ️  Invoice not related to subscription');
      return {
        success: true,
        message: 'Non-subscription invoice',
      };
    }

    const dbSubscription = await getSubscriptionByStripeId(invoice.subscription as string);
    if (!dbSubscription) {
      console.error('❌ Subscription not found:', invoice.subscription);
      return {
        success: false,
        message: 'Subscription not found',
      };
    }

    // Record payment (if using subscription_payments table)
    try {
      await createSubscriptionPayment(
        dbSubscription.id,
        dbSubscription.profile_id,
        invoice.id,
        invoice.payment_intent as string,
        invoice.amount_paid,
        invoice.currency,
        invoice.billing_reason,
        new Date(invoice.period_start * 1000),
        new Date(invoice.period_end * 1000),
        'paid'
      );
    } catch (err) {
      // If payment already exists, update it
      await updateSubscriptionPaymentStatus(
        invoice.id,
        'paid',
        invoice.payment_intent as string
      );
    }

    console.log('✅ Invoice payment recorded:', {
      invoiceId: invoice.id,
      amount: invoice.amount_paid,
      billingReason: invoice.billing_reason,
    });

    return {
      success: true,
      message: 'Invoice payment recorded successfully',
    };
  } catch (error) {
    console.error('❌ Error handling invoice payment:', error);
    return {
      success: false,
      message: 'Error processing invoice payment',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Handle invoice payment failed
 */
async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice
): Promise<WebhookHandlerResult> {
  try {
    const {
      getSubscriptionByStripeId,
      updateSubscription,
      updateSubscriptionPaymentStatus,
    } = await import('./subscriptionService');

    // Get subscription
    if (!invoice.subscription) {
      console.log('ℹ️  Invoice not related to subscription');
      return {
        success: true,
        message: 'Non-subscription invoice',
      };
    }

    const dbSubscription = await getSubscriptionByStripeId(invoice.subscription as string);
    if (!dbSubscription) {
      console.error('❌ Subscription not found:', invoice.subscription);
      return {
        success: false,
        message: 'Subscription not found',
      };
    }

    // Update subscription status to past_due if not already
    if (dbSubscription.status !== 'past_due') {
      await updateSubscription(dbSubscription.id, {
        status: 'past_due',
      });
    }

    // Update payment status
    await updateSubscriptionPaymentStatus(invoice.id, 'failed');

    console.log('⚠️  Invoice payment failed:', {
      invoiceId: invoice.id,
      subscriptionId: dbSubscription.id,
    });

    // TODO: Send payment failure notification email

    return {
      success: true,
      message: 'Invoice payment failure recorded',
    };
  } catch (error) {
    console.error('❌ Error handling invoice payment failure:', error);
    return {
      success: false,
      message: 'Error processing invoice payment failure',
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
    // Checkout session completed
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // 检查支付状态
      if (session.payment_status === 'paid' || session.mode === 'subscription') {
        return await handlePaymentCompleted(session);
      } else {
        console.warn('⚠️  Checkout session completed but payment not paid:', session.id);
        return {
          success: true,
          message: 'Checkout session completed but payment pending',
        };
      }
    }

    // Subscription lifecycle events
    case 'customer.subscription.created': {
      const subscription = event.data.object as Stripe.Subscription;
      console.log('ℹ️  Subscription created (handled via checkout.session.completed):', subscription.id);
      return {
        success: true,
        message: 'Subscription creation acknowledged',
      };
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      return await handleSubscriptionUpdated(subscription);
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      return await handleSubscriptionDeleted(subscription);
    }

    // Invoice events
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      return await handleInvoicePaymentSucceeded(invoice);
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      return await handleInvoicePaymentFailed(invoice);
    }

    // Payment failures
    case 'checkout.session.async_payment_failed':
    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session;
      return await handlePaymentFailed(session);
    }

    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log('✅ PaymentIntent succeeded:', paymentIntent.id);
      
      return {
        success: true,
        message: 'PaymentIntent succeeded',
      };
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log('❌ PaymentIntent failed:', paymentIntent.id);
      
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


