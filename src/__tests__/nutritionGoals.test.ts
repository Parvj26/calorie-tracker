import { describe, it, expect } from 'vitest';
import {
  calculateNutritionGoals,
  getDefaultNutritionGoals,
  calculateAge,
  formatGoalValue,
  calculateProgress,
  getProgressStatus,
} from '../utils/nutritionGoals';

// ============================================
// NUTRITION GOALS CALCULATION TESTS
// ============================================

describe('Nutrition Goals', () => {
  describe('calculateNutritionGoals', () => {
    it('calculates fiber based on calorie target', () => {
      const goals = calculateNutritionGoals({
        age: 30,
        gender: 'male',
        weightKg: 80,
        calorieTarget: 2000,
      });

      // 14g per 1000 cal = 28g for 2000 cal
      expect(goals.fiber).toBe(28);
    });

    it('calculates sugar based on gender', () => {
      const maleGoals = calculateNutritionGoals({
        age: 30,
        gender: 'male',
        weightKg: 80,
        calorieTarget: 2000,
      });

      const femaleGoals = calculateNutritionGoals({
        age: 30,
        gender: 'female',
        weightKg: 60,
        calorieTarget: 1600,
      });

      expect(maleGoals.sugar).toBe(36);
      expect(femaleGoals.sugar).toBe(25);
    });

    it('calculates protein based on weight and activity level', () => {
      const sedentary = calculateNutritionGoals({
        age: 30,
        gender: 'male',
        weightKg: 80,
        calorieTarget: 2000,
        activityLevel: 'sedentary',
      });

      const active = calculateNutritionGoals({
        age: 30,
        gender: 'male',
        weightKg: 80,
        calorieTarget: 2000,
        activityLevel: 'active',
      });

      // Sedentary: 80 × 0.8 = 64g
      expect(sedentary.protein).toBe(64);
      // Active: 80 × 1.4 = 112g
      expect(active.protein).toBe(112);
    });

    it('calculates protein for all activity levels', () => {
      const testCases = [
        { level: 'sedentary' as const, expected: 64 },   // 80 × 0.8
        { level: 'light' as const, expected: 80 },       // 80 × 1.0
        { level: 'moderate' as const, expected: 96 },    // 80 × 1.2
        { level: 'active' as const, expected: 112 },     // 80 × 1.4
        { level: 'very_active' as const, expected: 128 }, // 80 × 1.6
      ];

      testCases.forEach(({ level, expected }) => {
        const goals = calculateNutritionGoals({
          age: 30,
          gender: 'male',
          weightKg: 80,
          calorieTarget: 2000,
          activityLevel: level,
        });
        expect(goals.protein).toBe(expected);
      });
    });

    it('calculates carbs as 50% of calories', () => {
      const goals = calculateNutritionGoals({
        age: 30,
        gender: 'male',
        weightKg: 80,
        calorieTarget: 2000,
      });

      // 50% of 2000 = 1000 cal / 4 cal per g = 250g
      expect(goals.carbs).toBe(250);
    });

    it('calculates fat as 30% of calories', () => {
      const goals = calculateNutritionGoals({
        age: 30,
        gender: 'male',
        weightKg: 80,
        calorieTarget: 2000,
      });

      // 30% of 2000 = 600 cal / 9 cal per g = 66.67g ≈ 67g
      expect(goals.fat).toBe(67);
    });

    it('calculates calorie range (±10%)', () => {
      const goals = calculateNutritionGoals({
        age: 30,
        gender: 'male',
        weightKg: 80,
        calorieTarget: 2000,
      });

      expect(goals.calories.min).toBe(1800); // 2000 × 0.9
      expect(goals.calories.max).toBe(2200); // 2000 × 1.1
    });

    it('uses fallback fiber for zero calorie target', () => {
      const youngMale = calculateNutritionGoals({
        age: 30,
        gender: 'male',
        weightKg: 80,
        calorieTarget: 0,
      });

      const olderFemale = calculateNutritionGoals({
        age: 55,
        gender: 'female',
        weightKg: 60,
        calorieTarget: 0,
      });

      expect(youngMale.fiber).toBe(38); // Male < 51
      expect(olderFemale.fiber).toBe(21); // Female >= 51
    });
  });

  describe('getDefaultNutritionGoals', () => {
    it('returns default values for 2000 calories', () => {
      const goals = getDefaultNutritionGoals();

      expect(goals.calories.min).toBe(1800);
      expect(goals.calories.max).toBe(2200);
      expect(goals.protein).toBe(50);
      expect(goals.carbs).toBe(250);
      expect(goals.fat).toBe(65);
      expect(goals.fiber).toBe(28);
      expect(goals.sugar).toBe(30);
    });

    it('scales calorie range with custom target', () => {
      const goals = getDefaultNutritionGoals(1500);

      expect(goals.calories.min).toBeCloseTo(1350, 0);
      expect(goals.calories.max).toBeCloseTo(1650, 0);
    });
  });
});

// ============================================
// AGE CALCULATION TESTS
// ============================================

describe('Age Calculation', () => {
  it('calculates age correctly', () => {
    const today = new Date();
    const thirtyYearsAgo = new Date(
      today.getFullYear() - 30,
      today.getMonth(),
      today.getDate()
    );

    const age = calculateAge(thirtyYearsAgo.toISOString().split('T')[0]);
    expect(age).toBe(30);
  });

  it('handles birthday not yet passed this year', () => {
    const today = new Date();
    const futureMonthBirthday = new Date(
      today.getFullYear() - 25,
      today.getMonth() + 1, // Next month
      15
    );

    const age = calculateAge(futureMonthBirthday.toISOString().split('T')[0]);
    expect(age).toBe(24); // Not 25 yet
  });

  it('handles birthday already passed this year', () => {
    const today = new Date();
    const pastMonthBirthday = new Date(
      today.getFullYear() - 25,
      today.getMonth() - 1, // Last month
      15
    );

    const age = calculateAge(pastMonthBirthday.toISOString().split('T')[0]);
    expect(age).toBe(25);
  });

  it('handles leap year birthdays', () => {
    // Test with a consistent date
    const birthDate = '2000-02-29';
    const age = calculateAge(birthDate);
    // This should work regardless of current year
    expect(age).toBeGreaterThan(20);
  });
});

// ============================================
// FORMATTING TESTS
// ============================================

describe('Goal Formatting', () => {
  describe('formatGoalValue', () => {
    it('formats value with default unit', () => {
      expect(formatGoalValue(100)).toBe('100g');
      expect(formatGoalValue(50.6)).toBe('51g');
    });

    it('formats value with custom unit', () => {
      expect(formatGoalValue(2000, 'cal')).toBe('2000cal');
      expect(formatGoalValue(8, 'cups')).toBe('8cups');
    });

    it('rounds decimal values', () => {
      expect(formatGoalValue(50.4)).toBe('50g');
      expect(formatGoalValue(50.5)).toBe('51g');
    });
  });
});

// ============================================
// PROGRESS CALCULATION TESTS
// ============================================

describe('Progress Calculation', () => {
  describe('calculateProgress', () => {
    it('calculates percentage correctly', () => {
      expect(calculateProgress(50, 100)).toBe(50);
      expect(calculateProgress(75, 100)).toBe(75);
      expect(calculateProgress(100, 100)).toBe(100);
    });

    it('caps at 100%', () => {
      expect(calculateProgress(150, 100)).toBe(100);
      expect(calculateProgress(200, 100)).toBe(100);
    });

    it('handles zero goal', () => {
      expect(calculateProgress(50, 0)).toBe(0);
    });

    it('handles zero current', () => {
      expect(calculateProgress(0, 100)).toBe(0);
    });

    it('rounds to nearest integer', () => {
      expect(calculateProgress(33, 100)).toBe(33);
      expect(calculateProgress(66, 100)).toBe(66);
    });
  });

  describe('getProgressStatus', () => {
    describe('minimum goals (fiber, protein)', () => {
      it('returns good when at or over goal', () => {
        expect(getProgressStatus(100, 100, 'minimum')).toBe('good');
        expect(getProgressStatus(120, 100, 'minimum')).toBe('good');
      });

      it('returns warning when 70-99%', () => {
        expect(getProgressStatus(70, 100, 'minimum')).toBe('warning');
        expect(getProgressStatus(80, 100, 'minimum')).toBe('warning');
        expect(getProgressStatus(99, 100, 'minimum')).toBe('warning');
      });

      it('returns danger when under 70%', () => {
        expect(getProgressStatus(69, 100, 'minimum')).toBe('danger');
        expect(getProgressStatus(50, 100, 'minimum')).toBe('danger');
        expect(getProgressStatus(0, 100, 'minimum')).toBe('danger');
      });
    });

    describe('maximum goals (sugar)', () => {
      it('returns good when under 75%', () => {
        expect(getProgressStatus(0, 100, 'maximum')).toBe('good');
        expect(getProgressStatus(50, 100, 'maximum')).toBe('good');
        expect(getProgressStatus(75, 100, 'maximum')).toBe('good');
      });

      it('returns warning when 76-100%', () => {
        expect(getProgressStatus(76, 100, 'maximum')).toBe('warning');
        expect(getProgressStatus(90, 100, 'maximum')).toBe('warning');
        expect(getProgressStatus(100, 100, 'maximum')).toBe('warning');
      });

      it('returns warning when at 100% (capped by calculateProgress)', () => {
        // Note: getProgressStatus uses calculateProgress which caps at 100%
        // So values over 100 still get 'warning' status since percentage = 100
        expect(getProgressStatus(101, 100, 'maximum')).toBe('warning');
        expect(getProgressStatus(150, 100, 'maximum')).toBe('warning');
      });
    });
  });
});
