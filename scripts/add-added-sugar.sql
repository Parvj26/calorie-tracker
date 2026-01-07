-- Run this in Supabase SQL Editor to add added_sugar column

-- Add added_sugar column to meals table
ALTER TABLE meals ADD COLUMN IF NOT EXISTS added_sugar REAL DEFAULT 0;

-- Add added_sugar column to master_meals table
ALTER TABLE master_meals ADD COLUMN IF NOT EXISTS added_sugar REAL DEFAULT 0;

-- Add added_sugar column to meal_submissions table
ALTER TABLE meal_submissions ADD COLUMN IF NOT EXISTS added_sugar REAL DEFAULT 0;

-- Verify the columns were added
SELECT
  table_name,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE column_name = 'added_sugar'
  AND table_schema = 'public';
