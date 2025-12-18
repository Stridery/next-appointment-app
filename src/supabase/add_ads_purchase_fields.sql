-- =====================================================
-- Add purchase detail fields to ads table
-- =====================================================
-- Run this in Supabase SQL Editor to add new fields
-- =====================================================

-- Add new columns for purchase tracking
ALTER TABLE ads
ADD COLUMN IF NOT EXISTS days_purchased INTEGER,
ADD COLUMN IF NOT EXISTS daily_rate_cents INTEGER,
ADD COLUMN IF NOT EXISTS total_amount_cents INTEGER,
ADD COLUMN IF NOT EXISTS discount_percent DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS had_membership BOOLEAN DEFAULT FALSE;

-- Add comments for documentation
COMMENT ON COLUMN ads.days_purchased IS 'Number of days purchased for this ad campaign';
COMMENT ON COLUMN ads.daily_rate_cents IS 'Daily rate in cents (e.g., 500 = $5.00/day)';
COMMENT ON COLUMN ads.total_amount_cents IS 'Total amount paid in cents after discount';
COMMENT ON COLUMN ads.discount_percent IS 'Discount percentage applied (e.g., 5.00 = 5%)';
COMMENT ON COLUMN ads.had_membership IS 'Whether user had active membership at purchase time';

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'ads' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

