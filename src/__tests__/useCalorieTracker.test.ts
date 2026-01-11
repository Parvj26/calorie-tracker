import { describe, it, expect } from 'vitest';

// ============================================
// useCalorieTracker LOGIC TESTS
// ============================================

/**
 * These tests verify the business logic used in useCalorieTracker
 * without requiring the full React hook rendering.
 *
 * For full hook integration tests, use component tests with proper
 * React context providers.
 */

// Helper functions (matching implementation)
const getMealId = (entry: string | { mealId: string }): string => {
  return typeof entry === 'string' ? entry : entry.mealId;
};

const getMealQuantity = (entry: string | { quantity?: number }): number => {
  return typeof entry === 'string' ? 1 : (entry.quantity || 1);
};

const getMealUnit = (entry: string | { unit?: string }): string => {
  return typeof entry === 'string' ? 'serving' : (entry.unit || 'serving');
};

const getServingMultiplier = (quantity: number, unit: string, servingSize?: number): number => {
  if (unit === 'serving') return quantity;
  const size = servingSize || 100;
  if (unit === 'g') return quantity / size;
  if (unit === 'oz') return (quantity * 28.35) / size;
  if (unit === 'ml') return quantity / size;
  return quantity;
};

describe('useCalorieTracker Logic', () => {
  describe('Meal Entry Helpers', () => {
    it('getMealId extracts ID from string', () => {
      expect(getMealId('meal-123')).toBe('meal-123');
    });

    it('getMealId extracts ID from object', () => {
      expect(getMealId({ mealId: 'meal-456' })).toBe('meal-456');
    });

    it('getMealQuantity returns 1 for string entries', () => {
      expect(getMealQuantity('meal-123')).toBe(1);
    });

    it('getMealQuantity extracts quantity from object', () => {
      expect(getMealQuantity({ quantity: 2.5 })).toBe(2.5);
    });

    it('getMealQuantity defaults to 1 for missing quantity', () => {
      expect(getMealQuantity({})).toBe(1);
    });

    it('getMealUnit returns serving for string entries', () => {
      expect(getMealUnit('meal-123')).toBe('serving');
    });

    it('getMealUnit extracts unit from object', () => {
      expect(getMealUnit({ unit: 'g' })).toBe('g');
    });

    it('getMealUnit defaults to serving for missing unit', () => {
      expect(getMealUnit({})).toBe('serving');
    });
  });

  describe('Serving Multiplier', () => {
    it('returns quantity directly for serving unit', () => {
      expect(getServingMultiplier(2, 'serving', 100)).toBe(2);
    });

    it('converts grams to multiplier', () => {
      expect(getServingMultiplier(150, 'g', 100)).toBe(1.5);
    });

    it('converts oz to multiplier', () => {
      expect(getServingMultiplier(1, 'oz', 100)).toBeCloseTo(0.2835, 4);
    });

    it('converts ml to multiplier', () => {
      expect(getServingMultiplier(200, 'ml', 100)).toBe(2);
    });

    it('defaults to 100g serving size', () => {
      expect(getServingMultiplier(50, 'g')).toBe(0.5);
    });
  });

  describe('Daily Log Creation', () => {
    const createEmptyLog = (date: string) => ({
      date,
      meals: [] as (string | { mealId: string; quantity: number; unit: string })[],
      workoutCalories: 0,
    });

    it('creates empty log for date', () => {
      const log = createEmptyLog('2024-01-15');
      expect(log.date).toBe('2024-01-15');
      expect(log.meals).toHaveLength(0);
      expect(log.workoutCalories).toBe(0);
    });
  });

  describe('Calorie Calculation Logic', () => {
    interface Meal {
      id: string;
      calories: number;
      servingSize?: number;
    }

    const meals: Meal[] = [
      { id: 'm1', calories: 200, servingSize: 100 },
      { id: 'm2', calories: 300, servingSize: 150 },
    ];

    const calculateLogCalories = (
      entries: (string | { mealId: string; quantity: number; unit: string })[]
    ): number => {
      return entries.reduce((total, entry) => {
        const mealId = getMealId(entry);
        const quantity = getMealQuantity(entry);
        const unit = getMealUnit(entry);
        const meal = meals.find((m) => m.id === mealId);
        if (!meal) return total;
        const multiplier = getServingMultiplier(quantity, unit, meal.servingSize);
        return total + Math.round(meal.calories * multiplier);
      }, 0);
    };

    it('calculates calories for serving-based entry', () => {
      const entries = [{ mealId: 'm1', quantity: 2, unit: 'serving' }];
      expect(calculateLogCalories(entries)).toBe(400);
    });

    it('calculates calories for gram-based entry', () => {
      const entries = [{ mealId: 'm1', quantity: 150, unit: 'g' }];
      expect(calculateLogCalories(entries)).toBe(300);
    });

    it('calculates calories for multiple entries', () => {
      const entries = [
        { mealId: 'm1', quantity: 1, unit: 'serving' },
        { mealId: 'm2', quantity: 1, unit: 'serving' },
      ];
      expect(calculateLogCalories(entries)).toBe(500);
    });

    it('handles legacy string entries', () => {
      const entries = ['m1', 'm2'];
      expect(calculateLogCalories(entries)).toBe(500);
    });

    it('ignores non-existent meals', () => {
      const entries = [
        { mealId: 'm1', quantity: 1, unit: 'serving' },
        { mealId: 'non-existent', quantity: 1, unit: 'serving' },
      ];
      expect(calculateLogCalories(entries)).toBe(200);
    });
  });

  describe('TDEE Calculation Logic', () => {
    const calculateTDEE = (
      restingEnergy: number,
      activeEnergy: number,
      tefMultiplier: number = 1.10
    ): number => {
      return Math.round((restingEnergy + activeEnergy) * tefMultiplier);
    };

    it('calculates TDEE with default TEF', () => {
      const tdee = calculateTDEE(1600, 400);
      expect(tdee).toBe(2200);
    });

    it('calculates TDEE with custom TEF', () => {
      const tdee = calculateTDEE(1600, 400, 1.15);
      expect(tdee).toBe(2300);
    });

    it('handles zero active energy', () => {
      const tdee = calculateTDEE(1600, 0);
      expect(tdee).toBe(1760);
    });
  });

  describe('Deficit Calculation Logic', () => {
    it('calculates deficit vs target', () => {
      const target = 2000;
      const consumed = 1800;
      const deficit = target - consumed;
      expect(deficit).toBe(200);
    });

    it('calculates true deficit from TDEE', () => {
      const tdee = 2200;
      const consumed = 1800;
      const trueDeficit = tdee - consumed;
      expect(trueDeficit).toBe(400);
    });

    it('identifies surplus', () => {
      const target = 2000;
      const consumed = 2300;
      const deficit = target - consumed;
      expect(deficit).toBe(-300);
    });
  });

  describe('Goal Progress Calculation', () => {
    const calculateProgress = (
      startWeight: number,
      currentWeight: number,
      goalWeight: number
    ) => {
      const totalToLose = startWeight - goalWeight;
      const lost = startWeight - currentWeight;
      const progressPercent = totalToLose > 0 ? (lost / totalToLose) * 100 : 0;

      return {
        startWeight,
        currentWeight,
        goalWeight,
        weightLost: Math.round(lost * 10) / 10,
        weightRemaining: Math.round((currentWeight - goalWeight) * 10) / 10,
        progressPercent: Math.min(100, Math.max(0, Math.round(progressPercent))),
      };
    };

    it('calculates progress correctly', () => {
      const progress = calculateProgress(85, 80, 75);
      expect(progress.weightLost).toBe(5);
      expect(progress.weightRemaining).toBe(5);
      expect(progress.progressPercent).toBe(50);
    });

    it('handles goal reached', () => {
      const progress = calculateProgress(85, 75, 75);
      expect(progress.progressPercent).toBe(100);
    });

    it('handles over goal', () => {
      const progress = calculateProgress(85, 74, 75);
      expect(progress.progressPercent).toBe(100); // Capped at 100
    });

    it('handles no progress', () => {
      const progress = calculateProgress(85, 85, 75);
      expect(progress.progressPercent).toBe(0);
    });
  });

  describe('Days Until Expiry Calculation', () => {
    const getDaysUntilExpiry = (deletedAt: string): number => {
      const expiryDate = new Date(deletedAt);
      expiryDate.setDate(expiryDate.getDate() + 30);
      const diffDays = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return Math.max(0, diffDays);
    };

    it('returns ~30 days for just-deleted meal', () => {
      const deletedAt = new Date().toISOString();
      const days = getDaysUntilExpiry(deletedAt);
      expect(days).toBeGreaterThanOrEqual(29);
      expect(days).toBeLessThanOrEqual(30);
    });

    it('returns 0 for expired meal', () => {
      const deletedAt = new Date();
      deletedAt.setDate(deletedAt.getDate() - 31);
      const days = getDaysUntilExpiry(deletedAt.toISOString());
      expect(days).toBe(0);
    });
  });

  describe('Weekly Summary Logic', () => {
    const calculateWeeklySummary = (
      dailyCalories: number[],
      dailyDeficits: number[]
    ) => {
      const daysLogged = dailyCalories.filter((c) => c > 0).length;
      if (daysLogged === 0) return null;

      const avgCalories = dailyCalories.reduce((a, b) => a + b, 0) / daysLogged;
      const avgDeficit = dailyDeficits.reduce((a, b) => a + b, 0) / daysLogged;

      return {
        avgCalories: Math.round(avgCalories),
        avgDeficit: Math.round(avgDeficit),
        daysLogged,
      };
    };

    it('calculates weekly averages', () => {
      const calories = [1800, 2000, 1900, 1850, 0, 0, 0];
      const deficits = [200, 0, 100, 150, 0, 0, 0];

      const summary = calculateWeeklySummary(calories, deficits);
      expect(summary?.daysLogged).toBe(4);
      expect(summary?.avgCalories).toBe(1888);
    });

    it('returns null for no data', () => {
      const summary = calculateWeeklySummary([0, 0, 0], [0, 0, 0]);
      expect(summary).toBeNull();
    });
  });

  describe('Date Formatting', () => {
    it('formats date as YYYY-MM-DD', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const formatted = date.toISOString().split('T')[0];
      expect(formatted).toBe('2024-01-15');
    });

    it('gets today in correct format', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
