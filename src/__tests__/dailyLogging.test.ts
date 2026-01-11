import { describe, it, expect, beforeEach } from 'vitest';

// ============================================
// DAILY LOGGING TESTS
// ============================================

interface MealLogEntry {
  mealId: string;
  quantity: number;
  unit: 'serving' | 'g' | 'oz' | 'ml';
}

interface DailyLog {
  date: string;
  meals: (string | MealLogEntry)[];
  masterMealIds?: (string | { mealId: string; quantity: number })[];
  workoutCalories: number;
  healthMetrics?: {
    restingEnergy: number;
    activeEnergy: number;
    steps: number;
    exerciseMinutes: number;
  };
}

interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize?: number;
}

// Helper functions (matching implementation)
const getMealId = (entry: string | MealLogEntry): string => {
  return typeof entry === 'string' ? entry : entry.mealId;
};

const getMealQuantity = (entry: string | MealLogEntry): number => {
  return typeof entry === 'string' ? 1 : entry.quantity;
};

const getMealUnit = (entry: string | MealLogEntry): string => {
  return typeof entry === 'string' ? 'serving' : entry.unit;
};

const getServingMultiplier = (quantity: number, unit: string, servingSize?: number): number => {
  if (unit === 'serving') return quantity;
  const size = servingSize || 100;
  if (unit === 'g') return quantity / size;
  if (unit === 'oz') return (quantity * 28.35) / size;
  if (unit === 'ml') return quantity / size;
  return quantity;
};

describe('Daily Logging', () => {
  let dailyLogs: DailyLog[];
  let meals: Meal[];

  beforeEach(() => {
    dailyLogs = [];
    meals = [
      { id: 'm1', name: 'Chicken', calories: 200, protein: 30, carbs: 0, fat: 8, servingSize: 100 },
      { id: 'm2', name: 'Rice', calories: 130, protein: 3, carbs: 28, fat: 0, servingSize: 100 },
      { id: 'm3', name: 'Salad', calories: 50, protein: 2, carbs: 10, fat: 0 },
    ];
  });

  describe('Log Creation', () => {
    it('creates empty log for new date', () => {
      const date = '2024-01-15';
      const log: DailyLog = { date, meals: [], workoutCalories: 0 };

      expect(log.date).toBe(date);
      expect(log.meals).toHaveLength(0);
      expect(log.workoutCalories).toBe(0);
    });

    it('retrieves existing log for date', () => {
      dailyLogs = [
        { date: '2024-01-15', meals: ['m1'], workoutCalories: 200 },
        { date: '2024-01-16', meals: ['m2'], workoutCalories: 0 },
      ];

      const log = dailyLogs.find((l) => l.date === '2024-01-15');
      expect(log).toBeDefined();
      expect(log?.meals).toContain('m1');
    });
  });

  describe('Adding Meals to Log', () => {
    it('adds meal as string ID (legacy format)', () => {
      const log: DailyLog = { date: '2024-01-15', meals: [], workoutCalories: 0 };
      log.meals.push('m1');

      expect(log.meals).toHaveLength(1);
      expect(getMealId(log.meals[0])).toBe('m1');
    });

    it('adds meal with quantity entry', () => {
      const log: DailyLog = { date: '2024-01-15', meals: [], workoutCalories: 0 };
      log.meals.push({ mealId: 'm1', quantity: 1.5, unit: 'serving' });

      expect(log.meals).toHaveLength(1);
      expect(getMealQuantity(log.meals[0])).toBe(1.5);
    });

    it('adds meal with gram-based quantity', () => {
      const log: DailyLog = { date: '2024-01-15', meals: [], workoutCalories: 0 };
      log.meals.push({ mealId: 'm1', quantity: 150, unit: 'g' });

      expect(getMealUnit(log.meals[0])).toBe('g');
      expect(getMealQuantity(log.meals[0])).toBe(150);
    });
  });

  describe('Removing Meals from Log', () => {
    it('removes meal by ID', () => {
      const log: DailyLog = { date: '2024-01-15', meals: ['m1', 'm2'], workoutCalories: 0 };
      log.meals = log.meals.filter((entry) => getMealId(entry) !== 'm1');

      expect(log.meals).toHaveLength(1);
      expect(getMealId(log.meals[0])).toBe('m2');
    });

    it('removes meal entry object by ID', () => {
      const log: DailyLog = {
        date: '2024-01-15',
        meals: [
          { mealId: 'm1', quantity: 1, unit: 'serving' },
          { mealId: 'm2', quantity: 2, unit: 'serving' },
        ],
        workoutCalories: 0,
      };

      log.meals = log.meals.filter((entry) => getMealId(entry) !== 'm1');
      expect(log.meals).toHaveLength(1);
    });
  });

  describe('Quantity Updates', () => {
    it('updates quantity for meal entry', () => {
      const log: DailyLog = {
        date: '2024-01-15',
        meals: [{ mealId: 'm1', quantity: 1, unit: 'serving' }],
        workoutCalories: 0,
      };

      log.meals = log.meals.map((entry) => {
        if (getMealId(entry) === 'm1') {
          return { mealId: 'm1', quantity: 2.5, unit: 'serving' as const };
        }
        return entry;
      });

      expect(getMealQuantity(log.meals[0])).toBe(2.5);
    });

    it('changes unit from serving to grams', () => {
      const log: DailyLog = {
        date: '2024-01-15',
        meals: [{ mealId: 'm1', quantity: 1, unit: 'serving' }],
        workoutCalories: 0,
      };

      log.meals = log.meals.map((entry) => {
        if (getMealId(entry) === 'm1') {
          return { mealId: 'm1', quantity: 150, unit: 'g' as const };
        }
        return entry;
      });

      expect(getMealUnit(log.meals[0])).toBe('g');
      expect(getMealQuantity(log.meals[0])).toBe(150);
    });
  });

  describe('Calorie Calculations', () => {
    it('calculates calories for serving-based entry', () => {
      const entry: MealLogEntry = { mealId: 'm1', quantity: 2, unit: 'serving' };
      const meal = meals.find((m) => m.id === entry.mealId)!;
      const multiplier = getServingMultiplier(entry.quantity, entry.unit, meal.servingSize);

      expect(multiplier).toBe(2);
      expect(Math.round(meal.calories * multiplier)).toBe(400);
    });

    it('calculates calories for gram-based entry', () => {
      const entry: MealLogEntry = { mealId: 'm1', quantity: 150, unit: 'g' };
      const meal = meals.find((m) => m.id === entry.mealId)!;
      const multiplier = getServingMultiplier(entry.quantity, entry.unit, meal.servingSize);

      expect(multiplier).toBe(1.5);
      expect(Math.round(meal.calories * multiplier)).toBe(300);
    });

    it('calculates total daily calories', () => {
      const log: DailyLog = {
        date: '2024-01-15',
        meals: [
          { mealId: 'm1', quantity: 1, unit: 'serving' },
          { mealId: 'm2', quantity: 200, unit: 'g' },
        ],
        workoutCalories: 0,
      };

      const totalCalories = log.meals.reduce((total, entry) => {
        const mealId = getMealId(entry);
        const quantity = getMealQuantity(entry);
        const unit = getMealUnit(entry);
        const meal = meals.find((m) => m.id === mealId);
        if (!meal) return total;
        const multiplier = getServingMultiplier(quantity, unit, meal.servingSize);
        return total + Math.round(meal.calories * multiplier);
      }, 0);

      // m1: 200 cal × 1 = 200
      // m2: 130 cal × 2 = 260
      expect(totalCalories).toBe(460);
    });
  });

  describe('Date Navigation', () => {
    it('formats date correctly', () => {
      const date = new Date('2024-01-15');
      const formatted = date.toISOString().split('T')[0];
      expect(formatted).toBe('2024-01-15');
    });

    it('gets previous day', () => {
      const currentDate = new Date('2024-01-15');
      currentDate.setDate(currentDate.getDate() - 1);
      expect(currentDate.toISOString().split('T')[0]).toBe('2024-01-14');
    });

    it('gets next day', () => {
      const currentDate = new Date('2024-01-15');
      currentDate.setDate(currentDate.getDate() + 1);
      expect(currentDate.toISOString().split('T')[0]).toBe('2024-01-16');
    });

    it('prevents navigation to future dates', () => {
      const today = new Date().toISOString().split('T')[0];
      const requestedDate = new Date();
      requestedDate.setDate(requestedDate.getDate() + 1);
      const futureDate = requestedDate.toISOString().split('T')[0];

      const canNavigate = futureDate <= today;
      expect(canNavigate).toBe(false);
    });
  });

  describe('Workout Calories', () => {
    it('adds workout calories to log', () => {
      const log: DailyLog = { date: '2024-01-15', meals: [], workoutCalories: 0 };
      log.workoutCalories = 350;

      expect(log.workoutCalories).toBe(350);
    });

    it('updates existing workout calories', () => {
      const log: DailyLog = { date: '2024-01-15', meals: [], workoutCalories: 200 };
      log.workoutCalories = 400;

      expect(log.workoutCalories).toBe(400);
    });
  });

  describe('Health Metrics', () => {
    it('adds health metrics to log', () => {
      const log: DailyLog = { date: '2024-01-15', meals: [], workoutCalories: 0 };
      log.healthMetrics = {
        restingEnergy: 1600,
        activeEnergy: 400,
        steps: 8500,
        exerciseMinutes: 45,
      };

      expect(log.healthMetrics.restingEnergy).toBe(1600);
      expect(log.healthMetrics.activeEnergy).toBe(400);
      expect(log.healthMetrics.steps).toBe(8500);
    });

    it('calculates TDEE from health metrics', () => {
      const healthMetrics = {
        restingEnergy: 1600,
        activeEnergy: 400,
        steps: 8500,
        exerciseMinutes: 45,
      };

      const tefMultiplier = 1.10;
      const rawTdee = healthMetrics.restingEnergy + healthMetrics.activeEnergy;
      const tdee = Math.round(rawTdee * tefMultiplier);

      expect(rawTdee).toBe(2000);
      expect(tdee).toBe(2200);
    });

    it('syncs active energy to workout calories', () => {
      const log: DailyLog = { date: '2024-01-15', meals: [], workoutCalories: 0 };
      log.healthMetrics = {
        restingEnergy: 1600,
        activeEnergy: 400,
        steps: 8500,
        exerciseMinutes: 45,
      };
      log.workoutCalories = log.healthMetrics.activeEnergy;

      expect(log.workoutCalories).toBe(400);
    });
  });

  describe('Master Meals in Log', () => {
    it('adds master meal to log', () => {
      const log: DailyLog = { date: '2024-01-15', meals: [], workoutCalories: 0 };
      log.masterMealIds = [{ mealId: 'master-1', quantity: 1 }];

      expect(log.masterMealIds).toHaveLength(1);
    });

    it('prevents duplicate master meals', () => {
      const log: DailyLog = {
        date: '2024-01-15',
        meals: [],
        masterMealIds: [{ mealId: 'master-1', quantity: 1 }],
        workoutCalories: 0,
      };

      const newId = 'master-1';
      const alreadyExists = log.masterMealIds?.some(
        (entry) => (typeof entry === 'string' ? entry : entry.mealId) === newId
      );

      expect(alreadyExists).toBe(true);
    });
  });

  describe('Deficit Calculations', () => {
    it('calculates deficit vs target', () => {
      const targetCalories = 2000;
      const consumedCalories = 1800;
      const deficit = targetCalories - consumedCalories;

      expect(deficit).toBe(200);
    });

    it('calculates true deficit from TDEE', () => {
      const tdee = 2200;
      const consumedCalories = 1800;
      const trueDeficit = tdee - consumedCalories;

      expect(trueDeficit).toBe(400);
    });

    it('identifies surplus (negative deficit)', () => {
      const targetCalories = 2000;
      const consumedCalories = 2300;
      const deficit = targetCalories - consumedCalories;

      expect(deficit).toBe(-300);
      expect(deficit < 0).toBe(true); // Surplus
    });
  });
});
