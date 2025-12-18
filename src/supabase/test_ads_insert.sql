-- =====================================================
-- Test: Manually insert an ad record to verify table structure
-- =====================================================
-- This is just for testing the ads table structure
-- In production, ads are created via webhook
-- =====================================================

-- First, check your business_id
SELECT id, name, owner_id FROM businesses LIMIT 5;

-- Replace 'YOUR_BUSINESS_ID' with actual business_id from above query
-- Then run this insert:

INSERT INTO ads (
  business_id,
  status,
  days_purchased,
  daily_rate_cents,
  total_amount_cents,
  discount_percent,
  had_membership,
  start_at,
  end_at,
  stripe_session_id,
  stripe_payment_intent_id
) VALUES (
  'YOUR_BUSINESS_ID',  -- ⚠️ Replace this
  'active',
  7,
  500,
  3325,
  5.0,
  true,
  NOW(),
  NOW() + INTERVAL '7 days',
  'test_session_123',
  'test_payment_123'
);

-- Verify the insert
SELECT 
  id,
  business_id,
  status,
  days_purchased,
  daily_rate_cents / 100.0 as daily_rate_dollars,
  total_amount_cents / 100.0 as total_dollars,
  discount_percent,
  had_membership,
  start_at,
  end_at,
  created_at
FROM ads
ORDER BY created_at DESC
LIMIT 1;

