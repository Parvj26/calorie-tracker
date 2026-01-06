-- Supabase Schema for Calorie Tracker
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/jjbozzkghpmvxpnoazwu/sql

-- Enable RLS (Row Level Security)
-- Each user can only access their own data

-- Meals table
CREATE TABLE IF NOT EXISTS meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  calories INTEGER NOT NULL DEFAULT 0,
  protein REAL NOT NULL DEFAULT 0,
  carbs REAL NOT NULL DEFAULT 0,
  fat REAL NOT NULL DEFAULT 0,
  is_custom BOOLEAN DEFAULT true,
  recipe JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add recipe column to meals table (for existing deployments)
ALTER TABLE meals
ADD COLUMN IF NOT EXISTS recipe JSONB;

COMMENT ON COLUMN meals.recipe IS 'Recipe data with ingredients and instructions';

-- Add favorite column to meals table (for existing deployments)
ALTER TABLE meals
ADD COLUMN IF NOT EXISTS favorite BOOLEAN DEFAULT false;

-- Add deleted_at column for soft delete (trash/recycle bin feature)
ALTER TABLE meals
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN meals.deleted_at IS 'Soft delete timestamp. NULL = active, timestamp = in trash';

-- Daily logs table
CREATE TABLE IF NOT EXISTS daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  meal_ids UUID[] DEFAULT '{}',
  workout_calories INTEGER DEFAULT 0,
  health_metrics JSONB DEFAULT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Weigh-ins table
CREATE TABLE IF NOT EXISTS weigh_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  weight REAL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- InBody scans table
CREATE TABLE IF NOT EXISTS inbody_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  weight REAL NOT NULL,
  body_fat_percent REAL NOT NULL,
  muscle_mass REAL NOT NULL,
  skeletal_muscle REAL NOT NULL,
  image_data TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  daily_calorie_target_min INTEGER DEFAULT 1500,
  daily_calorie_target_max INTEGER DEFAULT 1800,
  start_weight REAL DEFAULT 80,
  goal_weight REAL DEFAULT 70,
  start_date DATE DEFAULT CURRENT_DATE,
  ai_provider TEXT DEFAULT 'groq',
  openai_api_key TEXT,
  groq_api_key TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weigh_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbody_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own data

-- Meals policies
DROP POLICY IF EXISTS "Users can view own meals" ON meals;
CREATE POLICY "Users can view own meals" ON meals
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own meals" ON meals;
CREATE POLICY "Users can insert own meals" ON meals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own meals" ON meals;
CREATE POLICY "Users can update own meals" ON meals
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own meals" ON meals;
CREATE POLICY "Users can delete own meals" ON meals
  FOR DELETE USING (auth.uid() = user_id);

-- Daily logs policies
DROP POLICY IF EXISTS "Users can view own daily_logs" ON daily_logs;
CREATE POLICY "Users can view own daily_logs" ON daily_logs
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own daily_logs" ON daily_logs;
CREATE POLICY "Users can insert own daily_logs" ON daily_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own daily_logs" ON daily_logs;
CREATE POLICY "Users can update own daily_logs" ON daily_logs
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own daily_logs" ON daily_logs;
CREATE POLICY "Users can delete own daily_logs" ON daily_logs
  FOR DELETE USING (auth.uid() = user_id);

-- Weigh-ins policies
DROP POLICY IF EXISTS "Users can view own weigh_ins" ON weigh_ins;
CREATE POLICY "Users can view own weigh_ins" ON weigh_ins
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own weigh_ins" ON weigh_ins;
CREATE POLICY "Users can insert own weigh_ins" ON weigh_ins
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own weigh_ins" ON weigh_ins;
CREATE POLICY "Users can update own weigh_ins" ON weigh_ins
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own weigh_ins" ON weigh_ins;
CREATE POLICY "Users can delete own weigh_ins" ON weigh_ins
  FOR DELETE USING (auth.uid() = user_id);

-- InBody scans policies
DROP POLICY IF EXISTS "Users can view own inbody_scans" ON inbody_scans;
CREATE POLICY "Users can view own inbody_scans" ON inbody_scans
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own inbody_scans" ON inbody_scans;
CREATE POLICY "Users can insert own inbody_scans" ON inbody_scans
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own inbody_scans" ON inbody_scans;
CREATE POLICY "Users can update own inbody_scans" ON inbody_scans
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own inbody_scans" ON inbody_scans;
CREATE POLICY "Users can delete own inbody_scans" ON inbody_scans
  FOR DELETE USING (auth.uid() = user_id);

-- User settings policies
DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
CREATE POLICY "Users can insert own settings" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;
CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_meals_user_id ON meals(user_id);
CREATE INDEX IF NOT EXISTS idx_meals_deleted_at ON meals(user_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON daily_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_weigh_ins_user_date ON weigh_ins(user_id, date);
CREATE INDEX IF NOT EXISTS idx_inbody_scans_user_date ON inbody_scans(user_id, date);

-- ============================================
-- MASTER MEAL LIBRARY FEATURE
-- ============================================

-- User profiles table (for admin role management)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT,
  display_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Master meals table (community meal library)
CREATE TABLE IF NOT EXISTS master_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  calories INTEGER NOT NULL DEFAULT 0,
  protein REAL NOT NULL DEFAULT 0,
  carbs REAL NOT NULL DEFAULT 0,
  fat REAL NOT NULL DEFAULT 0,
  recipe JSONB,
  status TEXT DEFAULT 'approved' CHECK (status IN ('approved', 'archived')),
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_by_name TEXT,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Meal submissions table (pending approval queue)
CREATE TABLE IF NOT EXISTS meal_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_meal_id UUID,
  name TEXT NOT NULL,
  calories INTEGER NOT NULL DEFAULT 0,
  protein REAL NOT NULL DEFAULT 0,
  carbs REAL NOT NULL DEFAULT 0,
  fat REAL NOT NULL DEFAULT 0,
  recipe JSONB,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  submitted_by_email TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  master_meal_id UUID REFERENCES master_meals(id) ON DELETE SET NULL
);

-- Add master_meal_ids column to daily_logs for referenced community meals
ALTER TABLE daily_logs
ADD COLUMN IF NOT EXISTS master_meal_ids UUID[] DEFAULT '{}';

COMMENT ON COLUMN daily_logs.master_meal_ids IS 'Array of master meal IDs logged for this day (synced/referenced meals)';

-- Enable RLS on new tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_submissions ENABLE ROW LEVEL SECURITY;

-- User profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Master meals policies (anyone can read approved meals)
DROP POLICY IF EXISTS "Anyone can view approved master meals" ON master_meals;
CREATE POLICY "Anyone can view approved master meals" ON master_meals
  FOR SELECT USING (status = 'approved');

DROP POLICY IF EXISTS "Admins can manage master meals" ON master_meals;
CREATE POLICY "Admins can manage master meals" ON master_meals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Meal submissions policies
DROP POLICY IF EXISTS "Users can view own submissions" ON meal_submissions;
CREATE POLICY "Users can view own submissions" ON meal_submissions
  FOR SELECT USING (auth.uid() = submitted_by);

DROP POLICY IF EXISTS "Users can insert own submissions" ON meal_submissions;
CREATE POLICY "Users can insert own submissions" ON meal_submissions
  FOR INSERT WITH CHECK (auth.uid() = submitted_by);

DROP POLICY IF EXISTS "Users can cancel own pending submissions" ON meal_submissions;
CREATE POLICY "Users can cancel own pending submissions" ON meal_submissions
  FOR DELETE USING (auth.uid() = submitted_by AND status = 'pending');

DROP POLICY IF EXISTS "Admins can view all submissions" ON meal_submissions;
CREATE POLICY "Admins can view all submissions" ON meal_submissions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can update submissions" ON meal_submissions;
CREATE POLICY "Admins can update submissions" ON meal_submissions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can insert master meals" ON master_meals;
CREATE POLICY "Admins can insert master meals" ON master_meals
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Indexes for master meal library
CREATE INDEX IF NOT EXISTS idx_master_meals_status ON master_meals(status);
CREATE INDEX IF NOT EXISTS idx_master_meals_name ON master_meals(name);
CREATE INDEX IF NOT EXISTS idx_master_meals_usage ON master_meals(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_meal_submissions_status ON meal_submissions(status);
CREATE INDEX IF NOT EXISTS idx_meal_submissions_submitted_by ON meal_submissions(submitted_by);

-- Set admin user (run after creating tables)
-- Creates profile if not exists, or updates existing to admin
INSERT INTO user_profiles (user_id, email, role)
SELECT id, email, 'admin' FROM auth.users WHERE email = 'parvjain2503@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
