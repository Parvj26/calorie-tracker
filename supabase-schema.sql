-- CalorieTracker Database Schema
-- Run this in your Supabase SQL Editor to set up the database

-- ============================================
-- MIGRATION: Add target_date to user_settings
-- Run this if you have an existing database
-- ============================================
-- ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS target_date DATE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USER PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email TEXT,
  display_name TEXT,
  first_name TEXT,
  last_name TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer-not-to-say')),
  height_cm NUMERIC,  -- Height in centimeters for BMR calculation
  activity_level TEXT CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- MEALS TABLE (User's custom meals)
-- ============================================
CREATE TABLE IF NOT EXISTS meals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  calories NUMERIC NOT NULL,
  protein NUMERIC NOT NULL,
  carbs NUMERIC NOT NULL,
  fat NUMERIC NOT NULL,
  fiber NUMERIC DEFAULT 0,
  sugar NUMERIC DEFAULT 0,
  is_custom BOOLEAN DEFAULT true,
  favorite BOOLEAN DEFAULT false,
  recipe JSONB,
  serving_size NUMERIC,
  serving_size_unit TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for meals
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meals" ON meals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meals" ON meals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meals" ON meals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meals" ON meals
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- DAILY LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS daily_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  meal_ids JSONB DEFAULT '[]',
  master_meal_ids JSONB DEFAULT '[]',
  workout_calories NUMERIC DEFAULT 0,
  health_metrics JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- RLS for daily_logs
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily logs" ON daily_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily logs" ON daily_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily logs" ON daily_logs
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- WEIGH INS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS weigh_ins (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  weight NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- RLS for weigh_ins
ALTER TABLE weigh_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weigh ins" ON weigh_ins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weigh ins" ON weigh_ins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weigh ins" ON weigh_ins
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own weigh ins" ON weigh_ins
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- INBODY SCANS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS inbody_scans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  weight NUMERIC,
  body_fat_percent NUMERIC,
  muscle_mass NUMERIC,
  skeletal_muscle NUMERIC,
  bmr NUMERIC,
  fat_mass NUMERIC,
  visceral_fat_grade NUMERIC,
  water_weight NUMERIC,
  trunk_fat_mass NUMERIC,
  body_age NUMERIC,
  protein_mass NUMERIC,
  bone_mass NUMERIC,
  image_data TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for inbody_scans
ALTER TABLE inbody_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own inbody scans" ON inbody_scans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own inbody scans" ON inbody_scans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own inbody scans" ON inbody_scans
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- USER SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  daily_calorie_target_min NUMERIC DEFAULT 1800,
  daily_calorie_target_max NUMERIC DEFAULT 2200,
  start_weight NUMERIC,
  goal_weight NUMERIC,
  start_date DATE,
  target_date DATE,  -- When user wants to reach goal weight
  ai_provider TEXT DEFAULT 'groq',
  openai_api_key TEXT,
  groq_api_key TEXT,
  groq_api_key_backup TEXT,
  saved_master_meal_ids JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for user_settings
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- MASTER MEALS TABLE (Global shared meals)
-- ============================================
CREATE TABLE IF NOT EXISTS master_meals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  calories NUMERIC NOT NULL,
  protein NUMERIC NOT NULL,
  carbs NUMERIC NOT NULL,
  fat NUMERIC NOT NULL,
  fiber NUMERIC DEFAULT 0,
  sugar NUMERIC DEFAULT 0,
  recipe JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'archived')),
  submitted_by UUID REFERENCES auth.users(id),
  submitted_by_name TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for master_meals (all authenticated users can read approved meals)
ALTER TABLE master_meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved master meals" ON master_meals
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Admins can manage master meals" ON master_meals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can update usage count" ON master_meals
  FOR UPDATE USING (status = 'approved')
  WITH CHECK (status = 'approved');

-- ============================================
-- MEAL SUBMISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS meal_submissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  source_meal_id UUID,
  name TEXT NOT NULL,
  calories NUMERIC NOT NULL,
  protein NUMERIC NOT NULL,
  carbs NUMERIC NOT NULL,
  fat NUMERIC NOT NULL,
  fiber NUMERIC DEFAULT 0,
  sugar NUMERIC DEFAULT 0,
  recipe JSONB,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  submitted_by_email TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  master_meal_id UUID REFERENCES master_meals(id)
);

-- RLS for meal_submissions
ALTER TABLE meal_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own submissions" ON meal_submissions
  FOR SELECT USING (auth.uid() = submitted_by);

CREATE POLICY "Users can insert own submissions" ON meal_submissions
  FOR INSERT WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Users can delete own pending submissions" ON meal_submissions
  FOR DELETE USING (auth.uid() = submitted_by AND status = 'pending');

CREATE POLICY "Admins can view all submissions" ON meal_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update submissions" ON meal_submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_meals_user_id ON meals(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON daily_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_weigh_ins_user_date ON weigh_ins(user_id, date);
CREATE INDEX IF NOT EXISTS idx_inbody_scans_user_id ON inbody_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_master_meals_status ON master_meals(status);
CREATE INDEX IF NOT EXISTS idx_meal_submissions_status ON meal_submissions(status);
CREATE INDEX IF NOT EXISTS idx_meal_submissions_submitted_by ON meal_submissions(submitted_by);

-- ============================================
-- TRIGGER: Auto-create user profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, role)
  VALUES (NEW.id, NEW.email, 'user')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- MIGRATION: Add height and activity level
-- Run this if you have an existing installation
-- ============================================
-- ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS height_cm NUMERIC;
-- ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS activity_level TEXT
--   CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active'));
-- ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_gender_check;
-- ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_gender_check
--   CHECK (gender IN ('male', 'female', 'other', 'prefer-not-to-say'));
