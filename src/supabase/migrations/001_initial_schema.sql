-- Initial schema for Unincore Salons appointment booking system
-- Run this in Supabase SQL Editor or via Supabase CLI

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
-- Note: auth.users is managed by Supabase Auth
-- This is a public profiles table that extends auth.users
CREATE TABLE IF NOT EXISTS public.users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can view own data" ON public.users
  FOR SELECT USING (auth.uid() = auth_id);

-- Users can update their own data
CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = auth_id);

-- ============================================
-- BUSINESSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.businesses (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Anyone can view businesses (public catalog)
CREATE POLICY "Anyone can view businesses" ON public.businesses
  FOR SELECT USING (true);

-- Only authenticated users can create businesses
CREATE POLICY "Authenticated users can create businesses" ON public.businesses
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- SPECIALISTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.specialists (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  intro TEXT,
  user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  business_id BIGINT REFERENCES public.businesses(id) ON DELETE CASCADE,
  availabilities INTEGER[] DEFAULT '{}', -- Array of day numbers (0-6)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.specialists ENABLE ROW LEVEL SECURITY;

-- Anyone can view specialists
CREATE POLICY "Anyone can view specialists" ON public.specialists
  FOR SELECT USING (true);

-- Business owners can manage their specialists (to be refined)
CREATE POLICY "Authenticated users can manage specialists" ON public.specialists
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- SERVICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.services (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2),
  user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  business_id BIGINT REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Anyone can view services
CREATE POLICY "Anyone can view services" ON public.services
  FOR SELECT USING (true);

-- Business owners can manage their services
CREATE POLICY "Authenticated users can manage services" ON public.services
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- APPOINTMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.appointments (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
  business_id BIGINT REFERENCES public.businesses(id) ON DELETE CASCADE,
  specialist_id BIGINT REFERENCES public.specialists(id) ON DELETE SET NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Users can view their own appointments
CREATE POLICY "Users can view own appointments" ON public.appointments
  FOR SELECT USING (
    auth.uid() IN (
      SELECT auth_id FROM public.users WHERE id = customer_id
    )
  );

-- Users can create their own appointments
CREATE POLICY "Users can create appointments" ON public.appointments
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT auth_id FROM public.users WHERE id = customer_id
    )
  );

-- Users can update their own appointments
CREATE POLICY "Users can update own appointments" ON public.appointments
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT auth_id FROM public.users WHERE id = customer_id
    )
  );

-- ============================================
-- APPOINTMENT_SERVICES (Join Table)
-- ============================================
-- Many-to-many relationship between appointments and services
CREATE TABLE IF NOT EXISTS public.appointment_services (
  id BIGSERIAL PRIMARY KEY,
  appointment_id BIGINT REFERENCES public.appointments(id) ON DELETE CASCADE,
  service_id BIGINT REFERENCES public.services(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(appointment_id, service_id)
);

ALTER TABLE public.appointment_services ENABLE ROW LEVEL SECURITY;

-- Users can view services for their appointments
CREATE POLICY "Users can view appointment services" ON public.appointment_services
  FOR SELECT USING (
    appointment_id IN (
      SELECT id FROM public.appointments WHERE customer_id IN (
        SELECT id FROM public.users WHERE auth_id = auth.uid()
      )
    )
  );

-- ============================================
-- TASKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  assigned_to BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Users can view tasks assigned to them
CREATE POLICY "Users can view assigned tasks" ON public.tasks
  FOR SELECT USING (
    auth.uid() IN (
      SELECT auth_id FROM public.users WHERE id = assigned_to
    )
  );

-- Admins can manage all tasks (to be refined based on role system)
CREATE POLICY "Authenticated users can manage tasks" ON public.tasks
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- CONTACTS TABLE (from dummyContact.json)
-- ============================================
CREATE TABLE IF NOT EXISTS public.contacts (
  id BIGSERIAL PRIMARY KEY,
  country TEXT,
  name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  postal_zip TEXT,
  region TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view contacts
CREATE POLICY "Authenticated users can view contacts" ON public.contacts
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================
-- INDEXES for Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users(auth_id);
CREATE INDEX IF NOT EXISTS idx_specialists_business_id ON public.specialists(business_id);
CREATE INDEX IF NOT EXISTS idx_services_business_id ON public.services(business_id);
CREATE INDEX IF NOT EXISTS idx_appointments_customer_id ON public.appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_business_id ON public.appointments(business_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointment_services_appointment_id ON public.appointment_services(appointment_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.specialists
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- SEED DATA (Optional - matches your dummy data)
-- ============================================
-- Insert dummy users
INSERT INTO public.users (id, name) VALUES
  (1, 'User One'),
  (2, 'User Two'),
  (3, 'User Three')
ON CONFLICT (id) DO NOTHING;

-- Insert dummy businesses
INSERT INTO public.businesses (id, name, city) VALUES
  (1, 'Studio One', 'San Francisco'),
  (2, 'Studio Two', 'San Jose')
ON CONFLICT (id) DO NOTHING;

-- Insert dummy specialists
INSERT INTO public.specialists (id, name, intro, user_id, business_id, availabilities) VALUES
  (1, 'Specialist One', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.', 1, 1, ARRAY[4, 6]),
  (2, 'Specialist Two', 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.', 2, 1, ARRAY[2, 3]),
  (3, 'Specialist Three', 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.', 3, 2, ARRAY[0, 1, 2])
ON CONFLICT (id) DO NOTHING;

-- Insert dummy services
INSERT INTO public.services (id, name, description, price, user_id, business_id) VALUES
  (1, 'Service One', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.', 30.00, 1, 1)
ON CONFLICT (id) DO NOTHING;

-- Insert dummy contacts
INSERT INTO public.contacts (country, name, phone, email, address, postal_zip, region) VALUES
  ('France', 'Kirby Raymond', '1-881-364-0641', 'cursus@hotmail.edu', '997-4648 Vitae Road', '11482', 'KwaZulu-Natal'),
  ('Pakistan', '', '1-747-875-0692', 'cras.eu@google.net', '5084 Mus. Avenue', '66611', 'Astrakhan Oblast')
ON CONFLICT DO NOTHING;

-- Reset sequences to continue from current max
SELECT setval('public.users_id_seq', (SELECT MAX(id) FROM public.users));
SELECT setval('public.businesses_id_seq', (SELECT MAX(id) FROM public.businesses));
SELECT setval('public.specialists_id_seq', (SELECT MAX(id) FROM public.specialists));
SELECT setval('public.services_id_seq', (SELECT MAX(id) FROM public.services));
