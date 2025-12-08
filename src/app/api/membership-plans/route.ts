/**
 * API Route: Get Membership Plans
 * GET /api/membership-plans
 * 
 * Fetch all active membership plans from database
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * GET /api/membership-plans
 * 
 * Returns all active membership plans ordered by price
 */
export async function GET() {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Supabase configuration is missing' 
        },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch active membership plans ordered by price
    const { data, error } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_cents', { ascending: true });

    if (error) {
      console.error('Error fetching membership plans:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch membership plans' 
        },
        { status: 500 }
      );
    }

    // Transform data to match frontend format
    const plans = data.map((plan) => ({
      id: plan.id,              // ✅ 使用真实的数据库 UUID
      code: plan.code,
      name: plan.name,
      amount: plan.price_cents,
      displayPrice: `$${(plan.price_cents / 100).toFixed(0)}`,
      currency: plan.currency,
      interval: plan.interval,
      description: plan.description || '',
      features: plan.features || [],
    }));

    return NextResponse.json({
      success: true,
      plans,
    });

  } catch (error) {
    console.error('Unexpected error fetching membership plans:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'An unexpected error occurred' 
      },
      { status: 500 }
    );
  }
}

