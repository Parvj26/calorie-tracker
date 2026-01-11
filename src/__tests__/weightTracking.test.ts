import { describe, it, expect, beforeEach } from 'vitest';

// ============================================
// WEIGHT TRACKING TESTS
// ============================================

interface WeighIn {
  date: string;
  weight: number; // Always stored in kg
}

describe('Weight Tracking', () => {
  let weighIns: WeighIn[];

  beforeEach(() => {
    weighIns = [
      { date: '2024-01-01', weight: 85 },
      { date: '2024-01-08', weight: 84.5 },
      { date: '2024-01-15', weight: 84 },
      { date: '2024-01-22', weight: 83.5 },
    ];
  });

  describe('Add Weight Entry', () => {
    it('adds new weight entry', () => {
      const newEntry: WeighIn = { date: '2024-01-29', weight: 83 };
      weighIns = [...weighIns, newEntry];

      expect(weighIns.length).toBe(5);
      expect(weighIns[4].weight).toBe(83);
    });

    it('overwrites existing entry for same date', () => {
      const existingDate = '2024-01-15';
      const newWeight = 83.8;

      weighIns = weighIns.map((w) =>
        w.date === existingDate ? { ...w, weight: newWeight } : w
      );

      const entry = weighIns.find((w) => w.date === existingDate);
      expect(entry?.weight).toBe(83.8);
      expect(weighIns.length).toBe(4); // No new entry added
    });

    it('maintains chronological order', () => {
      const newEntry: WeighIn = { date: '2024-01-10', weight: 84.2 };
      weighIns = [...weighIns, newEntry].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      expect(weighIns[1].date).toBe('2024-01-08');
      expect(weighIns[2].date).toBe('2024-01-10');
      expect(weighIns[3].date).toBe('2024-01-15');
    });
  });

  describe('Delete Weight Entry', () => {
    it('removes entry by date', () => {
      weighIns = weighIns.filter((w) => w.date !== '2024-01-15');

      expect(weighIns.length).toBe(3);
      expect(weighIns.find((w) => w.date === '2024-01-15')).toBeUndefined();
    });

    it('does nothing when deleting non-existent entry', () => {
      const originalLength = weighIns.length;
      weighIns = weighIns.filter((w) => w.date !== '2024-12-31');

      expect(weighIns.length).toBe(originalLength);
    });
  });

  describe('Weight Statistics', () => {
    it('calculates total weight lost', () => {
      const firstWeight = weighIns[0].weight;
      const lastWeight = weighIns[weighIns.length - 1].weight;
      const lost = firstWeight - lastWeight;

      expect(lost).toBe(1.5);
    });

    it('calculates average weight', () => {
      const total = weighIns.reduce((sum, w) => sum + w.weight, 0);
      const average = total / weighIns.length;

      expect(average).toBe(84.25);
    });

    it('finds minimum and maximum weight', () => {
      const min = Math.min(...weighIns.map((w) => w.weight));
      const max = Math.max(...weighIns.map((w) => w.weight));

      expect(min).toBe(83.5);
      expect(max).toBe(85);
    });

    it('calculates weekly weight change', () => {
      const changes: number[] = [];
      for (let i = 1; i < weighIns.length; i++) {
        changes.push(weighIns[i].weight - weighIns[i - 1].weight);
      }

      expect(changes).toEqual([-0.5, -0.5, -0.5]);
    });
  });

  describe('Weight Unit Conversion', () => {
    const kgToLbs = (kg: number): number => Math.round(kg * 2.20462 * 10) / 10;
    const lbsToKg = (lbs: number): number => Math.round((lbs / 2.20462) * 10) / 10;

    it('converts kg to lbs correctly', () => {
      expect(kgToLbs(80)).toBe(176.4);
      expect(kgToLbs(70)).toBe(154.3);
      expect(kgToLbs(100)).toBe(220.5);
    });

    it('converts lbs to kg correctly', () => {
      expect(lbsToKg(176)).toBe(79.8);
      expect(lbsToKg(150)).toBe(68);
      expect(lbsToKg(200)).toBe(90.7);
    });

    it('round-trips correctly', () => {
      const original = 75;
      const lbs = kgToLbs(original);
      const backToKg = lbsToKg(lbs);

      expect(backToKg).toBeCloseTo(original, 0);
    });
  });

  describe('Weight Display Formatting', () => {
    const formatWeight = (kg: number, unit: 'kg' | 'lbs'): string => {
      if (unit === 'lbs') {
        const lbs = Math.round(kg * 2.20462 * 10) / 10;
        return `${lbs} lbs`;
      }
      return `${Math.round(kg * 10) / 10} kg`;
    };

    it('formats weight in kg', () => {
      expect(formatWeight(80.5, 'kg')).toBe('80.5 kg');
      expect(formatWeight(75.123, 'kg')).toBe('75.1 kg');
    });

    it('formats weight in lbs', () => {
      expect(formatWeight(80, 'lbs')).toBe('176.4 lbs');
    });
  });

  describe('Weight Trend Analysis', () => {
    type Trend = 'losing' | 'gaining' | 'maintaining';

    const analyzeTrend = (weighIns: WeighIn[]): Trend => {
      if (weighIns.length < 2) return 'maintaining';

      const recentWeighIns = weighIns.slice(-4); // Last 4 entries
      const firstWeight = recentWeighIns[0].weight;
      const lastWeight = recentWeighIns[recentWeighIns.length - 1].weight;
      const change = lastWeight - firstWeight;

      if (change < -0.5) return 'losing';
      if (change > 0.5) return 'gaining';
      return 'maintaining';
    };

    it('detects weight loss trend', () => {
      const losingData: WeighIn[] = [
        { date: '2024-01-01', weight: 85 },
        { date: '2024-01-08', weight: 84 },
        { date: '2024-01-15', weight: 83 },
        { date: '2024-01-22', weight: 82 },
      ];
      expect(analyzeTrend(losingData)).toBe('losing');
    });

    it('detects weight gain trend', () => {
      const gainingData: WeighIn[] = [
        { date: '2024-01-01', weight: 80 },
        { date: '2024-01-08', weight: 81 },
        { date: '2024-01-15', weight: 82 },
        { date: '2024-01-22', weight: 83 },
      ];
      expect(analyzeTrend(gainingData)).toBe('gaining');
    });

    it('detects maintaining trend', () => {
      const maintainingData: WeighIn[] = [
        { date: '2024-01-01', weight: 80 },
        { date: '2024-01-08', weight: 80.2 },
        { date: '2024-01-15', weight: 79.9 },
        { date: '2024-01-22', weight: 80.1 },
      ];
      expect(analyzeTrend(maintainingData)).toBe('maintaining');
    });

    it('returns maintaining for insufficient data', () => {
      expect(analyzeTrend([])).toBe('maintaining');
      expect(analyzeTrend([{ date: '2024-01-01', weight: 80 }])).toBe('maintaining');
    });
  });

  describe('Weight Change Rate', () => {
    const calculateWeeklyRate = (weighIns: WeighIn[]): number => {
      if (weighIns.length < 2) return 0;

      const sorted = [...weighIns].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      const first = sorted[0];
      const last = sorted[sorted.length - 1];

      const days =
        (new Date(last.date).getTime() - new Date(first.date).getTime()) /
        (1000 * 60 * 60 * 24);

      if (days === 0) return 0;

      const totalChange = last.weight - first.weight;
      const weeklyRate = (totalChange / days) * 7;

      return Math.round(weeklyRate * 100) / 100;
    };

    it('calculates weekly weight loss rate', () => {
      // Lost 1.5kg over 3 weeks = -0.5kg/week
      const rate = calculateWeeklyRate(weighIns);
      expect(rate).toBeCloseTo(-0.5, 1);
    });

    it('returns 0 for insufficient data', () => {
      expect(calculateWeeklyRate([])).toBe(0);
      expect(calculateWeeklyRate([{ date: '2024-01-01', weight: 80 }])).toBe(0);
    });
  });

  describe('Goal Weight Progress', () => {
    interface GoalProgress {
      startWeight: number;
      currentWeight: number;
      goalWeight: number;
      progressPercent: number;
      remaining: number;
    }

    const calculateProgress = (
      startWeight: number,
      currentWeight: number,
      goalWeight: number
    ): GoalProgress => {
      const totalToLose = startWeight - goalWeight;
      const lost = startWeight - currentWeight;
      const remaining = currentWeight - goalWeight;

      let progressPercent = 0;
      if (totalToLose > 0) {
        progressPercent = Math.min(100, Math.max(0, (lost / totalToLose) * 100));
      }

      return {
        startWeight,
        currentWeight,
        goalWeight,
        progressPercent: Math.round(progressPercent),
        remaining: Math.round(remaining * 10) / 10,
      };
    };

    it('calculates progress correctly', () => {
      const progress = calculateProgress(85, 80, 75);

      expect(progress.progressPercent).toBe(50);
      expect(progress.remaining).toBe(5);
    });

    it('handles goal reached', () => {
      const progress = calculateProgress(85, 75, 75);

      expect(progress.progressPercent).toBe(100);
      expect(progress.remaining).toBe(0);
    });

    it('handles over goal (exceeded)', () => {
      const progress = calculateProgress(85, 73, 75);

      expect(progress.progressPercent).toBe(100); // Capped at 100
      expect(progress.remaining).toBe(-2);
    });

    it('handles no progress', () => {
      const progress = calculateProgress(85, 85, 75);

      expect(progress.progressPercent).toBe(0);
      expect(progress.remaining).toBe(10);
    });
  });

  describe('Weight Entry Validation', () => {
    interface ValidationResult {
      valid: boolean;
      errors: string[];
    }

    const validateWeightEntry = (weight: number, date: string): ValidationResult => {
      const errors: string[] = [];

      if (weight <= 0) {
        errors.push('Weight must be greater than 0');
      }
      if (weight > 500) {
        errors.push('Weight seems too high');
      }
      if (weight < 20) {
        errors.push('Weight seems too low');
      }

      const entryDate = new Date(date);
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      if (entryDate > today) {
        errors.push('Cannot log weight for future dates');
      }

      if (isNaN(entryDate.getTime())) {
        errors.push('Invalid date');
      }

      return { valid: errors.length === 0, errors };
    };

    it('accepts valid weight entry', () => {
      const result = validateWeightEntry(80, '2024-01-15');
      expect(result.valid).toBe(true);
    });

    it('rejects zero weight', () => {
      const result = validateWeightEntry(0, '2024-01-15');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Weight must be greater than 0');
    });

    it('rejects negative weight', () => {
      const result = validateWeightEntry(-5, '2024-01-15');
      expect(result.valid).toBe(false);
    });

    it('warns about unrealistic weights', () => {
      const tooHigh = validateWeightEntry(600, '2024-01-15');
      expect(tooHigh.errors).toContain('Weight seems too high');

      const tooLow = validateWeightEntry(10, '2024-01-15');
      expect(tooLow.errors).toContain('Weight seems too low');
    });

    it('rejects future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const result = validateWeightEntry(80, futureDate.toISOString().split('T')[0]);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Cannot log weight for future dates');
    });
  });

  describe('Weight Chart Data', () => {
    interface ChartDataPoint {
      date: string;
      weight: number;
      label: string;
    }

    const prepareChartData = (weighIns: WeighIn[]): ChartDataPoint[] => {
      return weighIns
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((w) => ({
          date: w.date,
          weight: w.weight,
          label: new Date(w.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
        }));
    };

    it('prepares chart data in chronological order', () => {
      const data = prepareChartData(weighIns);

      expect(data[0].date).toBe('2024-01-01');
      expect(data[data.length - 1].date).toBe('2024-01-22');
    });

    it('formats labels correctly', () => {
      const data = prepareChartData([{ date: '2024-01-15', weight: 80 }]);

      // Note: The exact date format may vary based on timezone
      // The label should contain "Jan" and a number in the 14-16 range
      expect(data[0].label).toMatch(/Jan 1[4-6]/);
    });

    it('handles empty array', () => {
      const data = prepareChartData([]);
      expect(data).toEqual([]);
    });
  });

  describe('Moving Average', () => {
    const calculateMovingAverage = (weighIns: WeighIn[], window: number = 7): number[] => {
      if (weighIns.length === 0) return [];

      const sorted = [...weighIns].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      return sorted.map((_, index) => {
        const start = Math.max(0, index - window + 1);
        const windowData = sorted.slice(start, index + 1);
        const sum = windowData.reduce((acc, w) => acc + w.weight, 0);
        return Math.round((sum / windowData.length) * 10) / 10;
      });
    };

    it('calculates moving average', () => {
      const averages = calculateMovingAverage(weighIns, 3);

      // First entry: just 85
      expect(averages[0]).toBe(85);
      // Second entry: (85 + 84.5) / 2
      expect(averages[1]).toBe(84.8);
      // Third entry: (85 + 84.5 + 84) / 3
      expect(averages[2]).toBeCloseTo(84.5, 1);
    });

    it('handles empty array', () => {
      expect(calculateMovingAverage([])).toEqual([]);
    });
  });
});
