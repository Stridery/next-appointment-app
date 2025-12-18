-- Add latitude and longitude to businesses table
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Update existing businesses with coordinates
-- San Francisco location for Studio One
UPDATE public.businesses
SET
  latitude = 37.7749,
  longitude = -122.4194,
  address = '123 Market Street, San Francisco, CA 94102',
  phone = '(415) 555-0001'
WHERE id = 1 AND latitude IS NULL;

-- San Jose location for Studio Two
UPDATE public.businesses
SET
  latitude = 37.3382,
  longitude = -121.8863,
  address = '456 Santa Clara Street, San Jose, CA 95113',
  phone = '(408) 555-0002'
WHERE id = 2 AND latitude IS NULL;
