-- Run this in Supabase SQL Editor to update master_meals with correct nutrition

-- ACAI BOWL
UPDATE master_meals SET
  calories = 415,
  protein = 31,
  carbs = 60,
  fat = 7,
  fiber = 12,
  sugar = 29,
  updated_at = NOW()
WHERE id = '5ef12d04-984c-4203-b0de-66cb7a688f26';

-- Protein Shake with Banana
UPDATE master_meals SET
  calories = 347,
  protein = 35,
  carbs = 42,
  fat = 6,
  fiber = 4,
  sugar = 27,
  updated_at = NOW()
WHERE id = 'adc01032-dbda-4082-9040-378e5408ad19';

-- CHICKEN TIKKA WITH MINT SAUCE
UPDATE master_meals SET
  calories = 385,
  protein = 62,
  carbs = 10,
  fat = 11,
  fiber = 0,
  sugar = 9,
  updated_at = NOW()
WHERE id = 'd6cf608e-0100-46a5-915c-f3c27a0c85fd';

-- Paneer Besan Chilla
UPDATE master_meals SET
  calories = 415,
  protein = 22,
  carbs = 26,
  fat = 23,
  fiber = 4,
  sugar = 5,
  updated_at = NOW()
WHERE id = 'c2dafada-8795-486f-806d-a224f24dc873';

-- Verify the updates
SELECT name, calories, protein, carbs, fat, fiber, sugar
FROM master_meals
WHERE id IN (
  '5ef12d04-984c-4203-b0de-66cb7a688f26',
  'adc01032-dbda-4082-9040-378e5408ad19',
  'd6cf608e-0100-46a5-915c-f3c27a0c85fd',
  'c2dafada-8795-486f-806d-a224f24dc873'
);
