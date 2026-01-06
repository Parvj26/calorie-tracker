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
