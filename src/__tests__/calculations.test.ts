import { describe, it, expect } from 'vitest';
import {
  calculateBMRKatchMcArdle,
  calculateBMRMifflinStJeor,
  getBMRWithPriority,
  calculateDailyTarget,
  calculateRemainingCalories,
  calculateGoalBasedTarget,
  canCalculateBMR,
  ACTIVITY_MULTIPLIERS,
} from '../utils/bmrCalculation';

// ============================================
// BMR CALCULATION TESTS
// ============================================

describe('BMR Calculations', () => {
  describe('calculateBMRKatchMcArdle', () => {
    it('calculates BMR correctly for typical lean body mass', () => {
      // 60 kg lean body mass
      const bmr = calculateBMRKatchMcArdle(60);
      expect(bmr).toBe(1666); // 370 + (21.6 × 60) = 1666
    });

    it('calculates BMR for lower lean body mass', () => {
      // 45 kg lean body mass
      const bmr = calculateBMRKatchMcArdle(45);
      expect(bmr).toBe(1342); // 370 + (21.6 × 45) = 1342
    });

    it('calculates BMR for higher lean body mass', () => {
      // 80 kg lean body mass
      const bmr = calculateBMRKatchMcArdle(80);
      expect(bmr).toBe(2098); // 370 + (21.6 × 80) = 2098
    });

    it('handles decimal lean body mass', () => {
      const bmr = calculateBMRKatchMcArdle(55.5);
      expect(bmr).toBe(1569); // 370 + (21.6 × 55.5) = 1568.8 ≈ 1569
    });
  });

  describe('calculateBMRMifflinStJeor', () => {
    it('calculates BMR correctly for male', () => {
      // Male, 80kg, 180cm, 30 years
      const bmr = calculateBMRMifflinStJeor(80, 180, 30, 'male');
      expect(bmr).toBe(1780); // (10 × 80) + (6.25 × 180) - (5 × 30) + 5 = 1780
    });

    it('calculates BMR correctly for female', () => {
      // Female, 60kg, 165cm, 25 years
      // (10 × 60) + (6.25 × 165) - (5 × 25) - 161 = 600 + 1031.25 - 125 - 161 = 1345.25 ≈ 1345
      const bmr = calculateBMRMifflinStJeor(60, 165, 25, 'female');
      expect(bmr).toBe(1345);
    });

    it('calculates BMR for other gender (average of male/female)', () => {
      const bmr = calculateBMRMifflinStJeor(70, 170, 28, 'other');
      // Base: (10 × 70) + (6.25 × 170) - (5 × 28) = 700 + 1062.5 - 140 = 1622.5
      // For 'other': 1622.5 - 78 = 1544.5 ≈ 1545
      expect(bmr).toBe(1545);
    });

    it('calculates BMR for prefer-not-to-say (average)', () => {
      const bmr = calculateBMRMifflinStJeor(70, 170, 28, 'prefer-not-to-say');
      expect(bmr).toBe(1545);
    });

    it('handles older age correctly', () => {
      // Male, 75kg, 175cm, 50 years
      const bmr = calculateBMRMifflinStJeor(75, 175, 50, 'male');
      // (10 × 75) + (6.25 × 175) - (5 × 50) + 5 = 750 + 1093.75 - 250 + 5 = 1598.75 ≈ 1599
      expect(bmr).toBe(1599);
    });
  });

  describe('getBMRWithPriority', () => {
    it('prioritizes InBody BMR over all other methods', () => {
      const result = getBMRWithPriority({
        inBodyBMR: 1600,
        leanBodyMassKg: 60,
        weightKg: 80,
        heightCm: 180,
        ageYears: 30,
        gender: 'male',
      });
      expect(result.bmr).toBe(1600);
      expect(result.source).toBe('inbody');
    });

    it('uses Katch-McArdle when no InBody BMR but lean mass available', () => {
      const result = getBMRWithPriority({
        leanBodyMassKg: 60,
        weightKg: 80,
        heightCm: 180,
        ageYears: 30,
        gender: 'male',
      });
      expect(result.bmr).toBe(1666);
      expect(result.source).toBe('katch_mcardle');
    });

    it('falls back to Mifflin-St Jeor when no body comp data', () => {
      const result = getBMRWithPriority({
        weightKg: 80,
        heightCm: 180,
        ageYears: 30,
        gender: 'male',
      });
      expect(result.bmr).toBe(1780);
      expect(result.source).toBe('mifflin_st_jeor');
    });

    it('returns zero when insufficient data', () => {
      const result = getBMRWithPriority({
        weightKg: 80,
        // Missing height, age, gender
      });
      expect(result.bmr).toBe(0);
      expect(result.source).toBe('none');
    });

    it('ignores zero InBody BMR', () => {
      const result = getBMRWithPriority({
        inBodyBMR: 0,
        leanBodyMassKg: 60,
      });
      expect(result.source).toBe('katch_mcardle');
    });

    it('ignores zero lean body mass', () => {
      const result = getBMRWithPriority({
        leanBodyMassKg: 0,
        weightKg: 80,
        heightCm: 180,
        ageYears: 30,
        gender: 'male',
      });
      expect(result.source).toBe('mifflin_st_jeor');
    });
  });

  describe('canCalculateBMR', () => {
    it('returns true with InBody BMR', () => {
      const result = canCalculateBMR({ inBodyBMR: 1600 });
      expect(result.canCalculate).toBe(true);
      expect(result.missingFields).toEqual([]);
    });

    it('returns true with lean body mass', () => {
      const result = canCalculateBMR({ leanBodyMassKg: 60 });
      expect(result.canCalculate).toBe(true);
      expect(result.missingFields).toEqual([]);
    });

    it('returns true with all Mifflin data', () => {
      const result = canCalculateBMR({
        weightKg: 80,
        heightCm: 180,
        ageYears: 30,
        gender: 'male',
      });
      expect(result.canCalculate).toBe(true);
      expect(result.missingFields).toEqual([]);
    });

    it('returns missing fields when incomplete', () => {
      const result = canCalculateBMR({
        weightKg: 80,
      });
      expect(result.canCalculate).toBe(false);
      expect(result.missingFields).toContain('height');
      expect(result.missingFields).toContain('date of birth');
      expect(result.missingFields).toContain('gender');
    });
  });
});

// ============================================
// DAILY TARGET CALCULATIONS
// ============================================

describe('Daily Target Calculations', () => {
  describe('calculateDailyTarget', () => {
    it('calculates base calories with activity multiplier', () => {
      const result = calculateDailyTarget(1600, 'sedentary', 0);
      expect(result.baseCalories).toBe(1920); // 1600 × 1.2
      expect(result.targetCalories).toBe(1920);
      expect(result.deficit).toBe(0);
    });

    it('calculates target with weight loss goal', () => {
      // 0.5 kg/week loss = 3850 cal/week = 550 cal/day deficit
      const result = calculateDailyTarget(1600, 'moderate', -0.5);
      expect(result.baseCalories).toBe(2480); // 1600 × 1.55
      expect(result.deficit).toBe(-550); // Negative because losing
      expect(result.targetCalories).toBe(3030); // 2480 - (-550)
    });

    it('calculates target with weight gain goal', () => {
      // 0.25 kg/week gain = 1925 cal/week = 275 cal/day surplus
      const result = calculateDailyTarget(1600, 'active', 0.25);
      expect(result.baseCalories).toBe(2760); // 1600 × 1.725
      expect(result.deficit).toBe(275);
      expect(result.targetCalories).toBe(2485); // 2760 - 275
    });

    it('uses correct activity multipliers', () => {
      const bmr = 1500;
      expect(calculateDailyTarget(bmr, 'sedentary', 0).baseCalories).toBe(1800);
      expect(calculateDailyTarget(bmr, 'light', 0).baseCalories).toBe(2063);
      expect(calculateDailyTarget(bmr, 'moderate', 0).baseCalories).toBe(2325);
      expect(calculateDailyTarget(bmr, 'active', 0).baseCalories).toBe(2588);
      expect(calculateDailyTarget(bmr, 'very_active', 0).baseCalories).toBe(2850);
    });
  });

  describe('calculateRemainingCalories', () => {
    it('calculates remaining when under target', () => {
      const remaining = calculateRemainingCalories(2000, 1200, 0);
      expect(remaining).toBe(800);
    });

    it('calculates remaining when over target', () => {
      const remaining = calculateRemainingCalories(2000, 2500, 0);
      expect(remaining).toBe(-500);
    });

    it('adds exercise calories as bonus', () => {
      const remaining = calculateRemainingCalories(2000, 1800, 300);
      expect(remaining).toBe(500); // 2000 + 300 - 1800
    });

    it('handles zero exercise', () => {
      const remaining = calculateRemainingCalories(2000, 1500);
      expect(remaining).toBe(500);
    });
  });
});

// ============================================
// GOAL-BASED TARGET CALCULATIONS
// ============================================

describe('Goal-Based Target Calculations', () => {
  describe('calculateGoalBasedTarget', () => {
    it('calculates correct target for reasonable goal', () => {
      // 80kg current, 77kg goal, 77 days (~11 weeks)
      // 3kg loss × 7700 cal = 23100 cal needed
      // 23100 / 77 days = 300 cal/day deficit
      // Target = 2000 BMR - 300 = 1700 cal (above minimum)
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 77);
      const result = calculateGoalBasedTarget(
        2000, // Higher BMR
        80,
        77, // Smaller weight loss goal
        targetDate.toISOString().split('T')[0],
        'male'
      );

      // 3kg / 11 weeks ≈ 0.27 kg/week
      expect(result.weeklyWeightLoss).toBeCloseTo(0.27, 1);
      expect(result.isAggressive).toBe(false);
      expect(result.isTooLow).toBe(false);
    });

    it('flags aggressive weight loss (>1kg/week)', () => {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 14); // 2 weeks for 5kg = 2.5kg/week
      const result = calculateGoalBasedTarget(
        1800,
        80,
        75,
        targetDate.toISOString().split('T')[0],
        'male'
      );

      expect(result.isAggressive).toBe(true);
    });

    it('enforces minimum calories for female', () => {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 7); // Aggressive timeline
      const result = calculateGoalBasedTarget(
        1400,
        70,
        65,
        targetDate.toISOString().split('T')[0],
        'female'
      );

      expect(result.targetCalories).toBeGreaterThanOrEqual(1200);
      expect(result.isTooLow).toBe(true);
    });

    it('enforces minimum calories for male', () => {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 7);
      const result = calculateGoalBasedTarget(
        1600,
        90,
        80,
        targetDate.toISOString().split('T')[0],
        'male'
      );

      expect(result.targetCalories).toBeGreaterThanOrEqual(1500);
    });

    it('returns BMR as target when no valid goal', () => {
      const result = calculateGoalBasedTarget(
        1600,
        80,
        undefined,
        undefined,
        'male'
      );

      expect(result.targetCalories).toBe(1600);
      expect(result.dailyDeficit).toBe(0);
    });

    it('handles goal weight higher than current (invalid for loss)', () => {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 30);
      const result = calculateGoalBasedTarget(
        1600,
        70,
        80, // Goal is higher than current
        targetDate.toISOString().split('T')[0],
        'male'
      );

      expect(result.targetCalories).toBe(1600);
      expect(result.dailyDeficit).toBe(0);
    });
  });
});

// ============================================
// ACTIVITY MULTIPLIERS
// ============================================

describe('Activity Multipliers', () => {
  it('has correct values for all activity levels', () => {
    expect(ACTIVITY_MULTIPLIERS.sedentary).toBe(1.2);
    expect(ACTIVITY_MULTIPLIERS.light).toBe(1.375);
    expect(ACTIVITY_MULTIPLIERS.moderate).toBe(1.55);
    expect(ACTIVITY_MULTIPLIERS.active).toBe(1.725);
    expect(ACTIVITY_MULTIPLIERS.very_active).toBe(1.9);
  });
});
