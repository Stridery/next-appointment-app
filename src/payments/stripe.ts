/**
 * Stripe Client Initialization
 * Stripe 客户端初始化
 */

import Stripe from 'stripe';

/**
 * 获取 Stripe 配置
 */
export const getStripeConfig = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const successUrl = process.env.STRIPE_SUCCESS_URL || 'http://localhost:3000/payment/success';
  const cancelUrl = process.env.STRIPE_CANCEL_URL || 'http://localhost:3000/payment/cancel';
  const currency = process.env.STRIPE_CURRENCY || 'usd';

  if (!secretKey) {
    console.warn('⚠️  WARNING: STRIPE_SECRET_KEY is not set in environment variables!');
    console.warn('⚠️  Please add it to your .env.local file to enable real payments.');
  }

  if (!webhookSecret) {
    console.warn('⚠️  WARNING: STRIPE_WEBHOOK_SECRET is not set in environment variables!');
    console.warn('⚠️  Webhook signature verification will be skipped in development.');
  }

  return {
    secretKey: secretKey || '',
    webhookSecret: webhookSecret || '',
    successUrl,
    cancelUrl,
    currency,
  };
};

/**
 * 初始化 Stripe 客户端
 * @returns Stripe instance or null if key is not configured
 */
export const getStripeClient = (): Stripe | null => {
  const config = getStripeConfig();

  if (!config.secretKey) {
    return null;
  }

  try {
    const stripe = new Stripe(config.secretKey, {
      apiVersion: '2024-06-20', // 使用稳定的 API 版本
      typescript: true,
    });

    return stripe;
  } catch (error) {
    console.error('❌ Failed to initialize Stripe client:', error);
    return null;
  }
};

/**
 * 验证 Stripe 是否已配置
 */
export const isStripeConfigured = (): boolean => {
  const config = getStripeConfig();
  return !!config.secretKey;
};



