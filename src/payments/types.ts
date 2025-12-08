/**
 * Payment Types
 * General payment-related TypeScript types
 */

/**
 * Stripe Checkout Session 创建参数
 */
export interface CreateCheckoutSessionParams {
  amount: number;
  description: string;
  currency?: string;
  metadata?: Record<string, string>;
}

/**
 * Stripe Checkout Session 创建结果
 */
export interface CheckoutSessionResult {
  sessionId: string;
  url: string | null;
}

/**
 * 支付完成后的数据
 */
export interface PaymentCompletedData {
  sessionId: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  customerEmail?: string | null;
  metadata: Record<string, any>;
}

/**
 * Webhook 处理结果
 */
export interface WebhookHandlerResult {
  success: boolean;
  message: string;
  error?: string;
}


