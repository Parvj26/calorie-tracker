/**
 * Seed script to create demo user data
 *
 * Run with: npx tsx scripts/seed-demo-user.ts
 *
 * Prerequisites:
 * 1. Create a user in Supabase Auth with email: demo@caltracker.app
 * 2. Get the user's UUID from Supabase dashboard
 * 3. Set DEMO_USER_ID below
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// Configuration
const SUPABASE_URL = 'https://jjbozzkghpmvxpnoazwu.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''; // Set via env or paste here temporarily
const DEMO_USER_ID = 'cb48025b-a7ee-4f3b-9f74-cbe84c15ce51';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Default meals to use
const meals = [
  { id: 'acai-bowl', name: 'Acai Bowl', calories: 415, protein: 31, carbs: 60, fat: 7, fiber: 8, sugar: 25 },
  { id: 'chicken-tikka', name: 'Chicken Tikka with Mint Sauce', calories: 400, protein: 60, carbs: 8, fat: 14, fiber: 1, sugar: 3 },
  { id: 'protein-shake', name: 'Protein Shake', calories: 345, protein: 34, carbs: 41, fat: 5, fiber: 3, sugar: 22 },
  { id: 'chickpea-paneer-bowl', name: 'Chickpea Paneer Bowl', calories: 650, protein: 36, carbs: 52, fat: 35, fiber: 12, sugar: 6 },
  { id: 'grilled-chicken', name: 'Grilled Chicken Breast', calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, servingSize: 100 },
  { id: 'greek-yogurt', name: 'Greek Yogurt with Berries', calories: 180, protein: 15, carbs: 20, fat: 5, fiber: 2, sugar: 15 },
  { id: 'oatmeal', name: 'Oatmeal with Banana', calories: 280, protein: 8, carbs: 52, fat: 5, fiber: 6, sugar: 12 },
  { id: 'salad-bowl', name: 'Mixed Green Salad', calories: 250, protein: 8, carbs: 18, fat: 16, fiber: 5, sugar: 6 },
  { id: 'rice-dal', name: 'Rice with Dal', calories: 380, protein: 14, carbs: 68, fat: 4, fiber: 8, sugar: 2 },
  { id: 'eggs-toast', name: 'Scrambled Eggs on Toast', calories: 320, protein: 18, carbs: 28, fat: 14, fiber: 2, sugar: 3 },
];

// Helper to get date string
const getDateStr = (daysAgo: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
};

// Random helper
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min: number, max: number) => Math.round((Math.random() * (max - min) + min) * 10) / 10;

// Generate meal plan for a day (realistic patterns)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const generateDayMeals = (dayOfWeek: number): string[] => {
  const mealIds: string[] = [];

  // Breakfast (80% chance)
  if (Math.random() > 0.2) {
    const breakfastOptions = ['acai-bowl', 'oatmeal', 'eggs-toast', 'greek-yogurt', 'protein-shake'];
    mealIds.push(breakfastOptions[randomInt(0, breakfastOptions.length - 1)]);
  }

  // Lunch
  const lunchOptions = ['chicken-tikka', 'chickpea-paneer-bowl', 'salad-bowl', 'rice-dal'];
  mealIds.push(lunchOptions[randomInt(0, lunchOptions.length - 1)]);

  // Snack (60% chance)
  if (Math.random() > 0.4) {
    const snackOptions = ['protein-shake', 'greek-yogurt'];
    mealIds.push(snackOptions[randomInt(0, snackOptions.length - 1)]);
  }

  // Dinner
  const dinnerOptions = ['chicken-tikka', 'grilled-chicken', 'chickpea-paneer-bowl', 'rice-dal'];
  mealIds.push(dinnerOptions[randomInt(0, dinnerOptions.length - 1)]);

  return mealIds;
};

// Generate health metrics for a day
const generateHealthMetrics = (dayOfWeek: number) => {
  // Weekend = less active
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const activityMultiplier = isWeekend ? 0.7 : 1;

  return {
    restingEnergy: randomInt(1650, 1750), // BMR range
    activeEnergy: Math.round(randomInt(300, 600) * activityMultiplier),
    steps: Math.round(randomInt(6000, 12000) * activityMultiplier),
    exerciseMinutes: Math.round(randomInt(20, 60) * activityMultiplier),
  };
};

async function seedDemoUser() {
  if (!SUPABASE_SERVICE_KEY) {
    console.error('Please set SUPABASE_SERVICE_KEY environment variable');
    console.log('\nRun with: SUPABASE_SERVICE_KEY=your_key npx tsx scripts/seed-demo-user.ts');
    console.log('\nGet the service_role key from: Supabase Dashboard > Settings > API > service_role');
    process.exit(1);
  }

  console.log('Seeding demo user data...\n');

  // Create UUID mapping for meals
  const mealUuidMap: Record<string, string> = {};
  for (const meal of meals) {
    mealUuidMap[meal.id] = randomUUID();
  }

  // 1. Insert meals with proper UUIDs
  console.log('1. Inserting meals...');
  for (const meal of meals) {
    const { error } = await supabase.from('meals').upsert({
      id: mealUuidMap[meal.id],
      user_id: DEMO_USER_ID,
      name: meal.name,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      fiber: meal.fiber || 0,
      sugar: meal.sugar || 0,
      is_custom: false,
      serving_size: (meal as { servingSize?: number }).servingSize || null,
    });
    if (error) console.error(`  Error inserting ${meal.name}:`, error.message);
    else console.log(`  Added: ${meal.name}`);
  }

  // 2. Insert daily logs for past 45 days
  console.log('\n2. Inserting daily logs (45 days)...');
  for (let daysAgo = 0; daysAgo < 45; daysAgo++) {
    const date = getDateStr(daysAgo);
    const dayOfWeek = new Date(date).getDay();
    const mealIds = generateDayMeals(dayOfWeek).map(id => mealUuidMap[id]);
    const healthMetrics = generateHealthMetrics(dayOfWeek);

    const { error } = await supabase.from('daily_logs').upsert({
      user_id: DEMO_USER_ID,
      date,
      meal_ids: mealIds,
      workout_calories: 0,
      health_metrics: healthMetrics,
    }, { onConflict: 'user_id,date' });

    if (error) console.error(`  Error for ${date}:`, error.message);
    else if (daysAgo % 7 === 0) console.log(`  Added logs up to ${date}`);
  }

  // 3. Insert weigh-ins (gradual weight loss from 82kg to 78kg over 45 days)
  console.log('\n3. Inserting weigh-ins...');
  const startWeight = 82;
  const weightLossPerDay = 0.08; // ~0.5kg/week

  for (let daysAgo = 44; daysAgo >= 0; daysAgo -= 2) { // Every 2 days
    const date = getDateStr(daysAgo);
    const dayNumber = 44 - daysAgo;
    const baseWeight = startWeight - (dayNumber * weightLossPerDay);
    const weight = randomFloat(baseWeight - 0.3, baseWeight + 0.3); // Add some variance

    const { error } = await supabase.from('weigh_ins').upsert({
      user_id: DEMO_USER_ID,
      date,
      weight: Math.round(weight * 10) / 10,
    }, { onConflict: 'user_id,date' });

    if (error) console.error(`  Error for ${date}:`, error.message);
  }
  console.log('  Added 23 weigh-ins');

  // 4. Insert InBody scans (weekly)
  console.log('\n4. Inserting InBody scans (weekly)...');
  const inBodyDates = [42, 35, 28, 21, 14, 7, 0]; // Weekly scans

  for (let i = 0; i < inBodyDates.length; i++) {
    const daysAgo = inBodyDates[i];
    const date = getDateStr(daysAgo);
    const weekNumber = i;

    const weight = startWeight - (weekNumber * 0.5) + randomFloat(-0.2, 0.2);
    const bodyFat = 22 - (weekNumber * 0.3) + randomFloat(-0.2, 0.2);
    const muscleMass = 35 + (weekNumber * 0.1) + randomFloat(-0.1, 0.1);

    const { error } = await supabase.from('inbody_scans').upsert({
      id: randomUUID(),
      user_id: DEMO_USER_ID,
      date,
      weight: Math.round(weight * 10) / 10,
      body_fat_percent: Math.round(bodyFat * 10) / 10,
      muscle_mass: Math.round(muscleMass * 10) / 10,
      skeletal_muscle: Math.round((muscleMass * 0.85) * 10) / 10,
      bmr: randomInt(1680, 1720),
      fat_mass: Math.round((weight * bodyFat / 100) * 10) / 10,
      visceral_fat_grade: Math.max(8, 12 - weekNumber),
      water_weight: Math.round((weight * 0.55) * 10) / 10,
    });

    if (error) console.error(`  Error for ${date}:`, error.message);
    else console.log(`  Added scan for ${date}`);
  }

  // 5. Insert user settings
  console.log('\n5. Inserting user settings...');
  const { error: settingsError } = await supabase.from('user_settings').upsert({
    user_id: DEMO_USER_ID,
    daily_calorie_target: 1700,
    daily_calorie_target_min: 1600,
    daily_calorie_target_max: 1800,
    tef_multiplier: 1.10,
    start_weight: 82,
    goal_weight: 72,
    start_date: getDateStr(44),
    target_date: getDateStr(-90), // 90 days in future
    weight_unit: 'kg',
    ai_provider: 'groq',
  }, { onConflict: 'user_id' });

  if (settingsError) console.error('  Error:', settingsError.message);
  else console.log('  Settings saved');

  // 6. Insert user profile
  console.log('\n6. Inserting user profile...');
  const { error: profileError } = await supabase.from('user_profiles').upsert({
    user_id: DEMO_USER_ID,
    email: 'demo@caltracker.app',
    display_name: 'Demo User',
    first_name: 'Demo',
    last_name: 'User',
    height_cm: 175,
    activity_level: 'moderate',
    role: 'user',
  }, { onConflict: 'user_id' });

  if (profileError) console.error('  Error:', profileError.message);
  else console.log('  Profile saved');

  console.log('\n✅ Demo user data seeded successfully!');
  console.log('\nLogin credentials:');
  console.log('  Email: demo@caltracker.app');
  console.log('  Password: (set when creating user in Supabase)');
}

seedDemoUser().catch(console.error);
