import { describe, it, expect } from 'vitest';

// ============================================
// HEALTH DATA IMPORT TESTS
// ============================================

interface HealthData {
  date: string;
  restingEnergy?: number;
  activeEnergy?: number;
  steps?: number;
  exerciseMinutes?: number;
  walkingDistance?: number;
  flightsClimbed?: number;
  standHours?: number;
  workouts?: Array<{ type: string; calories: number; duration: number }>;
}

describe('Health Data Import', () => {
  describe('AI Screenshot Extraction', () => {
    const parseHealthAIResponse = (response: string): HealthData | null => {
      try {
        const parsed = JSON.parse(response);

        // Need at least one valid metric
        if (!parsed.steps && !parsed.activeEnergy && !parsed.restingEnergy) {
          return null;
        }

        return {
          date: parsed.date || new Date().toISOString().split('T')[0],
          restingEnergy: parsed.restingEnergy,
          activeEnergy: parsed.activeEnergy,
          steps: parsed.steps,
          exerciseMinutes: parsed.exerciseMinutes,
          walkingDistance: parsed.walkingDistance,
          flightsClimbed: parsed.flightsClimbed,
          standHours: parsed.standHours,
          workouts: parsed.workouts,
        };
      } catch {
        return null;
      }
    };

    it('parses complete health data response', () => {
      const response = JSON.stringify({
        date: '2024-01-15',
        restingEnergy: 1620,
        activeEnergy: 450,
        steps: 8542,
        exerciseMinutes: 45,
        walkingDistance: 5.2,
        flightsClimbed: 12,
        standHours: 10,
        workouts: [
          { type: 'Running', calories: 300, duration: 30 },
          { type: 'Strength Training', calories: 150, duration: 45 },
        ],
      });

      const data = parseHealthAIResponse(response);

      expect(data).not.toBeNull();
      expect(data?.steps).toBe(8542);
      expect(data?.activeEnergy).toBe(450);
      expect(data?.workouts?.length).toBe(2);
    });

    it('parses partial response', () => {
      const response = JSON.stringify({
        steps: 6000,
        activeEnergy: 300,
      });

      const data = parseHealthAIResponse(response);

      expect(data).not.toBeNull();
      expect(data?.restingEnergy).toBeUndefined();
    });

    it('defaults date to today if not provided', () => {
      const response = JSON.stringify({
        steps: 5000,
      });

      const data = parseHealthAIResponse(response);
      const today = new Date().toISOString().split('T')[0];

      expect(data?.date).toBe(today);
    });

    it('returns null for empty response', () => {
      expect(parseHealthAIResponse('{}')).toBeNull();
    });

    it('returns null for invalid JSON', () => {
      expect(parseHealthAIResponse('not json')).toBeNull();
    });
  });

  describe('TDEE Calculation from Health Data', () => {
    const calculateTDEE = (
      restingEnergy: number,
      activeEnergy: number,
      tefMultiplier: number = 1.1
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

  describe('Manual Entry Validation', () => {
    interface ValidationResult {
      valid: boolean;
      errors: string[];
    }

    const validateHealthEntry = (data: Partial<HealthData>): ValidationResult => {
      const errors: string[] = [];

      if (data.restingEnergy !== undefined) {
        if (data.restingEnergy < 500 || data.restingEnergy > 5000) {
          errors.push('Resting energy should be between 500 and 5000 calories');
        }
      }

      if (data.activeEnergy !== undefined) {
        if (data.activeEnergy < 0 || data.activeEnergy > 5000) {
          errors.push('Active energy should be between 0 and 5000 calories');
        }
      }

      if (data.steps !== undefined) {
        if (data.steps < 0 || data.steps > 100000) {
          errors.push('Steps should be between 0 and 100,000');
        }
      }

      if (data.exerciseMinutes !== undefined) {
        if (data.exerciseMinutes < 0 || data.exerciseMinutes > 1440) {
          errors.push('Exercise minutes should be between 0 and 1440');
        }
      }

      return { valid: errors.length === 0, errors };
    };

    it('validates correct health entry', () => {
      const result = validateHealthEntry({
        restingEnergy: 1600,
        activeEnergy: 400,
        steps: 8000,
        exerciseMinutes: 45,
      });

      expect(result.valid).toBe(true);
    });

    it('rejects invalid resting energy', () => {
      const result = validateHealthEntry({
        restingEnergy: 300,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Resting energy should be between 500 and 5000 calories');
    });

    it('rejects negative steps', () => {
      const result = validateHealthEntry({
        steps: -100,
      });

      expect(result.valid).toBe(false);
    });
  });

  describe('Workout Parsing', () => {
    interface Workout {
      type: string;
      calories: number;
      duration: number;
    }

    const parseWorkouts = (workoutsData: unknown[]): Workout[] => {
      return workoutsData
        .filter(
          (w): w is { type: string; calories: number; duration: number } =>
            typeof w === 'object' &&
            w !== null &&
            typeof (w as Record<string, unknown>).type === 'string' &&
            typeof (w as Record<string, unknown>).calories === 'number'
        )
        .map((w) => ({
          type: w.type,
          calories: w.calories,
          duration: w.duration || 0,
        }));
    };

    it('parses valid workouts', () => {
      const workouts = parseWorkouts([
        { type: 'Running', calories: 300, duration: 30 },
        { type: 'Cycling', calories: 250, duration: 45 },
      ]);

      expect(workouts.length).toBe(2);
      expect(workouts[0].type).toBe('Running');
    });

    it('filters invalid workouts', () => {
      const workouts = parseWorkouts([
        { type: 'Running', calories: 300, duration: 30 },
        { type: 'Invalid' }, // Missing calories
        null,
        'not an object',
      ]);

      expect(workouts.length).toBe(1);
    });

    it('defaults missing duration to 0', () => {
      const workouts = parseWorkouts([{ type: 'Walking', calories: 100 }]);

      expect(workouts[0].duration).toBe(0);
    });
  });

  describe('Total Active Calories', () => {
    it('calculates total from workouts', () => {
      const workouts = [
        { type: 'Running', calories: 300, duration: 30 },
        { type: 'Strength', calories: 150, duration: 45 },
      ];

      const total = workouts.reduce((sum, w) => sum + w.calories, 0);
      expect(total).toBe(450);
    });
  });

  describe('Steps to Calories Estimation', () => {
    const estimateCaloriesFromSteps = (steps: number, weightKg: number = 70): number => {
      // Rough estimate: ~0.04 calories per step per kg of body weight
      const caloriesPerStep = 0.04;
      return Math.round(steps * caloriesPerStep * (weightKg / 70));
    };

    it('estimates calories for average weight', () => {
      const calories = estimateCaloriesFromSteps(10000);
      expect(calories).toBe(400);
    });

    it('adjusts for body weight', () => {
      const lightWeight = estimateCaloriesFromSteps(10000, 50);
      const heavyWeight = estimateCaloriesFromSteps(10000, 100);

      expect(heavyWeight).toBeGreaterThan(lightWeight);
    });
  });

  describe('Exercise Minutes Goals', () => {
    const WEEKLY_GOAL = 150; // WHO recommendation

    const calculateWeeklyProgress = (dailyMinutes: number[]): number => {
      const total = dailyMinutes.reduce((sum, m) => sum + m, 0);
      return Math.round((total / WEEKLY_GOAL) * 100);
    };

    it('calculates weekly exercise progress', () => {
      const dailyMinutes = [30, 45, 0, 30, 0, 60, 0]; // 165 total
      const progress = calculateWeeklyProgress(dailyMinutes);

      expect(progress).toBe(110); // 110% of goal
    });

    it('handles zero exercise', () => {
      const progress = calculateWeeklyProgress([0, 0, 0, 0, 0, 0, 0]);
      expect(progress).toBe(0);
    });
  });

  describe('Daily Log Integration', () => {
    interface DailyLog {
      date: string;
      healthMetrics?: {
        restingEnergy: number;
        activeEnergy: number;
        steps: number;
        exerciseMinutes: number;
      };
      workoutCalories: number;
    }

    it('adds health metrics to daily log', () => {
      const log: DailyLog = {
        date: '2024-01-15',
        workoutCalories: 0,
      };

      log.healthMetrics = {
        restingEnergy: 1600,
        activeEnergy: 400,
        steps: 8500,
        exerciseMinutes: 45,
      };

      expect(log.healthMetrics.restingEnergy).toBe(1600);
    });

    it('syncs active energy to workout calories', () => {
      const log: DailyLog = {
        date: '2024-01-15',
        healthMetrics: {
          restingEnergy: 1600,
          activeEnergy: 400,
          steps: 8500,
          exerciseMinutes: 45,
        },
        workoutCalories: 0,
      };

      log.workoutCalories = log.healthMetrics.activeEnergy;

      expect(log.workoutCalories).toBe(400);
    });
  });

  describe('hasTDEE Flag', () => {
    interface DailyLog {
      healthMetrics?: {
        restingEnergy: number;
        activeEnergy: number;
      };
    }

    const hasTDEE = (log: DailyLog): boolean => {
      return !!(log.healthMetrics?.restingEnergy && log.healthMetrics?.activeEnergy);
    };

    it('returns true when both energies present', () => {
      const log: DailyLog = {
        healthMetrics: {
          restingEnergy: 1600,
          activeEnergy: 400,
        },
      };

      expect(hasTDEE(log)).toBe(true);
    });

    it('returns false when missing resting energy', () => {
      const log: DailyLog = {
        healthMetrics: {
          restingEnergy: 0,
          activeEnergy: 400,
        },
      };

      expect(hasTDEE(log)).toBe(false);
    });

    it('returns false when no health metrics', () => {
      const log: DailyLog = {};

      expect(hasTDEE(log)).toBe(false);
    });
  });

  describe('Date Extraction', () => {
    const extractDateFromText = (text: string): string | null => {
      // Common date patterns from health app screenshots
      const patterns = [
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY
        /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
        /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s*(\d{4})?/i,
      ];

      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          if (pattern.source.includes('Jan|Feb')) {
            const months: Record<string, string> = {
              jan: '01', feb: '02', mar: '03', apr: '04',
              may: '05', jun: '06', jul: '07', aug: '08',
              sep: '09', oct: '10', nov: '11', dec: '12',
            };
            const month = months[match[1].toLowerCase()];
            const day = match[2].padStart(2, '0');
            const year = match[3] || new Date().getFullYear().toString();
            return `${year}-${month}-${day}`;
          }
          // Handle other patterns...
        }
      }

      return null;
    };

    it('extracts date from "Jan 15, 2024" format', () => {
      const date = extractDateFromText('Summary for Jan 15, 2024');
      expect(date).toBe('2024-01-15');
    });

    it('extracts date without year', () => {
      const date = extractDateFromText('Activity for Mar 5');
      const year = new Date().getFullYear();
      expect(date).toBe(`${year}-03-05`);
    });
  });

  describe('Unit Conversion', () => {
    const milesToKm = (miles: number): number => Math.round(miles * 1.60934 * 10) / 10;
    const kmToMiles = (km: number): number => Math.round((km / 1.60934) * 10) / 10;

    it('converts miles to kilometers', () => {
      expect(milesToKm(5)).toBe(8);
      expect(milesToKm(3.1)).toBeCloseTo(5, 0);
    });

    it('converts kilometers to miles', () => {
      expect(kmToMiles(8)).toBe(5);
      expect(kmToMiles(5)).toBeCloseTo(3.1, 0);
    });
  });

  describe('Activity Level Classification', () => {
    type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

    const classifyActivityLevel = (steps: number, exerciseMinutes: number): ActivityLevel => {
      if (steps < 5000 && exerciseMinutes < 15) return 'sedentary';
      if (steps < 7500 && exerciseMinutes < 30) return 'light';
      if (steps < 10000 && exerciseMinutes < 45) return 'moderate';
      if (steps < 12500 || exerciseMinutes < 60) return 'active';
      return 'very_active';
    };

    it('classifies activity levels correctly', () => {
      expect(classifyActivityLevel(3000, 10)).toBe('sedentary');
      expect(classifyActivityLevel(6000, 20)).toBe('light');
      expect(classifyActivityLevel(8000, 35)).toBe('moderate');
      expect(classifyActivityLevel(11000, 50)).toBe('active');
      expect(classifyActivityLevel(15000, 90)).toBe('very_active');
    });
  });
});
