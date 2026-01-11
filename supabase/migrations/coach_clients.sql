-- ============================================
-- COACH-CLIENT SYSTEM MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Update user_profiles role constraint to include 'coach'
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('user', 'admin', 'coach'));

-- 2. Add coach_code column to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS coach_code TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_user_profiles_coach_code ON user_profiles(coach_code) WHERE coach_code IS NOT NULL;

-- ============================================
-- 3. Create coach_clients table
-- ============================================
CREATE TABLE IF NOT EXISTS coach_clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  coach_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'terminated')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(coach_id, client_id)
);

-- Enable RLS
ALTER TABLE coach_clients ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_coach_clients_coach_id ON coach_clients(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_clients_client_id ON coach_clients(client_id);
CREATE INDEX IF NOT EXISTS idx_coach_clients_status ON coach_clients(status);

-- ============================================
-- 4. RLS Policies for coach_clients table
-- ============================================

-- Coaches can view their relationships
CREATE POLICY "Coaches can view their relationships" ON coach_clients
  FOR SELECT USING (auth.uid() = coach_id);

-- Clients can view their relationships
CREATE POLICY "Clients can view their relationships" ON coach_clients
  FOR SELECT USING (auth.uid() = client_id);

-- Clients can create pending requests
CREATE POLICY "Clients can create pending requests" ON coach_clients
  FOR INSERT WITH CHECK (
    auth.uid() = client_id
    AND status = 'pending'
  );

-- Coaches can update status (accept/reject)
CREATE POLICY "Coaches can update relationship status" ON coach_clients
  FOR UPDATE USING (auth.uid() = coach_id);

-- Either party can delete/terminate relationship
CREATE POLICY "Either party can terminate relationship" ON coach_clients
  FOR DELETE USING (auth.uid() = coach_id OR auth.uid() = client_id);

-- ============================================
-- 5. RLS Policies for coaches to read client data
-- ============================================

-- Coaches can view connected clients' meals
CREATE POLICY "Coaches can view connected clients meals" ON meals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM coach_clients
      WHERE coach_clients.coach_id = auth.uid()
      AND coach_clients.client_id = meals.user_id
      AND coach_clients.status = 'accepted'
    )
  );

-- Coaches can view connected clients' daily logs
CREATE POLICY "Coaches can view connected clients daily logs" ON daily_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM coach_clients
      WHERE coach_clients.coach_id = auth.uid()
      AND coach_clients.client_id = daily_logs.user_id
      AND coach_clients.status = 'accepted'
    )
  );

-- Coaches can view connected clients' weigh-ins
CREATE POLICY "Coaches can view connected clients weigh ins" ON weigh_ins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM coach_clients
      WHERE coach_clients.coach_id = auth.uid()
      AND coach_clients.client_id = weigh_ins.user_id
      AND coach_clients.status = 'accepted'
    )
  );

-- Coaches can view connected clients' InBody scans
CREATE POLICY "Coaches can view connected clients inbody scans" ON inbody_scans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM coach_clients
      WHERE coach_clients.coach_id = auth.uid()
      AND coach_clients.client_id = inbody_scans.user_id
      AND coach_clients.status = 'accepted'
    )
  );

-- Coaches can view connected clients' settings
CREATE POLICY "Coaches can view connected clients settings" ON user_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM coach_clients
      WHERE coach_clients.coach_id = auth.uid()
      AND coach_clients.client_id = user_settings.user_id
      AND coach_clients.status = 'accepted'
    )
  );

-- Coaches can view connected clients' profiles
CREATE POLICY "Coaches can view connected clients profiles" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM coach_clients
      WHERE coach_clients.coach_id = auth.uid()
      AND coach_clients.client_id = user_profiles.user_id
      AND coach_clients.status = 'accepted'
    )
  );

-- ============================================
-- 6. Function to generate unique coach code
-- ============================================
CREATE OR REPLACE FUNCTION generate_coach_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 8-character alphanumeric code (uppercase)
    new_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));

    -- Check if code already exists
    SELECT EXISTS(
      SELECT 1 FROM user_profiles WHERE coach_code = new_code
    ) INTO code_exists;

    EXIT WHEN NOT code_exists;
  END LOOP;

  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. Function to set up a new coach
-- ============================================
CREATE OR REPLACE FUNCTION setup_coach(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
BEGIN
  new_code := generate_coach_code();

  UPDATE user_profiles
  SET role = 'coach', coach_code = new_code, updated_at = NOW()
  WHERE user_id = user_uuid;

  RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. Function to lookup coach by code
-- ============================================
CREATE OR REPLACE FUNCTION lookup_coach_by_code(code TEXT)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  display_name TEXT,
  first_name TEXT,
  last_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.user_id,
    up.email,
    up.display_name,
    up.first_name,
    up.last_name
  FROM user_profiles up
  WHERE up.coach_code = upper(code)
  AND up.role = 'coach';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. Update trigger for handle_new_user to support coach signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  is_coach BOOLEAN;
  new_code TEXT;
BEGIN
  -- Check if this is a coach signup (via metadata)
  is_coach := COALESCE((NEW.raw_user_meta_data->>'is_coach')::boolean, false);

  IF is_coach THEN
    new_code := generate_coach_code();
    INSERT INTO public.user_profiles (user_id, email, role, coach_code)
    VALUES (NEW.id, NEW.email, 'coach', new_code)
    ON CONFLICT (user_id) DO UPDATE
    SET role = 'coach', coach_code = EXCLUDED.coach_code, updated_at = NOW();
  ELSE
    INSERT INTO public.user_profiles (user_id, email, role)
    VALUES (NEW.id, NEW.email, 'user')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
