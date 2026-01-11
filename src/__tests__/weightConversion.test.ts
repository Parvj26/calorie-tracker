import { describe, it, expect } from 'vitest';
import {
  convertWeight,
  convertToKg,
  formatWeight,
  formatWeightValue,
  formatWeightChange,
} from '../utils/weightConversion';

// ============================================
// WEIGHT CONVERSION TESTS
// ============================================

describe('Weight Conversion', () => {
  describe('convertWeight (kg to unit)', () => {
    it('returns same value for kg unit', () => {
      expect(convertWeight(80, 'kg')).toBe(80);
      expect(convertWeight(55.5, 'kg')).toBe(55.5);
    });

    it('converts kg to lbs correctly', () => {
      // 1 kg = 2.20462 lbs
      expect(convertWeight(1, 'lbs')).toBeCloseTo(2.20462, 4);
      expect(convertWeight(80, 'lbs')).toBeCloseTo(176.37, 1);
      expect(convertWeight(50, 'lbs')).toBeCloseTo(110.23, 1);
    });

    it('handles decimal weights', () => {
      expect(convertWeight(75.5, 'lbs')).toBeCloseTo(166.45, 1);
    });

    it('handles zero weight', () => {
      expect(convertWeight(0, 'kg')).toBe(0);
      expect(convertWeight(0, 'lbs')).toBe(0);
    });
  });

  describe('convertToKg (unit to kg)', () => {
    it('returns same value for kg unit', () => {
      expect(convertToKg(80, 'kg')).toBe(80);
      expect(convertToKg(55.5, 'kg')).toBe(55.5);
    });

    it('converts lbs to kg correctly', () => {
      // 1 lb = 0.453592 kg
      expect(convertToKg(1, 'lbs')).toBeCloseTo(0.453592, 4);
      expect(convertToKg(176, 'lbs')).toBeCloseTo(79.83, 1);
      expect(convertToKg(110, 'lbs')).toBeCloseTo(49.90, 1);
    });

    it('handles decimal weights', () => {
      expect(convertToKg(165.5, 'lbs')).toBeCloseTo(75.07, 1);
    });

    it('handles zero weight', () => {
      expect(convertToKg(0, 'kg')).toBe(0);
      expect(convertToKg(0, 'lbs')).toBe(0);
    });
  });

  describe('Round-trip conversion', () => {
    it('kg → lbs → kg preserves value', () => {
      const original = 80;
      const toLbs = convertWeight(original, 'lbs');
      const backToKg = convertToKg(toLbs, 'lbs');
      expect(backToKg).toBeCloseTo(original, 2);
    });

    it('lbs → kg → lbs preserves value', () => {
      const original = 176;
      const toKg = convertToKg(original, 'lbs');
      const backToLbs = convertWeight(toKg, 'lbs');
      expect(backToLbs).toBeCloseTo(original, 2);
    });
  });
});

// ============================================
// WEIGHT FORMATTING TESTS
// ============================================

describe('Weight Formatting', () => {
  describe('formatWeight', () => {
    it('formats weight in kg with unit label', () => {
      expect(formatWeight(80, 'kg')).toBe('80.0 kg');
      expect(formatWeight(75.5, 'kg')).toBe('75.5 kg');
    });

    it('formats weight in lbs with unit label', () => {
      expect(formatWeight(80, 'lbs')).toBe('176.4 lbs');
      expect(formatWeight(50, 'lbs')).toBe('110.2 lbs');
    });

    it('respects decimals parameter', () => {
      expect(formatWeight(80.123, 'kg', 0)).toBe('80 kg');
      expect(formatWeight(80.123, 'kg', 2)).toBe('80.12 kg');
      expect(formatWeight(80.123, 'kg', 3)).toBe('80.123 kg');
    });

    it('rounds correctly', () => {
      expect(formatWeight(80.45, 'kg', 1)).toBe('80.5 kg');
      expect(formatWeight(80.44, 'kg', 1)).toBe('80.4 kg');
    });
  });

  describe('formatWeightValue', () => {
    it('formats weight value without unit label', () => {
      expect(formatWeightValue(80, 'kg')).toBe('80.0');
      expect(formatWeightValue(75.5, 'kg')).toBe('75.5');
    });

    it('converts and formats for lbs', () => {
      expect(formatWeightValue(80, 'lbs')).toBe('176.4');
      expect(formatWeightValue(50, 'lbs')).toBe('110.2');
    });

    it('respects decimals parameter', () => {
      expect(formatWeightValue(80.123, 'kg', 0)).toBe('80');
      expect(formatWeightValue(80.123, 'kg', 2)).toBe('80.12');
    });
  });

  describe('formatWeightChange', () => {
    it('formats positive weight change with + sign', () => {
      expect(formatWeightChange(2, 'kg')).toBe('+2.0 kg');
      expect(formatWeightChange(0.5, 'kg')).toBe('+0.5 kg');
    });

    it('formats negative weight change with - sign', () => {
      expect(formatWeightChange(-2, 'kg')).toBe('-2.0 kg');
      expect(formatWeightChange(-0.5, 'kg')).toBe('-0.5 kg');
    });

    it('formats zero weight change without + sign', () => {
      expect(formatWeightChange(0, 'kg')).toBe('0.0 kg');
    });

    it('converts and formats for lbs', () => {
      expect(formatWeightChange(1, 'lbs')).toBe('+2.2 lbs');
      expect(formatWeightChange(-1, 'lbs')).toBe('-2.2 lbs');
    });

    it('respects decimals parameter', () => {
      expect(formatWeightChange(2.345, 'kg', 0)).toBe('+2 kg');
      expect(formatWeightChange(2.345, 'kg', 2)).toBe('+2.35 kg');
    });
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Weight Conversion Edge Cases', () => {
  it('handles very small weights', () => {
    expect(convertWeight(0.1, 'lbs')).toBeCloseTo(0.22, 1);
    expect(convertToKg(0.1, 'lbs')).toBeCloseTo(0.045, 2);
  });

  it('handles very large weights', () => {
    expect(convertWeight(200, 'lbs')).toBeCloseTo(440.92, 1);
    expect(convertToKg(500, 'lbs')).toBeCloseTo(226.80, 1);
  });

  it('handles negative weights (edge case)', () => {
    expect(convertWeight(-1, 'lbs')).toBeCloseTo(-2.20462, 4);
    expect(convertToKg(-1, 'lbs')).toBeCloseTo(-0.453592, 4);
  });

  it('formats weights with many decimal places', () => {
    expect(formatWeight(80.123456789, 'kg', 1)).toBe('80.1 kg');
    expect(formatWeightValue(80.999999, 'kg', 1)).toBe('81.0');
  });
});
