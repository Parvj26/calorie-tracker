/**
 * Apple Health-Based TDEE Calculation
 *
 * Formula: TDEE = (Resting Energy + Active Energy) × TEF Multiplier
 *
 * - Resting Energy: From Apple Health (includes NEAT via accelerometer)
 * - Active Energy: From Apple Health (exercise + detected movement)
 * - TEF Multiplier: Default 1.10 (10% for thermic effect of food)
 *
 * The TEF multiplier is calibrated over time by comparing:
 * - Apple-based TDEE vs Observed TDEE (from weight change)
 */

import type { DailyLog, WeighIn, HealthMetrics } from '../types';

export interface DailyTdeeData {
  date: string;
  restingEnergy: number;      // From Apple Health
  activeEnergy: number;       // From Apple Health
  rawTdee: number;            // Resting + Active (before TEF)
  tdee: number;               // Raw × TEF multiplier
  caloriesEaten: number;
  deficit: number;            // TDEE - calories eaten
}

export interface ObservedTdeeResult {
  observedTdee: number;       // Calculated from weight change
  appleAvgTdee: number;       // Average from Apple Health
  avgCaloriesEaten: number;
  weightChangeKg: number;     // Positive = loss
  daysAnalyzed: number;
  suggestedTefMultiplier: number;
  calibrationNeeded: boolean; // True if >10% difference
  confidence: 'low' | 'medium' | 'high';
}

export interface TdeeCalculationResult {
  // Daily values
  restingEnergy: number;
  activeEnergy: number;
  rawTdee: number;            // Before TEF
  tdee: number;               // After TEF
  tefMultiplier: number;

  // Deficit
  caloriesEaten: number;
  deficit: number;

  // Projections
  projectedWeeklyLossKg: number;

  // Calibration info
  observedTdee?: ObservedTdeeResult;

  // Data quality
  hasAppleHealthData: boolean;
  dataSource: 'apple_health' | 'manual' | 'none';
}

/**
 * Calculate daily TDEE from Apple Health data
 * TDEE = (Resting Energy + Active Energy) × TEF Multiplier
 */
export function calculateAppleHealthTdee(
  healthMetrics: HealthMetrics | undefined,
  tefMultiplier: number = 1.10,
  caloriesEaten: number = 0
): TdeeCalculationResult {
  const restingEnergy = healthMetrics?.restingEnergy || 0;
  const activeEnergy = healthMetrics?.activeEnergy || 0;

  const hasAppleHealthData = restingEnergy > 0;
  const rawTdee = restingEnergy + activeEnergy;
  const tdee = Math.round(rawTdee * tefMultiplier);

  const deficit = tdee - caloriesEaten;
  const projectedWeeklyLossKg = (deficit * 7) / 7700;

  return {
    restingEnergy,
    activeEnergy,
    rawTdee,
    tdee,
    tefMultiplier,
    caloriesEaten,
    deficit,
    projectedWeeklyLossKg: Math.round(projectedWeeklyLossKg * 100) / 100,
    hasAppleHealthData,
    dataSource: hasAppleHealthData ? 'apple_health' : 'none',
  };
}

/**
 * Calculate 7-day rolling average weight
 */
export function calculateRollingWeightAverage(
  weighIns: WeighIn[],
  targetDate: Date,
  windowDays: number = 7
): number | null {
  const targetTime = targetDate.getTime();
  const windowStart = targetTime - (windowDays * 24 * 60 * 60 * 1000);

  const weighInsInWindow = weighIns.filter(w => {
    const wTime = new Date(w.date).getTime();
    return wTime >= windowStart && wTime <= targetTime;
  });

  if (weighInsInWindow.length < 2) return null;

  const sum = weighInsInWindow.reduce((acc, w) => acc + w.weight, 0);
  return Math.round((sum / weighInsInWindow.length) * 100) / 100;
}

/**
 * Calculate observed TDEE from actual weight change
 * Observed TDEE = Avg Calories Eaten + (7700 × kg lost ÷ days)
 */
export function calculateObservedTdee(
  dailyLogs: DailyLog[],
  weighIns: WeighIn[],
  getMealCalories: (log: DailyLog) => number,
  tefMultiplier: number = 1.10,
  periodDays: number = 14
): ObservedTdeeResult | null {
  const today = new Date();
  const periodStart = new Date(today.getTime() - (periodDays * 24 * 60 * 60 * 1000));

  // Get rolling weight averages at start and end of period
  const startWeight = calculateRollingWeightAverage(weighIns, periodStart, 7);
  const endWeight = calculateRollingWeightAverage(weighIns, today, 7);

  if (startWeight === null || endWeight === null) {
    return null;
  }

  // Filter logs within period that have health metrics
  const logsInPeriod = dailyLogs.filter(log => {
    const logDate = new Date(log.date);
    return logDate >= periodStart && logDate <= today && log.healthMetrics?.restingEnergy;
  });

  if (logsInPeriod.length < 7) {
    return null; // Need at least 7 days of data
  }

  // Calculate averages
  const totalCaloriesEaten = logsInPeriod.reduce((sum, log) => sum + getMealCalories(log), 0);
  const avgCaloriesEaten = Math.round(totalCaloriesEaten / logsInPeriod.length);

  const totalAppleTdee = logsInPeriod.reduce((sum, log) => {
    const resting = log.healthMetrics?.restingEnergy || 0;
    const active = log.healthMetrics?.activeEnergy || 0;
    return sum + Math.round((resting + active) * tefMultiplier);
  }, 0);
  const appleAvgTdee = Math.round(totalAppleTdee / logsInPeriod.length);

  // Weight change (positive = loss)
  const weightChangeKg = startWeight - endWeight;
  const energyFromWeightChange = (7700 * weightChangeKg) / logsInPeriod.length;

  // Observed TDEE = calories eaten + energy equivalent of weight change
  const observedTdee = Math.round(avgCaloriesEaten + energyFromWeightChange);

  // Calculate suggested TEF multiplier to align Apple TDEE with observed
  const rawAppleTdee = logsInPeriod.reduce((sum, log) => {
    const resting = log.healthMetrics?.restingEnergy || 0;
    const active = log.healthMetrics?.activeEnergy || 0;
    return sum + (resting + active);
  }, 0) / logsInPeriod.length;

  const suggestedTefMultiplier = rawAppleTdee > 0
    ? Math.round((observedTdee / rawAppleTdee) * 100) / 100
    : tefMultiplier;

  // Check if calibration needed (>10% difference)
  const percentDiff = Math.abs(appleAvgTdee - observedTdee) / observedTdee;
  const calibrationNeeded = percentDiff > 0.10;

  // Confidence based on data quantity
  const confidence: 'low' | 'medium' | 'high' =
    logsInPeriod.length >= 14 ? 'high' :
    logsInPeriod.length >= 10 ? 'medium' : 'low';

  return {
    observedTdee,
    appleAvgTdee,
    avgCaloriesEaten,
    weightChangeKg: Math.round(weightChangeKg * 100) / 100,
    daysAnalyzed: logsInPeriod.length,
    suggestedTefMultiplier: Math.max(1.0, Math.min(1.25, suggestedTefMultiplier)), // Clamp 1.0-1.25
    calibrationNeeded,
    confidence,
  };
}

/**
 * Get TDEE data for the past N days
 */
export function getDailyTdeeHistory(
  dailyLogs: DailyLog[],
  getMealCalories: (log: DailyLog) => number,
  tefMultiplier: number = 1.10,
  days: number = 14
): DailyTdeeData[] {
  const today = new Date();
  const startDate = new Date(today.getTime() - (days * 24 * 60 * 60 * 1000));

  return dailyLogs
    .filter(log => {
      const logDate = new Date(log.date);
      return logDate >= startDate && logDate <= today && log.healthMetrics?.restingEnergy;
    })
    .map(log => {
      const restingEnergy = log.healthMetrics?.restingEnergy || 0;
      const activeEnergy = log.healthMetrics?.activeEnergy || 0;
      const rawTdee = restingEnergy + activeEnergy;
      const tdee = Math.round(rawTdee * tefMultiplier);
      const caloriesEaten = getMealCalories(log);

      return {
        date: log.date,
        restingEnergy,
        activeEnergy,
        rawTdee,
        tdee,
        caloriesEaten,
        deficit: tdee - caloriesEaten,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calculate average TDEE over a period
 */
export function calculateAverageTdee(
  dailyLogs: DailyLog[],
  tefMultiplier: number = 1.10,
  days: number = 7
): { avgTdee: number; daysWithData: number } {
  const today = new Date();
  const startDate = new Date(today.getTime() - (days * 24 * 60 * 60 * 1000));

  const logsWithData = dailyLogs.filter(log => {
    const logDate = new Date(log.date);
    return logDate >= startDate && logDate <= today && log.healthMetrics?.restingEnergy;
  });

  if (logsWithData.length === 0) {
    return { avgTdee: 0, daysWithData: 0 };
  }

  const totalTdee = logsWithData.reduce((sum, log) => {
    const resting = log.healthMetrics?.restingEnergy || 0;
    const active = log.healthMetrics?.activeEnergy || 0;
    return sum + Math.round((resting + active) * tefMultiplier);
  }, 0);

  return {
    avgTdee: Math.round(totalTdee / logsWithData.length),
    daysWithData: logsWithData.length,
  };
}
