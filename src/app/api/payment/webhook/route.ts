/**
 * API Route: Stripe Webhook
 * POST /api/payment/webhook
 * 
 * 接收并处理 Stripe Webhook 事件
 */

import { NextRequest, NextResponse } from 'next/server';
import { constructWebhookEvent, handleWebhookEvent } from '@/src/payments';

/**
 * POST /api/payment/webhook
 * 
 * Stripe Webhook 端点
 * 
 * 注意：
 * 1. 必须使用原始请求体（raw body）来验证签名
 * 2. Stripe 会发送 'stripe-signature' header
 * 3. 需要在 Stripe Dashboard 中配置此端点
 */
export async function POST(request: NextRequest) {
  try {
    // 获取原始请求体
    const body = await request.text();
    
    // 获取 Stripe 签名
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('❌ Missing stripe-signature header');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing stripe-signature header' 
        },
        { status: 400 }
      );
    }

    console.log('📨 Received webhook request');

    // 验证签名并构造事件
    let event;
    try {
      event = constructWebhookEvent(body, signature);
    } catch (error) {
      console.error('❌ Webhook signature verification failed:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid signature' 
        },
        { status: 400 }
      );
    }

    // 处理事件
    const result = await handleWebhookEvent(event);

    if (!result.success) {
      console.error('❌ Webhook handler failed:', result);
      // 即使处理失败，也返回 200 避免 Stripe 重试
      // 但记录错误以便排查
      return NextResponse.json(
        { 
          success: false, 
          error: result.error 
        },
        { status: 200 } // 仍然返回 200
      );
    }

    console.log('✅ Webhook processed successfully:', event.type);

    return NextResponse.json({
      success: true,
      received: true,
      eventType: event.type,
    });

  } catch (error) {
    console.error('❌ Unexpected error in webhook handler:', error);

    // 返回 500 会让 Stripe 自动重试
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payment/webhook
 * 
 * 用于健康检查
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Webhook endpoint is running',
    note: 'This endpoint only accepts POST requests from Stripe',
  });
}



