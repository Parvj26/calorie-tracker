import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================
// MEAL MANAGEMENT TESTS
// ============================================

/**
 * These tests verify the meal management business logic
 * without requiring the full React component tree.
 */

describe('Meal Management Logic', () => {
  describe('Meal Validation', () => {
    const validateMeal = (meal: {
      name?: string;
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!meal.name || meal.name.trim().length === 0) {
        errors.push('Name is required');
      }

      if (meal.calories === undefined || meal.calories < 0) {
        errors.push('Calories must be 0 or greater');
      }

      if (meal.protein !== undefined && meal.protein < 0) {
        errors.push('Protein must be 0 or greater');
      }

      if (meal.carbs !== undefined && meal.carbs < 0) {
        errors.push('Carbs must be 0 or greater');
      }

      if (meal.fat !== undefined && meal.fat < 0) {
        errors.push('Fat must be 0 or greater');
      }

      return { valid: errors.length === 0, errors };
    };

    it('validates meal with all required fields', () => {
      const result = validateMeal({
        name: 'Chicken Breast',
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects meal without name', () => {
      const result = validateMeal({
        name: '',
        calories: 100,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Name is required');
    });

    it('rejects meal with negative calories', () => {
      const result = validateMeal({
        name: 'Test',
        calories: -50,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Calories must be 0 or greater');
    });

    it('accepts meal with zero calories', () => {
      const result = validateMeal({
        name: 'Water',
        calories: 0,
      });
      expect(result.valid).toBe(true);
    });

    it('rejects meal with negative macros', () => {
      const result = validateMeal({
        name: 'Test',
        calories: 100,
        protein: -5,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Protein must be 0 or greater');
    });
  });

  describe('Meal Soft Delete', () => {
    interface Meal {
      id: string;
      name: string;
      deletedAt?: string;
    }

    let activeMeals: Meal[] = [];
    let deletedMeals: Meal[] = [];

    beforeEach(() => {
      activeMeals = [
        { id: '1', name: 'Meal 1' },
        { id: '2', name: 'Meal 2' },
        { id: '3', name: 'Meal 3' },
      ];
      deletedMeals = [];
    });

    const softDelete = (mealId: string) => {
      const mealIndex = activeMeals.findIndex((m) => m.id === mealId);
      if (mealIndex === -1) return;

      const meal = activeMeals[mealIndex];
      activeMeals = activeMeals.filter((m) => m.id !== mealId);
      deletedMeals = [...deletedMeals, { ...meal, deletedAt: new Date().toISOString() }];
    };

    it('moves meal from active to deleted', () => {
      softDelete('1');

      expect(activeMeals.length).toBe(2);
      expect(deletedMeals.length).toBe(1);
      expect(deletedMeals[0].id).toBe('1');
    });

    it('sets deletedAt timestamp', () => {
      const beforeDelete = Date.now();
      softDelete('1');
      const afterDelete = Date.now();

      expect(deletedMeals[0].deletedAt).toBeDefined();
      const deletedAt = new Date(deletedMeals[0].deletedAt!).getTime();
      expect(deletedAt).toBeGreaterThanOrEqual(beforeDelete);
      expect(deletedAt).toBeLessThanOrEqual(afterDelete);
    });

    it('does nothing for non-existent meal', () => {
      softDelete('non-existent');

      expect(activeMeals.length).toBe(3);
      expect(deletedMeals.length).toBe(0);
    });
  });

  describe('Meal Restore', () => {
    interface Meal {
      id: string;
      name: string;
      deletedAt?: string;
    }

    let activeMeals: Meal[] = [];
    let deletedMeals: Meal[] = [];

    beforeEach(() => {
      activeMeals = [{ id: '1', name: 'Meal 1' }];
      deletedMeals = [{ id: '2', name: 'Meal 2', deletedAt: new Date().toISOString() }];
    });

    const restore = (mealId: string) => {
      const mealIndex = deletedMeals.findIndex((m) => m.id === mealId);
      if (mealIndex === -1) return;

      const meal = deletedMeals[mealIndex];
      deletedMeals = deletedMeals.filter((m) => m.id !== mealId);
      activeMeals = [...activeMeals, { ...meal, deletedAt: undefined }];
    };

    it('moves meal from deleted to active', () => {
      restore('2');

      expect(activeMeals.length).toBe(2);
      expect(deletedMeals.length).toBe(0);
    });

    it('removes deletedAt timestamp', () => {
      restore('2');

      const restoredMeal = activeMeals.find((m) => m.id === '2');
      expect(restoredMeal?.deletedAt).toBeUndefined();
    });
  });

  describe('Meal Expiry Calculation', () => {
    const EXPIRY_DAYS = 30;

    const getDaysUntilExpiry = (deletedAt: string): number => {
      const expiryDate = new Date(deletedAt);
      expiryDate.setDate(expiryDate.getDate() + EXPIRY_DAYS);
      const diffMs = expiryDate.getTime() - Date.now();
      return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
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

    it('returns 15 for meal deleted 15 days ago', () => {
      const deletedAt = new Date();
      deletedAt.setDate(deletedAt.getDate() - 15);
      const days = getDaysUntilExpiry(deletedAt.toISOString());
      expect(days).toBeGreaterThanOrEqual(14);
      expect(days).toBeLessThanOrEqual(16);
    });
  });

  describe('Auto-Purge Logic', () => {
    interface Meal {
      id: string;
      deletedAt?: string;
    }

    const purgeExpiredMeals = (meals: Meal[], expiryDays: number = 30): Meal[] => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - expiryDays);

      return meals.filter((meal) => {
        if (!meal.deletedAt) return true;
        return new Date(meal.deletedAt) > cutoffDate;
      });
    };

    it('keeps meals deleted less than 30 days ago', () => {
      const meals: Meal[] = [
        { id: '1', deletedAt: new Date().toISOString() },
        { id: '2', deletedAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString() },
      ];

      const remaining = purgeExpiredMeals(meals);
      expect(remaining.length).toBe(2);
    });

    it('removes meals deleted more than 30 days ago', () => {
      const meals: Meal[] = [
        { id: '1', deletedAt: new Date().toISOString() },
        { id: '2', deletedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString() },
      ];

      const remaining = purgeExpiredMeals(meals);
      expect(remaining.length).toBe(1);
      expect(remaining[0].id).toBe('1');
    });

    it('keeps meals without deletedAt (active meals)', () => {
      const meals: Meal[] = [
        { id: '1' },
        { id: '2', deletedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString() },
      ];

      const remaining = purgeExpiredMeals(meals);
      expect(remaining.length).toBe(1);
      expect(remaining[0].id).toBe('1');
    });
  });

  describe('Favorite Meals', () => {
    interface Meal {
      id: string;
      name: string;
      favorite?: boolean;
    }

    const sortByFavorite = (meals: Meal[]): Meal[] => {
      return [...meals].sort((a, b) => {
        if (a.favorite && !b.favorite) return -1;
        if (!a.favorite && b.favorite) return 1;
        return a.name.localeCompare(b.name);
      });
    };

    it('sorts favorites to the top', () => {
      const meals: Meal[] = [
        { id: '1', name: 'Apple' },
        { id: '2', name: 'Banana', favorite: true },
        { id: '3', name: 'Cherry' },
      ];

      const sorted = sortByFavorite(meals);
      expect(sorted[0].id).toBe('2');
    });

    it('maintains alphabetical order within groups', () => {
      const meals: Meal[] = [
        { id: '1', name: 'Zebra', favorite: true },
        { id: '2', name: 'Apple', favorite: true },
        { id: '3', name: 'Mango' },
      ];

      const sorted = sortByFavorite(meals);
      expect(sorted[0].name).toBe('Apple');
      expect(sorted[1].name).toBe('Zebra');
      expect(sorted[2].name).toBe('Mango');
    });
  });
});

describe('Meal Search and Filter', () => {
  interface Meal {
    id: string;
    name: string;
    calories: number;
    favorite?: boolean;
  }

  const testMeals: Meal[] = [
    { id: '1', name: 'Chicken Breast', calories: 165, favorite: true },
    { id: '2', name: 'Brown Rice', calories: 216 },
    { id: '3', name: 'Grilled Chicken', calories: 180 },
    { id: '4', name: 'Chicken Salad', calories: 250, favorite: true },
    { id: '5', name: 'Apple', calories: 95 },
  ];

  const searchMeals = (meals: Meal[], query: string): Meal[] => {
    if (!query.trim()) return meals;
    const lowerQuery = query.toLowerCase();
    return meals.filter((m) => m.name.toLowerCase().includes(lowerQuery));
  };

  it('returns all meals for empty query', () => {
    expect(searchMeals(testMeals, '')).toHaveLength(5);
    expect(searchMeals(testMeals, '   ')).toHaveLength(5);
  });

  it('filters by partial name match', () => {
    const results = searchMeals(testMeals, 'chicken');
    expect(results).toHaveLength(3);
    expect(results.every((m) => m.name.toLowerCase().includes('chicken'))).toBe(true);
  });

  it('is case insensitive', () => {
    expect(searchMeals(testMeals, 'CHICKEN')).toHaveLength(3);
    expect(searchMeals(testMeals, 'ChIcKeN')).toHaveLength(3);
  });

  it('returns empty array for no matches', () => {
    expect(searchMeals(testMeals, 'pizza')).toHaveLength(0);
  });
});

describe('Meal Macros Calculation', () => {
  it('calculates total macros correctly', () => {
    const meals = [
      { calories: 200, protein: 20, carbs: 25, fat: 5 },
      { calories: 300, protein: 15, carbs: 40, fat: 10 },
    ];

    const totals = meals.reduce(
      (acc, meal) => ({
        calories: acc.calories + meal.calories,
        protein: acc.protein + meal.protein,
        carbs: acc.carbs + meal.carbs,
        fat: acc.fat + meal.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    expect(totals.calories).toBe(500);
    expect(totals.protein).toBe(35);
    expect(totals.carbs).toBe(65);
    expect(totals.fat).toBe(15);
  });

  it('handles empty meal array', () => {
    const meals: { calories: number; protein: number }[] = [];

    const totals = meals.reduce(
      (acc, meal) => ({
        calories: acc.calories + meal.calories,
        protein: acc.protein + meal.protein,
      }),
      { calories: 0, protein: 0 }
    );

    expect(totals.calories).toBe(0);
    expect(totals.protein).toBe(0);
  });
});
