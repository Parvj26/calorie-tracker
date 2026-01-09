/**
 * BMR (Basal Metabolic Rate) and Calorie Calculation Utilities
 *
 * Implements MyFitnessPal-style calorie tracking:
 * - BMR as the stable baseline
 * - Activity multiplier for NEAT (non-exercise activity)
 * - Exercise adds calories back (bonus)
 */

import type { Gender, ActivityLevel } from '../types';

// Activity multipliers for NEAT calculation
export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,      // Desk job, no exercise
  light: 1.375,        // Light exercise 1-3 days/week
  moderate: 1.55,      // Moderate exercise 3-5 days/week
  active: 1.725,       // Hard exercise 6-7 days/week
  very_active: 1.9,    // Athlete or physical job
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary (desk job, no exercise)',
  light: 'Light (exercise 1-3 days/week)',
  moderate: 'Moderate (exercise 3-5 days/week)',
  active: 'Active (exercise 6-7 days/week)',
  very_active: 'Very Active (athlete/physical job)',
};

export type BMRSource = 'inbody' | 'katch_mcardle' | 'mifflin_st_jeor' | 'none';

/**
 * Katch-McArdle formula - most accurate when lean mass is known
 * BMR = 370 + (21.6 x lean body mass in kg)
 * Works for all genders - no adjustment needed
 */
export function calculateBMRKatchMcArdle(leanBodyMassKg: number): number {
  return Math.round(370 + (21.6 * leanBodyMassKg));
}

/**
 * Mifflin-St Jeor formula - good fallback when lean mass unknown
 * Men:   BMR = (10 x weight) + (6.25 x height) - (5 x age) + 5
 * Women: BMR = (10 x weight) + (6.25 x height) - (5 x age) - 161
 */
export function calculateBMRMifflinStJeor(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  gender: Gender
): number {
  const base = (10 * weightKg) + (6.25 * heightCm) - (5 * ageYears);

  if (gender === 'male') return Math.round(base + 5);
  if (gender === 'female') return Math.round(base - 161);
  // 'other'/'prefer-not-to-say': average of male and female
  return Math.round(base - 78);
}

export interface BMRResult {
  bmr: number;
  source: BMRSource;
}

/**
 * Get BMR with priority:
 * 1. InBody measured BMR (highest accuracy)
 * 2. Katch-McArdle from lean body mass (very accurate)
 * 3. Mifflin-St Jeor from basic data (good fallback)
 */
export function getBMRWithPriority(params: {
  inBodyBMR?: number;
  leanBodyMassKg?: number;
  weightKg?: number;
  heightCm?: number;
  ageYears?: number;
  gender?: Gender;
}): BMRResult {
  const { inBodyBMR, leanBodyMassKg, weightKg, heightCm, ageYears, gender } = params;

  // Priority 1: InBody measured BMR
  if (inBodyBMR && inBodyBMR > 0) {
    return { bmr: inBodyBMR, source: 'inbody' };
  }

  // Priority 2: Katch-McArdle (from lean body mass)
  if (leanBodyMassKg && leanBodyMassKg > 0) {
    return {
      bmr: calculateBMRKatchMcArdle(leanBodyMassKg),
      source: 'katch_mcardle',
    };
  }

  // Priority 3: Mifflin-St Jeor
  if (weightKg && weightKg > 0 && heightCm && heightCm > 0 && ageYears && ageYears > 0 && gender) {
    return {
      bmr: calculateBMRMifflinStJeor(weightKg, heightCm, ageYears, gender),
      source: 'mifflin_st_jeor',
    };
  }

  return { bmr: 0, source: 'none' };
}

export interface DailyTargetResult {
  baseCalories: number;    // BMR x activity multiplier
  targetCalories: number;  // Base - deficit
  deficit: number;         // Daily calorie deficit
}

/**
 * Calculate daily calorie target (MFP-style)
 * Base = BMR x Activity Multiplier
 * Target = Base - Deficit (for weight loss)
 *
 * @param bmr - Basal Metabolic Rate
 * @param activityLevel - User's activity level
 * @param weeklyWeightGoalKg - Weekly weight change goal (negative = lose, positive = gain)
 */
export function calculateDailyTarget(
  bmr: number,
  activityLevel: ActivityLevel,
  weeklyWeightGoalKg: number = 0
): DailyTargetResult {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel];
  const baseCalories = Math.round(bmr * multiplier);

  // 1 kg of body fat ~ 7700 calories
  // Daily deficit = weekly goal calories / 7 days
  const dailyDeficit = Math.round((weeklyWeightGoalKg * 7700) / 7);
  const targetCalories = baseCalories - dailyDeficit;

  return {
    baseCalories,
    targetCalories,
    deficit: dailyDeficit,
  };
}

/**
 * Calculate remaining calories (MFP-style with exercise bonus)
 * Remaining = Target + Exercise Bonus - Food Consumed
 */
export function calculateRemainingCalories(
  targetCalories: number,
  caloriesConsumed: number,
  exerciseCalories: number = 0
): number {
  return targetCalories + exerciseCalories - caloriesConsumed;
}

/**
 * Get human-readable BMR source label
 */
export function getBMRSourceLabel(source: BMRSource): string {
  switch (source) {
    case 'inbody':
      return 'Measured by InBody';
    case 'katch_mcardle':
      return 'Katch-McArdle formula (from body composition)';
    case 'mifflin_st_jeor':
      return 'Mifflin-St Jeor formula';
    case 'none':
      return 'Not available';
  }
}

/**
 * Check if we have enough data to calculate BMR
 */
export function canCalculateBMR(params: {
  inBodyBMR?: number;
  leanBodyMassKg?: number;
  weightKg?: number;
  heightCm?: number;
  ageYears?: number;
  gender?: Gender;
}): { canCalculate: boolean; missingFields: string[] } {
  const { inBodyBMR, leanBodyMassKg, weightKg, heightCm, ageYears, gender } = params;

  // Check if we have InBody BMR
  if (inBodyBMR && inBodyBMR > 0) {
    return { canCalculate: true, missingFields: [] };
  }

  // Check if we have lean body mass for Katch-McArdle
  if (leanBodyMassKg && leanBodyMassKg > 0) {
    return { canCalculate: true, missingFields: [] };
  }

  // Check what's missing for Mifflin-St Jeor
  const missingFields: string[] = [];
  if (!weightKg || weightKg <= 0) missingFields.push('weight');
  if (!heightCm || heightCm <= 0) missingFields.push('height');
  if (!ageYears || ageYears <= 0) missingFields.push('date of birth');
  if (!gender) missingFields.push('gender');

  return {
    canCalculate: missingFields.length === 0,
    missingFields,
  };
}
