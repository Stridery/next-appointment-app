/**
 * Checkout Service
 * 支付会话创建服务
 */

import Stripe from 'stripe';
import { getStripeClient, getStripeConfig } from '../stripe';
import { 
  CreateCheckoutSessionParams, 
  CheckoutSessionResult 
} from '../types';

/**
 * 创建 Stripe Checkout Session
 * 
 * @param params - 创建会话的参数
 * @returns Session ID 和 URL
 */
export async function createCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<CheckoutSessionResult> {
  const stripe = getStripeClient();
  
  if (!stripe) {
    throw new Error(
      'Stripe is not configured. Please set STRIPE_SECRET_KEY in your .env.local file.'
    );
  }

  const config = getStripeConfig();
  const { amount, description, currency = config.currency, metadata = {} } = params;

  // Determine success/cancel URLs based on product type
  let successUrl = config.successUrl;
  let cancelUrl = config.cancelUrl;

  if (metadata.productType === 'advertising') {
    const baseUrl = config.successUrl.split('/payment/')[0]; // Extract base URL
    successUrl = `${baseUrl}/payment/advertising/success`;
    cancelUrl = `${baseUrl}/payment/advertising/cancel`;
  }

  try {
    // 创建 Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: description,
            },
            unit_amount: amount, // 金额单位：分
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    });

    console.log('✅ Checkout session created:', session.id);

    return {
      sessionId: session.id,
      url: session.url || undefined,
    };
  } catch (error) {
    console.error('❌ Failed to create checkout session:', error);
    
    if (error instanceof Stripe.errors.StripeError) {
      throw new Error(`Stripe Error: ${error.message}`);
    }
    
    throw new Error('Failed to create checkout session');
  }
}

/**
 * 检索 Checkout Session 信息
 * 
 * @param sessionId - Session ID
 * @returns Session 对象
 */
export async function retrieveCheckoutSession(
  sessionId: string
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripeClient();
  
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return session;
  } catch (error) {
    console.error('❌ Failed to retrieve checkout session:', error);
    throw new Error('Failed to retrieve checkout session');
  }
}


