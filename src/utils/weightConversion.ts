import type { WeightUnit } from '../types';

const KG_TO_LBS = 2.20462;
const LBS_TO_KG = 0.453592;

/**
 * Convert weight from kg to the specified unit
 */
export function convertWeight(weightKg: number, unit: WeightUnit): number {
  if (unit === 'lbs') {
    return weightKg * KG_TO_LBS;
  }
  return weightKg;
}

/**
 * Convert weight from the specified unit back to kg (for storage)
 */
export function convertToKg(weight: number, fromUnit: WeightUnit): number {
  if (fromUnit === 'lbs') {
    return weight * LBS_TO_KG;
  }
  return weight;
}

/**
 * Format weight with appropriate unit label
 */
export function formatWeight(
  weightKg: number,
  unit: WeightUnit,
  decimals: number = 1
): string {
  const converted = convertWeight(weightKg, unit);
  return `${converted.toFixed(decimals)} ${unit}`;
}

/**
 * Format weight value only (without unit label)
 */
export function formatWeightValue(
  weightKg: number,
  unit: WeightUnit,
  decimals: number = 1
): string {
  const converted = convertWeight(weightKg, unit);
  return converted.toFixed(decimals);
}

/**
 * Get the unit label
 */
export function getWeightUnitLabel(unit: WeightUnit): string {
  return unit;
}

/**
 * Format weight change (with + or - sign)
 */
export function formatWeightChange(
  changeKg: number,
  unit: WeightUnit,
  decimals: number = 1
): string {
  const converted = convertWeight(changeKg, unit);
  const sign = converted > 0 ? '+' : '';
  return `${sign}${converted.toFixed(decimals)} ${unit}`;
}
