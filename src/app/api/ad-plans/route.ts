/**
 * API Route: Get Active Ad Plans
 * Returns all active advertising plans from the database
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    // Fetch active ad plans from database
    const { data, error } = await supabase
      .from('ad_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_cents', { ascending: true });

    if (error) {
      console.error('Error fetching ad plans:', error);
      return NextResponse.json(
        { error: 'Failed to fetch ad plans' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'No active ad plans found' },
        { status: 404 }
      );
    }

    // Transform data for frontend
    const plans = data.map((plan) => ({
      id: plan.code, // Use code as the ID for frontend (e.g., 'starter', 'growth', 'professional')
      uuid: plan.id, // Keep the actual UUID for database operations
      code: plan.code,
      name: plan.name,
      amount: plan.price_cents,
      displayPrice: `$${(plan.price_cents / 100).toFixed(0)}`,
      currency: plan.currency,
      billingInterval: plan.billing_interval,
      billingIntervalCount: plan.billing_interval_count,
      description: plan.description || '',
      features: plan.features || [],
      placement: plan.placement || 'general',
      isFeatured: plan.is_featured,
      isActive: plan.is_active,
    }));

    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

