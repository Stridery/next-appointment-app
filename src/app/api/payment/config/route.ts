/**
 * API Route: Payment Configuration Check
 * GET /api/payment/config
 * 
 * 检查支付配置状态（用于调试）
 */

import { NextResponse } from 'next/server';
import { isStripeConfigured, getStripeConfig } from '@/src/payments';

/**
 * GET /api/payment/config
 * 
 * 返回支付配置状态（不包含敏感信息）
 */
export async function GET() {
  const config = getStripeConfig();
  const isConfigured = isStripeConfigured();

  return NextResponse.json({
    success: true,
    stripe: {
      configured: isConfigured,
      hasSecretKey: !!config.secretKey,
      hasWebhookSecret: !!config.webhookSecret,
      successUrl: config.successUrl,
      cancelUrl: config.cancelUrl,
      currency: config.currency,
    },
    message: isConfigured 
      ? '✅ Stripe is configured and ready'
      : '⚠️  Stripe is not configured. Please set STRIPE_SECRET_KEY in .env.local',
  });
}



