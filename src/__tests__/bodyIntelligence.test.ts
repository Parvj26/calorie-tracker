import { describe, it, expect } from 'vitest';
import {
  calculateBodyIntelligence,
  getResponseScoreInterpretation,
  getQualityInterpretation,
  getMetabolicInterpretation,
} from '../utils/bodyIntelligence';
import type { DailyLog, WeighIn, InBodyScan, Meal } from '../types';

// ============================================
// TEST DATA HELPERS
// ============================================

const createMeal = (id: string, calories: number): Meal => ({
  id,
  name: `Meal ${id}`,
  calories,
  protein: 20,
  carbs: 30,
  fat: 10,
  fiber: 5,
  sugar: 5,
  servingSize: 100,
});

const createDailyLog = (date: string, mealIds: string[], workoutCalories = 0): DailyLog => ({
  date,
  meals: mealIds,
  workoutCalories,
});

const createWeighIn = (date: string, weight: number): WeighIn => ({
  date,
  weight,
});

const createInBodyScan = (
  date: string,
  weight: number,
  options: Partial<InBodyScan> = {}
): InBodyScan => ({
  id: `scan-${date}`,
  date,
  weight,
  bodyFatPercent: options.bodyFatPercent || 20,
  muscleMass: options.muscleMass || 40,
  skeletalMuscle: options.skeletalMuscle || 30,
  ...options,
});

// Generate dates in the past
const daysAgo = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
};

// ============================================
// BODY INTELLIGENCE CALCULATION TESTS
// ============================================

describe('Body Intelligence Calculations', () => {
  describe('calculateBodyIntelligence - Basic', () => {
    const meals = [createMeal('m1', 500)];

    it('returns insufficient data when no logs', () => {
      const result = calculateBodyIntelligence([], [], [], meals, 1600);
      expect(result.responseStatus).toBe('insufficient-data');
      expect(result.daysWithData).toBe(0);
    });

    it('returns insufficient data when BMR is zero', () => {
      const logs = [createDailyLog(daysAgo(1), ['m1'])];
      const result = calculateBodyIntelligence(logs, [], [], meals, 0);
      expect(result.responseStatus).toBe('insufficient-data');
    });

    it('calculates accumulated deficit correctly', () => {
      // Each day: BMR 1600 + 0 active = 1600 TDEE
      // Each day: 500 cal consumed
      // Daily deficit: 1600 - 500 = 1100 cal
      const logs = [
        createDailyLog(daysAgo(3), ['m1']),
        createDailyLog(daysAgo(2), ['m1']),
        createDailyLog(daysAgo(1), ['m1']),
      ];

      const result = calculateBodyIntelligence(logs, [], [], meals, 1600);
      expect(result.accumulatedDeficit).toBe(3300); // 3 days × 1100
      expect(result.daysWithData).toBe(3);
    });

    it('includes workout calories in TDEE', () => {
      // Day with workout: TDEE = 1600 + 300 = 1900
      // Consumed: 500, Deficit: 1400
      const logs = [createDailyLog(daysAgo(1), ['m1'], 300)];
      const result = calculateBodyIntelligence(logs, [], [], meals, 1600);
      expect(result.accumulatedDeficit).toBe(1400);
    });

    it('skips days with no food logged', () => {
      const logs = [
        createDailyLog(daysAgo(3), ['m1']),
        createDailyLog(daysAgo(2), []), // No meals
        createDailyLog(daysAgo(1), ['m1']),
      ];

      const result = calculateBodyIntelligence(logs, [], [], meals, 1600);
      expect(result.daysWithData).toBe(2);
    });
  });

  describe('calculateBodyIntelligence - Response Score', () => {
    const meals = [createMeal('m1', 500)];

    it('calculates response score when expected > 0.1kg', () => {
      // 7 days of 1100 cal deficit = 7700 cal = 1kg expected loss
      const logs = Array.from({ length: 7 }, (_, i) =>
        createDailyLog(daysAgo(7 - i), ['m1'])
      );

      // Actually lost 0.9kg
      const weighIns = [
        createWeighIn(daysAgo(7), 80),
        createWeighIn(daysAgo(0), 79.1),
      ];

      const result = calculateBodyIntelligence(logs, weighIns, [], meals, 1600, 30);
      expect(result.responseScore).toBe(90); // (0.9 / 1) × 100
      expect(result.responseStatus).toBe('normal');
    });

    it('flags slow response when score < 80', () => {
      const logs = Array.from({ length: 7 }, (_, i) =>
        createDailyLog(daysAgo(7 - i), ['m1'])
      );

      // Expected 1kg, actually lost 0.5kg
      const weighIns = [
        createWeighIn(daysAgo(7), 80),
        createWeighIn(daysAgo(0), 79.5),
      ];

      const result = calculateBodyIntelligence(logs, weighIns, [], meals, 1600, 30);
      expect(result.responseScore).toBe(50);
      expect(result.responseStatus).toBe('slow');
    });

    it('flags fast response when score > 120', () => {
      const logs = Array.from({ length: 7 }, (_, i) =>
        createDailyLog(daysAgo(7 - i), ['m1'])
      );

      // Expected 1kg, actually lost 1.5kg
      const weighIns = [
        createWeighIn(daysAgo(7), 80),
        createWeighIn(daysAgo(0), 78.5),
      ];

      const result = calculateBodyIntelligence(logs, weighIns, [], meals, 1600, 30);
      expect(result.responseScore).toBe(150);
      expect(result.responseStatus).toBe('fast');
    });

    it('returns insufficient data when < 2 weigh-ins', () => {
      const logs = Array.from({ length: 7 }, (_, i) =>
        createDailyLog(daysAgo(7 - i), ['m1'])
      );
      const weighIns = [createWeighIn(daysAgo(3), 80)];

      const result = calculateBodyIntelligence(logs, weighIns, [], meals, 1600, 30);
      expect(result.responseStatus).toBe('insufficient-data');
    });
  });

  describe('calculateBodyIntelligence - Weight Quality', () => {
    const meals = [createMeal('m1', 500)];
    const logs = [createDailyLog(daysAgo(1), ['m1'])];

    it('calculates excellent quality (>= 80% fat loss)', () => {
      const scans = [
        createInBodyScan(daysAgo(14), 80, { fatMass: 20, muscleMass: 40 }),
        createInBodyScan(daysAgo(0), 78, { fatMass: 18, muscleMass: 40 }),
      ];

      const result = calculateBodyIntelligence(logs, [], scans, meals, 1600);
      // Lost 2kg total, 2kg from fat = 100% efficiency
      expect(result.fatLossEfficiency).toBe(100);
      expect(result.qualityStatus).toBe('excellent');
      expect(result.hasInBodyData).toBe(true);
    });

    it('calculates good quality (60-79% fat loss)', () => {
      const scans = [
        createInBodyScan(daysAgo(14), 80, { fatMass: 20, muscleMass: 40 }),
        createInBodyScan(daysAgo(0), 78, { fatMass: 18.6, muscleMass: 39.6 }),
      ];

      const result = calculateBodyIntelligence(logs, [], scans, meals, 1600);
      // Lost 2kg total, 1.4kg from fat = 70% efficiency
      expect(result.fatLossEfficiency).toBe(70);
      expect(result.qualityStatus).toBe('good');
    });

    it('calculates concerning quality (< 60% fat loss)', () => {
      const scans = [
        createInBodyScan(daysAgo(14), 80, { fatMass: 20, muscleMass: 40 }),
        createInBodyScan(daysAgo(0), 78, { fatMass: 19.4, muscleMass: 38.6 }),
      ];

      const result = calculateBodyIntelligence(logs, [], scans, meals, 1600);
      // Lost 2kg total, 0.6kg from fat = 30% efficiency
      expect(result.fatLossEfficiency).toBe(30);
      expect(result.qualityStatus).toBe('concerning');
    });

    it('detects body recomposition (stable weight, fat loss)', () => {
      const scans = [
        createInBodyScan(daysAgo(14), 80, { fatMass: 20, muscleMass: 40 }),
        createInBodyScan(daysAgo(0), 80, { fatMass: 19, muscleMass: 41 }),
      ];

      const result = calculateBodyIntelligence(logs, [], scans, meals, 1600);
      // Weight stable, lost 1kg fat, gained 1kg muscle
      expect(result.totalWeightLost).toBe(0);
      expect(result.fatLost).toBe(1);
      expect(result.muscleLost).toBe(-1); // Negative = gained
      expect(result.qualityStatus).toBe('excellent');
    });

    it('handles weight gain - quality bulk (mostly muscle)', () => {
      const scans = [
        createInBodyScan(daysAgo(14), 78, { fatMass: 18, muscleMass: 40 }),
        createInBodyScan(daysAgo(0), 80, { fatMass: 18.5, muscleMass: 41.5 }),
      ];

      const result = calculateBodyIntelligence(logs, [], scans, meals, 1600);
      // Gained 2kg total, 1.5kg muscle, 0.5kg fat = 75% muscle
      expect(result.totalWeightLost).toBe(-2);
      expect(result.qualityStatus).toBe('excellent');
    });

    it('returns insufficient data when < 2 InBody scans', () => {
      const scans = [createInBodyScan(daysAgo(7), 80, { fatMass: 20 })];

      const result = calculateBodyIntelligence(logs, [], scans, meals, 1600);
      expect(result.qualityStatus).toBe('insufficient-data');
      expect(result.hasInBodyData).toBe(false);
    });
  });

  describe('calculateBodyIntelligence - Metabolic Status', () => {
    const meals = [createMeal('m1', 500)];
    const logs = [createDailyLog(daysAgo(1), ['m1'])];

    it('shows healthy metabolic status when BMR drop is expected', () => {
      // Lost 2kg, expected BMR drop = ~14 cal
      const scans = [
        createInBodyScan(daysAgo(14), 80, { bmr: 1700, fatMass: 20 }),
        createInBodyScan(daysAgo(0), 78, { bmr: 1690, fatMass: 18 }),
      ];

      const result = calculateBodyIntelligence(logs, [], scans, meals, 1600);
      expect(result.metabolicStatus).toBe('healthy');
      expect(result.hasBMRData).toBe(true);
    });

    it('detects metabolic adaptation when BMR drops too much', () => {
      // Lost 1kg but BMR dropped 100+ cal
      const scans = [
        createInBodyScan(daysAgo(14), 80, { bmr: 1700, fatMass: 20 }),
        createInBodyScan(daysAgo(0), 79, { bmr: 1580, fatMass: 19 }),
      ];

      const result = calculateBodyIntelligence(logs, [], scans, meals, 1600);
      expect(result.metabolicStatus).toBe('adapting');
      expect(result.bmrChange).toBe(-120);
    });

    it('handles maintenance (no weight loss) with stable BMR', () => {
      const scans = [
        createInBodyScan(daysAgo(14), 80, { bmr: 1700, fatMass: 20 }),
        createInBodyScan(daysAgo(0), 80, { bmr: 1695, fatMass: 20 }),
      ];

      const result = calculateBodyIntelligence(logs, [], scans, meals, 1600);
      expect(result.metabolicStatus).toBe('healthy');
    });

    it('returns insufficient data when no BMR in scans', () => {
      const scans = [
        createInBodyScan(daysAgo(14), 80),
        createInBodyScan(daysAgo(0), 78),
      ];

      const result = calculateBodyIntelligence(logs, [], scans, meals, 1600);
      expect(result.metabolicStatus).toBe('insufficient-data');
      expect(result.hasBMRData).toBe(false);
    });
  });

  describe('calculateBodyIntelligence - Confidence Levels', () => {
    const meals = [createMeal('m1', 500)];

    it('returns very-low confidence for < 3 days', () => {
      const logs = [
        createDailyLog(daysAgo(2), ['m1']),
        createDailyLog(daysAgo(1), ['m1']),
      ];

      const result = calculateBodyIntelligence(logs, [], [], meals, 1600);
      expect(result.confidence).toBe('very-low');
      expect(result.hasEnoughData).toBe(false);
    });

    it('returns low confidence for 3-6 days', () => {
      const logs = Array.from({ length: 5 }, (_, i) =>
        createDailyLog(daysAgo(5 - i), ['m1'])
      );

      const result = calculateBodyIntelligence(logs, [], [], meals, 1600);
      expect(result.confidence).toBe('low');
      expect(result.hasEnoughData).toBe(false);
    });

    it('returns medium confidence for 7-13 days', () => {
      const logs = Array.from({ length: 10 }, (_, i) =>
        createDailyLog(daysAgo(10 - i), ['m1'])
      );

      const result = calculateBodyIntelligence(logs, [], [], meals, 1600);
      expect(result.confidence).toBe('medium');
      expect(result.hasEnoughData).toBe(true);
    });

    it('returns high confidence for 14+ days', () => {
      const logs = Array.from({ length: 14 }, (_, i) =>
        createDailyLog(daysAgo(14 - i), ['m1'])
      );

      const result = calculateBodyIntelligence(logs, [], [], meals, 1600);
      expect(result.confidence).toBe('high');
      expect(result.hasEnoughData).toBe(true);
    });
  });
});

// ============================================
// INTERPRETATION TESTS
// ============================================

describe('Response Score Interpretation', () => {
  it('interprets normal response (80-120)', () => {
    const interp = getResponseScoreInterpretation(100, 'normal');
    expect(interp.status).toBe('On Track');
    expect(interp.color).toBe('#10b981');
  });

  it('interprets slow response (< 80)', () => {
    const interp = getResponseScoreInterpretation(60, 'slow');
    expect(interp.status).toBe('Slower Than Expected');
    expect(interp.color).toBe('#f59e0b');
  });

  it('interprets very slow response (< 50)', () => {
    const interp = getResponseScoreInterpretation(40, 'slow');
    expect(interp.message).toContain('Water retention');
  });

  it('interprets fast response (> 120)', () => {
    const interp = getResponseScoreInterpretation(130, 'fast');
    expect(interp.status).toBe('Faster Than Expected');
    expect(interp.color).toBe('#8b5cf6');
  });

  it('interprets very fast response (> 150)', () => {
    const interp = getResponseScoreInterpretation(160, 'fast');
    expect(interp.message).toContain('losing water weight');
  });

  it('interprets insufficient data', () => {
    const interp = getResponseScoreInterpretation(0, 'insufficient-data');
    expect(interp.status).toBe('Insufficient Data');
    expect(interp.color).toBe('#6b7280');
  });
});

describe('Quality Interpretation', () => {
  it('interprets excellent weight loss', () => {
    const interp = getQualityInterpretation(85, 'excellent', 2, 1.7, 0.3);
    expect(interp.status).toBe('Excellent');
    expect(interp.message).toContain('85%');
  });

  it('interprets excellent recomposition', () => {
    const interp = getQualityInterpretation(100, 'excellent', 0, 1, -0.5);
    expect(interp.status).toBe('Excellent Recomp');
    expect(interp.message).toContain('recomposition');
  });

  it('interprets quality bulk', () => {
    const interp = getQualityInterpretation(75, 'excellent', -2, 0, -1.5);
    expect(interp.status).toBe('Quality Bulk');
    expect(interp.message).toContain('muscle');
  });

  it('interprets good weight loss', () => {
    const interp = getQualityInterpretation(65, 'good', 2, 1.3, 0.7);
    expect(interp.status).toBe('Good');
    expect(interp.message).toContain('resistance training');
  });

  it('interprets maintaining', () => {
    const interp = getQualityInterpretation(0, 'good', 0, 0, 0);
    expect(interp.status).toBe('Maintaining');
  });

  it('interprets concerning weight loss', () => {
    const interp = getQualityInterpretation(40, 'concerning', 2, 0.8, 1.2);
    expect(interp.status).toBe('Needs Attention');
    expect(interp.message).toContain('muscle');
  });

  it('interprets insufficient data', () => {
    const interp = getQualityInterpretation(0, 'insufficient-data');
    expect(interp.status).toBe('Insufficient Data');
    expect(interp.message).toContain('2+ InBody scans');
  });
});

describe('Metabolic Interpretation', () => {
  it('interprets healthy metabolism', () => {
    const interp = getMetabolicInterpretation('healthy', -10);
    expect(interp.status).toBe('Healthy');
    expect(interp.color).toBe('#10b981');
  });

  it('interprets metabolic adaptation', () => {
    const interp = getMetabolicInterpretation('adapting', -80);
    expect(interp.status).toBe('Adapting');
    expect(interp.message).toContain('80 cal');
    expect(interp.message).toContain('diet break');
  });

  it('interprets insufficient data', () => {
    const interp = getMetabolicInterpretation('insufficient-data', 0);
    expect(interp.status).toBe('Insufficient Data');
    expect(interp.message).toContain('2+ InBody scans');
  });
});
