import type { Gender } from '../types';

export interface NutritionGoals {
  calories: { min: number; max: number };
  protein: number;      // grams
  carbs: number;        // grams
  fat: number;          // grams
  fiber: number;        // grams
  sugar: number;        // grams (max)
}

interface GoalCalculationInput {
  age: number;
  gender: Gender;
  weightKg: number;
  calorieTarget: number; // Average of min/max
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
}

/**
 * Calculate personalized daily nutrition goals based on user profile
 *
 * Sources:
 * - Fiber: USDA Dietary Guidelines (14g per 1000 kcal)
 * - Sugar: American Heart Association (36g men, 25g women)
 * - Protein: WHO/FAO (0.8g per kg body weight, higher for active)
 * - Carbs: USDA (45-65% of calories)
 * - Fat: USDA (20-35% of calories)
 */
export function calculateNutritionGoals(input: GoalCalculationInput): NutritionGoals {
  const { age, gender, weightKg, calorieTarget, activityLevel = 'light' } = input;

  // Fiber: 14g per 1000 calories (USDA recommendation)
  // With fallback to age/gender-based values
  let fiber: number;
  if (calorieTarget > 0) {
    fiber = Math.round((calorieTarget / 1000) * 14);
  } else {
    // Fallback based on age and gender
    if (gender === 'male') {
      fiber = age >= 51 ? 30 : 38;
    } else {
      fiber = age >= 51 ? 21 : 25;
    }
  }

  // Sugar: AHA recommendation (max added sugar)
  // Men: 36g (9 teaspoons), Women: 25g (6 teaspoons)
  const sugar = gender === 'male' ? 36 : 25;

  // Protein: Based on body weight and activity level
  // Sedentary: 0.8g/kg, Light: 1.0g/kg, Moderate: 1.2g/kg, Active: 1.4g/kg, Very Active: 1.6g/kg
  const proteinMultipliers: Record<string, number> = {
    sedentary: 0.8,
    light: 1.0,
    moderate: 1.2,
    active: 1.4,
    very_active: 1.6,
  };
  const proteinMultiplier = proteinMultipliers[activityLevel] || 1.0;
  const protein = Math.round(weightKg * proteinMultiplier);

  // Carbs: ~50% of calories (4 calories per gram)
  const carbs = Math.round((calorieTarget * 0.50) / 4);

  // Fat: ~30% of calories (9 calories per gram)
  const fat = Math.round((calorieTarget * 0.30) / 9);

  return {
    calories: { min: calorieTarget * 0.9, max: calorieTarget * 1.1 },
    protein,
    carbs,
    fat,
    fiber,
    sugar,
  };
}

/**
 * Get default nutrition goals when user profile is incomplete
 */
export function getDefaultNutritionGoals(calorieTarget: number = 2000): NutritionGoals {
  return {
    calories: { min: calorieTarget * 0.9, max: calorieTarget * 1.1 },
    protein: 50,    // RDA for average adult
    carbs: 250,     // ~50% of 2000 cal
    fat: 65,        // ~30% of 2000 cal
    fiber: 28,      // Average of male/female recommendations
    sugar: 30,      // Average of male/female AHA limits
  };
}

/**
 * Calculate age from date of birth string
 */
export function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

/**
 * Format goal value for display
 */
export function formatGoalValue(value: number, unit: string = 'g'): string {
  return `${Math.round(value)}${unit}`;
}

/**
 * Calculate progress percentage towards a goal
 * For "max" goals like sugar, returns how much of the limit is used
 */
export function calculateProgress(current: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(100, Math.round((current / goal) * 100));
}

/**
 * Determine status color based on progress
 * For nutrients like fiber (want to reach goal): under = warning, at/over = good
 * For nutrients like sugar (want to stay under): under = good, over = warning
 */
export type GoalType = 'minimum' | 'maximum';

export function getProgressStatus(
  current: number,
  goal: number,
  goalType: GoalType
): 'good' | 'warning' | 'danger' {
  const percentage = calculateProgress(current, goal);

  if (goalType === 'minimum') {
    // For fiber, protein - want to reach the goal
    if (percentage >= 100) return 'good';
    if (percentage >= 70) return 'warning';
    return 'danger';
  } else {
    // For sugar - want to stay under
    if (percentage <= 75) return 'good';
    if (percentage <= 100) return 'warning';
    return 'danger';
  }
}
