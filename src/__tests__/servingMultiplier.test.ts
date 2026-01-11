import { describe, it, expect } from 'vitest';

// ============================================
// SERVING MULTIPLIER TESTS
// ============================================

/**
 * Recreating the getServingMultiplier function for testing
 * This matches the implementation in bodyIntelligence.ts and MealLogger.tsx
 */
const getServingMultiplier = (quantity: number, unit: string, servingSize?: number): number => {
  if (unit === 'serving') return quantity;

  const size = servingSize || 100;

  if (unit === 'g') return quantity / size;
  if (unit === 'oz') return (quantity * 28.35) / size;
  if (unit === 'ml') return quantity / size;

  return quantity;
};

describe('Serving Multiplier Calculations', () => {
  describe('Serving unit', () => {
    it('returns quantity directly for serving unit', () => {
      expect(getServingMultiplier(1, 'serving', 100)).toBe(1);
      expect(getServingMultiplier(2, 'serving', 100)).toBe(2);
      expect(getServingMultiplier(0.5, 'serving', 100)).toBe(0.5);
    });

    it('ignores serving size for serving unit', () => {
      expect(getServingMultiplier(1, 'serving', 50)).toBe(1);
      expect(getServingMultiplier(1, 'serving', 200)).toBe(1);
    });
  });

  describe('Grams unit', () => {
    it('converts grams to serving multiplier', () => {
      // 100g serving size, 100g quantity = 1 serving
      expect(getServingMultiplier(100, 'g', 100)).toBe(1);
      // 100g serving size, 150g quantity = 1.5 servings
      expect(getServingMultiplier(150, 'g', 100)).toBe(1.5);
      // 100g serving size, 50g quantity = 0.5 servings
      expect(getServingMultiplier(50, 'g', 100)).toBe(0.5);
    });

    it('handles different serving sizes', () => {
      // 50g serving size, 100g = 2 servings
      expect(getServingMultiplier(100, 'g', 50)).toBe(2);
      // 200g serving size, 100g = 0.5 servings
      expect(getServingMultiplier(100, 'g', 200)).toBe(0.5);
    });

    it('defaults to 100g serving size when not specified', () => {
      expect(getServingMultiplier(100, 'g')).toBe(1);
      expect(getServingMultiplier(50, 'g')).toBe(0.5);
    });
  });

  describe('Ounces unit', () => {
    it('converts oz to grams then to serving multiplier', () => {
      // 1 oz = 28.35g, 100g serving size = 0.2835 servings
      expect(getServingMultiplier(1, 'oz', 100)).toBeCloseTo(0.2835, 4);
      // 2 oz = 56.7g, 100g serving size = 0.567 servings
      expect(getServingMultiplier(2, 'oz', 100)).toBeCloseTo(0.567, 3);
    });

    it('handles different serving sizes', () => {
      // 1 oz = 28.35g, 28.35g serving size = 1 serving
      expect(getServingMultiplier(1, 'oz', 28.35)).toBeCloseTo(1, 4);
    });
  });

  describe('Milliliters unit', () => {
    it('treats ml same as grams (1ml = 1g assumption)', () => {
      expect(getServingMultiplier(100, 'ml', 100)).toBe(1);
      expect(getServingMultiplier(150, 'ml', 100)).toBe(1.5);
      expect(getServingMultiplier(50, 'ml', 100)).toBe(0.5);
    });
  });

  describe('Unknown unit', () => {
    it('returns quantity directly for unknown unit', () => {
      expect(getServingMultiplier(2, 'unknown', 100)).toBe(2);
      expect(getServingMultiplier(1, 'cup', 100)).toBe(1);
    });
  });
});

// ============================================
// CALORIE CALCULATION FROM MEALS
// ============================================

describe('Calorie Calculations from Meals', () => {
  const testMeals = [
    { id: 'm1', calories: 500, servingSize: 100 },
    { id: 'm2', calories: 200, servingSize: 50 },
    { id: 'm3', calories: 300 }, // No serving size (should default to 100)
  ];

  const getMealCalories = (
    mealId: string,
    quantity: number,
    unit: string
  ): number => {
    const meal = testMeals.find(m => m.id === mealId);
    if (!meal) return 0;
    const multiplier = getServingMultiplier(quantity, unit, meal.servingSize);
    return Math.round(meal.calories * multiplier);
  };

  describe('Serving-based calculations', () => {
    it('calculates calories for 1 serving', () => {
      expect(getMealCalories('m1', 1, 'serving')).toBe(500);
    });

    it('calculates calories for multiple servings', () => {
      expect(getMealCalories('m1', 2, 'serving')).toBe(1000);
    });

    it('calculates calories for half serving', () => {
      expect(getMealCalories('m1', 0.5, 'serving')).toBe(250);
    });
  });

  describe('Gram-based calculations', () => {
    it('calculates calories for exact serving size in grams', () => {
      // m1: 500 cal per 100g, logging 100g = 500 cal
      expect(getMealCalories('m1', 100, 'g')).toBe(500);
    });

    it('calculates calories for more than serving size', () => {
      // m1: 500 cal per 100g, logging 150g = 750 cal
      expect(getMealCalories('m1', 150, 'g')).toBe(750);
    });

    it('calculates calories for less than serving size', () => {
      // m1: 500 cal per 100g, logging 50g = 250 cal
      expect(getMealCalories('m1', 50, 'g')).toBe(250);
    });

    it('handles different serving sizes', () => {
      // m2: 200 cal per 50g, logging 100g = 400 cal
      expect(getMealCalories('m2', 100, 'g')).toBe(400);
      // m2: 200 cal per 50g, logging 25g = 100 cal
      expect(getMealCalories('m2', 25, 'g')).toBe(100);
    });

    it('uses 100g default when no serving size specified', () => {
      // m3: 300 cal, default 100g serving, logging 200g = 600 cal
      expect(getMealCalories('m3', 200, 'g')).toBe(600);
    });
  });

  describe('Edge cases', () => {
    it('returns 0 for non-existent meal', () => {
      expect(getMealCalories('invalid', 1, 'serving')).toBe(0);
    });

    it('rounds to nearest calorie', () => {
      // 500 cal per 100g, logging 33g = 165 cal (not 165.0)
      expect(getMealCalories('m1', 33, 'g')).toBe(165);
    });

    it('handles decimal quantities', () => {
      expect(getMealCalories('m1', 1.5, 'serving')).toBe(750);
      expect(getMealCalories('m1', 75.5, 'g')).toBe(378);
    });
  });
});

// ============================================
// MACRO CALCULATIONS
// ============================================

describe('Macro Calculations', () => {
  interface Meal {
    id: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    servingSize?: number;
  }

  const testMeal: Meal = {
    id: 'm1',
    calories: 400,
    protein: 30,
    carbs: 40,
    fat: 15,
    fiber: 5,
    sugar: 10,
    servingSize: 100,
  };

  const getMealMacros = (
    meal: Meal,
    quantity: number,
    unit: string
  ) => {
    const multiplier = getServingMultiplier(quantity, unit, meal.servingSize);
    return {
      calories: Math.round(meal.calories * multiplier),
      protein: Math.round(meal.protein * multiplier),
      carbs: Math.round(meal.carbs * multiplier),
      fat: Math.round(meal.fat * multiplier),
      fiber: Math.round(meal.fiber * multiplier),
      sugar: Math.round(meal.sugar * multiplier),
    };
  };

  it('scales all macros for serving-based', () => {
    const macros = getMealMacros(testMeal, 2, 'serving');
    expect(macros.calories).toBe(800);
    expect(macros.protein).toBe(60);
    expect(macros.carbs).toBe(80);
    expect(macros.fat).toBe(30);
    expect(macros.fiber).toBe(10);
    expect(macros.sugar).toBe(20);
  });

  it('scales all macros for gram-based', () => {
    const macros = getMealMacros(testMeal, 150, 'g');
    expect(macros.calories).toBe(600);
    expect(macros.protein).toBe(45);
    expect(macros.carbs).toBe(60);
    expect(macros.fat).toBe(23);
    expect(macros.fiber).toBe(8);
    expect(macros.sugar).toBe(15);
  });

  it('scales all macros for half serving', () => {
    const macros = getMealMacros(testMeal, 0.5, 'serving');
    expect(macros.calories).toBe(200);
    expect(macros.protein).toBe(15);
    expect(macros.carbs).toBe(20);
    expect(macros.fat).toBe(8);
    expect(macros.fiber).toBe(3);
    expect(macros.sugar).toBe(5);
  });
});

// ============================================
// DAILY TOTALS CALCULATIONS
// ============================================

describe('Daily Totals Calculations', () => {
  interface MealEntry {
    mealId: string;
    quantity: number;
    unit: string;
  }

  interface Meal {
    id: string;
    calories: number;
    protein: number;
    servingSize?: number;
  }

  const meals: Meal[] = [
    { id: 'breakfast', calories: 400, protein: 25, servingSize: 100 },
    { id: 'lunch', calories: 600, protein: 40, servingSize: 150 },
    { id: 'snack', calories: 150, protein: 5, servingSize: 30 },
    { id: 'dinner', calories: 700, protein: 50, servingSize: 200 },
  ];

  const calculateDailyTotals = (entries: MealEntry[]) => {
    return entries.reduce(
      (totals, entry) => {
        const meal = meals.find(m => m.id === entry.mealId);
        if (!meal) return totals;
        const multiplier = getServingMultiplier(entry.quantity, entry.unit, meal.servingSize);
        return {
          calories: totals.calories + Math.round(meal.calories * multiplier),
          protein: totals.protein + Math.round(meal.protein * multiplier),
        };
      },
      { calories: 0, protein: 0 }
    );
  };

  it('calculates totals for serving-based entries', () => {
    const entries: MealEntry[] = [
      { mealId: 'breakfast', quantity: 1, unit: 'serving' },
      { mealId: 'lunch', quantity: 1, unit: 'serving' },
      { mealId: 'snack', quantity: 2, unit: 'serving' },
      { mealId: 'dinner', quantity: 1, unit: 'serving' },
    ];

    const totals = calculateDailyTotals(entries);
    expect(totals.calories).toBe(2000); // 400 + 600 + 300 + 700
    expect(totals.protein).toBe(125); // 25 + 40 + 10 + 50
  });

  it('calculates totals for gram-based entries', () => {
    const entries: MealEntry[] = [
      { mealId: 'breakfast', quantity: 50, unit: 'g' }, // 0.5 serving = 200 cal
      { mealId: 'lunch', quantity: 300, unit: 'g' }, // 2 servings = 1200 cal
    ];

    const totals = calculateDailyTotals(entries);
    expect(totals.calories).toBe(1400);
    expect(totals.protein).toBe(93); // 12.5 + 80 = 92.5 ≈ 93
  });

  it('calculates totals for mixed entries', () => {
    const entries: MealEntry[] = [
      { mealId: 'breakfast', quantity: 1, unit: 'serving' },
      { mealId: 'snack', quantity: 60, unit: 'g' }, // 2 servings = 300 cal
    ];

    const totals = calculateDailyTotals(entries);
    expect(totals.calories).toBe(700); // 400 + 300
    expect(totals.protein).toBe(35); // 25 + 10
  });

  it('handles empty log', () => {
    const totals = calculateDailyTotals([]);
    expect(totals.calories).toBe(0);
    expect(totals.protein).toBe(0);
  });

  it('handles non-existent meals gracefully', () => {
    const entries: MealEntry[] = [
      { mealId: 'breakfast', quantity: 1, unit: 'serving' },
      { mealId: 'nonexistent', quantity: 1, unit: 'serving' },
    ];

    const totals = calculateDailyTotals(entries);
    expect(totals.calories).toBe(400);
    expect(totals.protein).toBe(25);
  });
});
