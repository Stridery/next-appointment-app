-- =====================================================
-- Insert Sample Subscription Plan
-- =====================================================
-- Run this after creating a Stripe Product and Price
-- Replace the stripe_price_id and stripe_product_id with your actual IDs
-- =====================================================

-- Example: Premium Membership at $5/month
INSERT INTO subscription_plans (
  code,
  name,
  price_cents,
  currency,
  billing_interval,
  billing_interval_count,
  description,
  features,
  stripe_price_id,
  stripe_product_id,
  is_active,
  is_featured
) VALUES (
  'premium',
  'Premium',
  500,  -- $5.00 in cents
  'usd',
  'month',
  1,
  'Premium customer support and exclusive features',
  ARRAY[
    '24/7 Priority Support',
    'Advanced Analytics',
    'Custom Branding',
    'API Access',
    'Early Feature Access'
  ],
  'price_xxxxxxxxxxxxx',  -- ⚠️ REPLACE THIS with your Stripe Price ID
  'prod_xxxxxxxxxxxxx',   -- ⚠️ REPLACE THIS with your Stripe Product ID
  true,
  true
);

-- =====================================================
-- Optional: Add more subscription tiers
-- =====================================================

-- Example: Basic Membership at $3/month
INSERT INTO subscription_plans (
  code,
  name,
  price_cents,
  currency,
  billing_interval,
  billing_interval_count,
  description,
  features,
  stripe_price_id,
  stripe_product_id,
  is_active,
  is_featured
) VALUES (
  'basic',
  'Basic',
  300,  -- $3.00 in cents
  'usd',
  'month',
  1,
  'Essential features for getting started',
  ARRAY[
    'Email Support',
    'Basic Features',
    'Community Access'
  ],
  'price_xxxxxxxxxxxxx',  -- ⚠️ REPLACE THIS
  'prod_xxxxxxxxxxxxx',   -- ⚠️ REPLACE THIS
  true,
  false
);

-- Example: Pro Membership at $12/month
INSERT INTO subscription_plans (
  code,
  name,
  price_cents,
  currency,
  billing_interval,
  billing_interval_count,
  description,
  features,
  stripe_price_id,
  stripe_product_id,
  is_active,
  is_featured
) VALUES (
  'pro',
  'Professional',
  1200,  -- $12.00 in cents
  'usd',
  'month',
  1,
  'For power users who need everything',
  ARRAY[
    'Everything in Premium',
    'Unlimited API Calls',
    'White-label Solution',
    'Dedicated Account Manager',
    'Custom Integrations'
  ],
  'price_xxxxxxxxxxxxx',  -- ⚠️ REPLACE THIS
  'prod_xxxxxxxxxxxxx',   -- ⚠️ REPLACE THIS
  true,
  false
);

-- =====================================================
-- Verify the data
-- =====================================================
SELECT 
  code,
  name,
  price_cents / 100.0 as price_dollars,
  billing_interval,
  is_active,
  is_featured
FROM subscription_plans
WHERE is_active = true
ORDER BY price_cents ASC;

