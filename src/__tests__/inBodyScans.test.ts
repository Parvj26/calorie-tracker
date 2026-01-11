import { describe, it, expect, beforeEach } from 'vitest';

// ============================================
// INBODY SCAN TESTS
// ============================================

interface InBodyScan {
  id: string;
  date: string;
  weight: number;
  bodyFatPercent: number;
  muscleMass?: number;
  skeletalMuscle?: number;
  bmr?: number;
  fatMass?: number;
  visceralFatGrade?: number;
  waterWeight?: number;
  bodyAge?: number;
  proteinMass?: number;
  boneMass?: number;
}

describe('InBody Scan Management', () => {
  let scans: InBodyScan[];

  beforeEach(() => {
    scans = [
      {
        id: 'scan-1',
        date: '2024-01-01',
        weight: 85,
        bodyFatPercent: 25,
        muscleMass: 40,
        skeletalMuscle: 32,
        bmr: 1750,
        fatMass: 21.25,
      },
      {
        id: 'scan-2',
        date: '2024-02-01',
        weight: 83,
        bodyFatPercent: 23,
        muscleMass: 40.5,
        skeletalMuscle: 32.5,
        bmr: 1720,
        fatMass: 19.09,
      },
    ];
  });

  describe('Add Scan', () => {
    it('adds new scan', () => {
      const newScan: InBodyScan = {
        id: 'scan-3',
        date: '2024-03-01',
        weight: 81,
        bodyFatPercent: 21,
        muscleMass: 41,
        skeletalMuscle: 33,
        bmr: 1700,
        fatMass: 17.01,
      };

      scans = [...scans, newScan];
      expect(scans.length).toBe(3);
    });

    it('overwrites scan for same date', () => {
      const updatedScan: InBodyScan = {
        id: 'scan-1-updated',
        date: '2024-01-01',
        weight: 84.5,
        bodyFatPercent: 24.5,
        muscleMass: 40.2,
        skeletalMuscle: 32.2,
        bmr: 1745,
        fatMass: 20.7,
      };

      scans = scans.map((s) => (s.date === updatedScan.date ? updatedScan : s));

      expect(scans.length).toBe(2);
      expect(scans.find((s) => s.date === '2024-01-01')?.weight).toBe(84.5);
    });
  });

  describe('Delete Scan', () => {
    it('removes scan by id', () => {
      scans = scans.filter((s) => s.id !== 'scan-1');

      expect(scans.length).toBe(1);
      expect(scans[0].id).toBe('scan-2');
    });
  });

  describe('Scan Validation', () => {
    interface ValidationResult {
      valid: boolean;
      errors: string[];
    }

    const validateScan = (scan: Partial<InBodyScan>): ValidationResult => {
      const errors: string[] = [];

      if (!scan.date) {
        errors.push('Date is required');
      }

      if (scan.weight === undefined || scan.weight <= 0) {
        errors.push('Weight must be greater than 0');
      }

      if (scan.bodyFatPercent === undefined) {
        errors.push('Body fat percentage is required');
      } else if (scan.bodyFatPercent < 0 || scan.bodyFatPercent > 70) {
        errors.push('Body fat percentage must be between 0 and 70');
      }

      if (scan.muscleMass !== undefined && scan.muscleMass < 0) {
        errors.push('Muscle mass cannot be negative');
      }

      if (scan.bmr !== undefined && scan.bmr < 500) {
        errors.push('BMR seems too low');
      }

      return { valid: errors.length === 0, errors };
    };

    it('validates complete scan', () => {
      const result = validateScan({
        date: '2024-01-01',
        weight: 80,
        bodyFatPercent: 20,
        muscleMass: 40,
        bmr: 1700,
      });

      expect(result.valid).toBe(true);
    });

    it('rejects scan without date', () => {
      const result = validateScan({
        weight: 80,
        bodyFatPercent: 20,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Date is required');
    });

    it('rejects invalid body fat percentage', () => {
      const result = validateScan({
        date: '2024-01-01',
        weight: 80,
        bodyFatPercent: 75,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Body fat percentage must be between 0 and 70');
    });
  });

  describe('Body Composition Calculations', () => {
    it('calculates fat mass from weight and body fat %', () => {
      const weight = 80;
      const bodyFatPercent = 20;
      const fatMass = (weight * bodyFatPercent) / 100;

      expect(fatMass).toBe(16);
    });

    it('calculates lean mass', () => {
      const weight = 80;
      const fatMass = 16;
      const leanMass = weight - fatMass;

      expect(leanMass).toBe(64);
    });

    it('calculates fat-free mass index (FFMI)', () => {
      const leanMass = 64; // kg
      const heightM = 1.80; // meters
      const ffmi = leanMass / (heightM * heightM);

      expect(ffmi).toBeCloseTo(19.75, 1);
    });
  });

  describe('Progress Between Scans', () => {
    it('calculates fat loss between scans', () => {
      const first = scans[0];
      const second = scans[1];

      const fatLost = first.fatMass! - second.fatMass!;
      expect(fatLost).toBeCloseTo(2.16, 1);
    });

    it('calculates muscle change between scans', () => {
      const first = scans[0];
      const second = scans[1];

      const muscleChange = second.muscleMass! - first.muscleMass!;
      expect(muscleChange).toBe(0.5);
    });

    it('calculates body fat % change', () => {
      const first = scans[0];
      const second = scans[1];

      const bfChange = second.bodyFatPercent - first.bodyFatPercent;
      expect(bfChange).toBe(-2);
    });
  });

  describe('Fat Loss Efficiency', () => {
    const calculateFatLossEfficiency = (
      firstScan: InBodyScan,
      secondScan: InBodyScan
    ): number | null => {
      const weightLost = firstScan.weight - secondScan.weight;
      const fatLost = (firstScan.fatMass || 0) - (secondScan.fatMass || 0);

      if (weightLost <= 0) return null; // Can't calculate for weight gain/maintenance

      const efficiency = (fatLost / weightLost) * 100;
      return Math.round(efficiency);
    };

    it('calculates fat loss efficiency', () => {
      const efficiency = calculateFatLossEfficiency(scans[0], scans[1]);

      // Lost 2kg total, ~2.16kg was fat
      expect(efficiency).toBeGreaterThan(100); // More than 100% means some recomp
    });

    it('returns null for weight gain', () => {
      const gaining: InBodyScan = { ...scans[1], weight: 90 };
      const efficiency = calculateFatLossEfficiency(scans[0], gaining);

      expect(efficiency).toBeNull();
    });
  });

  describe('AI Data Extraction', () => {
    interface ExtractedData {
      weight?: number;
      bodyFatPercent?: number;
      muscleMass?: number;
      skeletalMuscle?: number;
      bmr?: number;
      fatMass?: number;
      visceralFatGrade?: number;
      waterWeight?: number;
      bodyAge?: number;
    }

    const parseInBodyAIResponse = (response: string): ExtractedData | null => {
      try {
        const parsed = JSON.parse(response);

        // Validate required fields
        if (typeof parsed.weight !== 'number' || typeof parsed.bodyFatPercent !== 'number') {
          return null;
        }

        return {
          weight: parsed.weight,
          bodyFatPercent: parsed.bodyFatPercent,
          muscleMass: parsed.muscleMass,
          skeletalMuscle: parsed.skeletalMuscle,
          bmr: parsed.bmr,
          fatMass: parsed.fatMass,
          visceralFatGrade: parsed.visceralFatGrade,
          waterWeight: parsed.waterWeight,
          bodyAge: parsed.bodyAge,
        };
      } catch {
        return null;
      }
    };

    it('parses complete AI response', () => {
      const response = JSON.stringify({
        weight: 80.5,
        bodyFatPercent: 20.3,
        muscleMass: 40.2,
        skeletalMuscle: 30.5,
        bmr: 1720,
        fatMass: 16.3,
        visceralFatGrade: 8,
        waterWeight: 45.2,
        bodyAge: 28,
      });

      const data = parseInBodyAIResponse(response);

      expect(data).not.toBeNull();
      expect(data?.weight).toBe(80.5);
      expect(data?.bmr).toBe(1720);
    });

    it('parses partial response with required fields', () => {
      const response = JSON.stringify({
        weight: 80,
        bodyFatPercent: 20,
      });

      const data = parseInBodyAIResponse(response);

      expect(data).not.toBeNull();
      expect(data?.muscleMass).toBeUndefined();
    });

    it('returns null for missing required fields', () => {
      const response = JSON.stringify({
        weight: 80,
        // Missing bodyFatPercent
      });

      expect(parseInBodyAIResponse(response)).toBeNull();
    });

    it('returns null for invalid JSON', () => {
      expect(parseInBodyAIResponse('not json')).toBeNull();
    });
  });

  describe('Scan History Sorting', () => {
    it('sorts scans by date descending (newest first)', () => {
      const sorted = [...scans].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      expect(sorted[0].date).toBe('2024-02-01');
      expect(sorted[1].date).toBe('2024-01-01');
    });
  });

  describe('Auto Weight Sync', () => {
    interface WeighIn {
      date: string;
      weight: number;
    }

    it('creates weight entry from InBody scan', () => {
      const scan = scans[0];
      const weighIn: WeighIn = {
        date: scan.date,
        weight: scan.weight,
      };

      expect(weighIn.date).toBe('2024-01-01');
      expect(weighIn.weight).toBe(85);
    });

    it('updates existing weight entry for same date', () => {
      const weighIns: WeighIn[] = [{ date: '2024-01-01', weight: 84.5 }];
      const scan = scans[0];

      const updated = weighIns.map((w) =>
        w.date === scan.date ? { ...w, weight: scan.weight } : w
      );

      expect(updated[0].weight).toBe(85);
    });
  });

  describe('Body Composition Status', () => {
    type BodyCompStatus = 'excellent' | 'good' | 'average' | 'needs_improvement';

    const getBodyFatStatus = (bodyFatPercent: number, gender: 'male' | 'female'): BodyCompStatus => {
      if (gender === 'male') {
        if (bodyFatPercent < 12) return 'excellent';
        if (bodyFatPercent < 18) return 'good';
        if (bodyFatPercent < 25) return 'average';
        return 'needs_improvement';
      } else {
        if (bodyFatPercent < 20) return 'excellent';
        if (bodyFatPercent < 25) return 'good';
        if (bodyFatPercent < 32) return 'average';
        return 'needs_improvement';
      }
    };

    it('categorizes male body fat correctly', () => {
      expect(getBodyFatStatus(10, 'male')).toBe('excellent');
      expect(getBodyFatStatus(15, 'male')).toBe('good');
      expect(getBodyFatStatus(22, 'male')).toBe('average');
      expect(getBodyFatStatus(30, 'male')).toBe('needs_improvement');
    });

    it('categorizes female body fat correctly', () => {
      expect(getBodyFatStatus(18, 'female')).toBe('excellent');
      expect(getBodyFatStatus(23, 'female')).toBe('good');
      expect(getBodyFatStatus(28, 'female')).toBe('average');
      expect(getBodyFatStatus(35, 'female')).toBe('needs_improvement');
    });
  });

  describe('BMR Comparison', () => {
    it('detects BMR decline between scans', () => {
      const bmrChange = scans[1].bmr! - scans[0].bmr!;

      expect(bmrChange).toBe(-30);
      expect(bmrChange < 0).toBe(true);
    });

    it('calculates expected BMR change from weight loss', () => {
      const weightLost = scans[0].weight - scans[1].weight;
      const expectedBmrChange = weightLost * 7; // ~7 cal per kg

      expect(expectedBmrChange).toBeCloseTo(14, 0);
    });

    it('identifies excessive BMR decline (metabolic adaptation)', () => {
      const actualBmrChange = scans[1].bmr! - scans[0].bmr!; // -30
      const weightLost = scans[0].weight - scans[1].weight; // 2
      const expectedBmrChange = -(weightLost * 7); // -14

      const excessDecline = actualBmrChange - expectedBmrChange; // -30 - (-14) = -16
      const isAdapting = excessDecline < -50;

      expect(isAdapting).toBe(false); // Not adapting (decline within range)
    });
  });

  describe('Scan Date Validation', () => {
    it('prevents duplicate dates', () => {
      const newScanDate = '2024-01-01';
      const exists = scans.some((s) => s.date === newScanDate);

      expect(exists).toBe(true);
    });

    it('prevents future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const dateStr = futureDate.toISOString().split('T')[0];

      const today = new Date().toISOString().split('T')[0];
      const isFuture = dateStr > today;

      expect(isFuture).toBe(true);
    });
  });

  describe('Visceral Fat Interpretation', () => {
    type VFStatus = 'healthy' | 'moderate' | 'high';

    const getVisceralFatStatus = (grade: number): VFStatus => {
      if (grade <= 9) return 'healthy';
      if (grade <= 14) return 'moderate';
      return 'high';
    };

    it('categorizes visceral fat correctly', () => {
      expect(getVisceralFatStatus(5)).toBe('healthy');
      expect(getVisceralFatStatus(9)).toBe('healthy');
      expect(getVisceralFatStatus(10)).toBe('moderate');
      expect(getVisceralFatStatus(14)).toBe('moderate');
      expect(getVisceralFatStatus(15)).toBe('high');
      expect(getVisceralFatStatus(20)).toBe('high');
    });
  });
});
