import { parseISO, subDays, isAfter, format } from 'date-fns';
import type { DailyLog, WeighIn, InBodyScan, Meal, MealLogEntry } from '../types';

// ============================================
// TYPES
// ============================================

export type ResponseStatus = 'normal' | 'slow' | 'fast' | 'insufficient-data';
export type QualityStatus = 'excellent' | 'good' | 'concerning' | 'insufficient-data';
export type MetabolicStatus = 'healthy' | 'adapting' | 'insufficient-data';

export interface BodyIntelligence {
  // Response Score
  accumulatedDeficit: number;     // Total deficit over period (cal)
  expectedWeightLoss: number;     // Based on accumulated deficit (kg)
  actualWeightLoss: number;       // From weigh-ins (kg)
  responseScore: number;          // (actual/expected) × 100
  responseStatus: ResponseStatus;

  // Weight Quality (from InBody)
  fatLost: number;                // kg
  muscleLost: number;             // kg (positive = lost, negative = gained)
  waterChange: number;            // kg
  totalWeightLost: number;        // kg
  fatLossEfficiency: number;      // (fatLost/totalLost) × 100
  qualityStatus: QualityStatus;
  hasInBodyData: boolean;

  // Metabolic Health
  currentBMR: number;
  previousBMR: number;
  bmrChange: number;              // cal/day
  expectedBmrChange: number;      // ~7 cal per kg lost
  metabolicStatus: MetabolicStatus;
  hasBMRData: boolean;

  // Period analyzed
  periodDays: number;
  startDate: string;
  endDate: string;
  daysWithData: number;
}

export interface ResponseInterpretation {
  status: string;
  message: string;
  color: string;
  emoji: string;
}

export interface QualityInterpretation {
  status: string;
  message: string;
  color: string;
  emoji: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const getMealId = (entry: string | MealLogEntry): string => {
  return typeof entry === 'string' ? entry : entry.mealId;
};

const getMealQuantity = (entry: string | MealLogEntry): number => {
  return typeof entry === 'string' ? 1 : entry.quantity;
};

/**
 * Calculate total calories from a daily log
 */
function getLogCalories(log: DailyLog, meals: Meal[]): number {
  return log.meals.reduce((total, entry) => {
    const mealId = getMealId(entry);
    const quantity = getMealQuantity(entry);
    const meal = meals.find(m => m.id === mealId);
    if (!meal) return total;
    return total + Math.round(meal.calories * quantity);
  }, 0);
}

/**
 * Filter data within a date range
 */
function isWithinPeriod(dateStr: string, endDate: Date, periodDays: number): boolean {
  const date = parseISO(dateStr);
  const startDate = subDays(endDate, periodDays);
  return isAfter(date, startDate) && !isAfter(date, endDate);
}

// ============================================
// MAIN CALCULATION FUNCTION
// ============================================

export function calculateBodyIntelligence(
  dailyLogs: DailyLog[],
  weighIns: WeighIn[],
  inBodyScans: InBodyScan[],
  meals: Meal[],
  bmr: number,
  periodDays: number = 30
): BodyIntelligence {
  const endDate = new Date();
  const startDate = subDays(endDate, periodDays);

  // Default return for insufficient data
  const defaultResult: BodyIntelligence = {
    accumulatedDeficit: 0,
    expectedWeightLoss: 0,
    actualWeightLoss: 0,
    responseScore: 0,
    responseStatus: 'insufficient-data',
    fatLost: 0,
    muscleLost: 0,
    waterChange: 0,
    totalWeightLost: 0,
    fatLossEfficiency: 0,
    qualityStatus: 'insufficient-data',
    hasInBodyData: false,
    currentBMR: 0,
    previousBMR: 0,
    bmrChange: 0,
    expectedBmrChange: 0,
    metabolicStatus: 'insufficient-data',
    hasBMRData: false,
    periodDays,
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
    daysWithData: 0,
  };

  // Filter logs within period
  const periodLogs = dailyLogs.filter(log =>
    isWithinPeriod(log.date, endDate, periodDays)
  );

  if (periodLogs.length < 7 || bmr <= 0) {
    return defaultResult;
  }

  // ============================================
  // CALCULATE ACCUMULATED DEFICIT
  // ============================================

  let accumulatedDeficit = 0;
  let daysWithData = 0;

  for (const log of periodLogs) {
    const caloriesConsumed = getLogCalories(log, meals);

    // Skip days with no logged food
    if (caloriesConsumed === 0) continue;

    // TDEE = BMR + Active Energy
    const activeEnergy = log.healthMetrics?.activeEnergy || log.workoutCalories || 0;
    const tdee = bmr + activeEnergy;

    // Deficit = TDEE - Food (positive = deficit, negative = surplus)
    const dailyDeficit = tdee - caloriesConsumed;
    accumulatedDeficit += dailyDeficit;
    daysWithData++;
  }

  if (daysWithData < 7) {
    return defaultResult;
  }

  // ============================================
  // CALCULATE EXPECTED VS ACTUAL WEIGHT LOSS
  // ============================================

  // Expected loss: 1 kg = 7700 calories
  const expectedWeightLoss = Math.max(0, accumulatedDeficit / 7700);

  // Get weigh-ins within period
  const periodWeighIns = weighIns
    .filter(w => isWithinPeriod(w.date, endDate, periodDays))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Calculate actual weight loss
  let actualWeightLoss = 0;
  if (periodWeighIns.length >= 2) {
    const firstWeight = periodWeighIns[0].weight;
    const lastWeight = periodWeighIns[periodWeighIns.length - 1].weight;
    actualWeightLoss = firstWeight - lastWeight; // Positive = lost weight
  }

  // Calculate response score
  let responseScore = 0;
  let responseStatus: ResponseStatus = 'insufficient-data';

  if (expectedWeightLoss > 0.1 && periodWeighIns.length >= 2) {
    responseScore = Math.round((actualWeightLoss / expectedWeightLoss) * 100);

    if (responseScore >= 80 && responseScore <= 120) {
      responseStatus = 'normal';
    } else if (responseScore < 80) {
      responseStatus = 'slow';
    } else {
      responseStatus = 'fast';
    }
  } else if (periodWeighIns.length < 2) {
    responseStatus = 'insufficient-data';
  }

  // ============================================
  // CALCULATE WEIGHT QUALITY (FROM INBODY)
  // ============================================

  // Get InBody scans within period
  const periodScans = inBodyScans
    .filter(s => isWithinPeriod(s.date, endDate, periodDays))
    .sort((a, b) => a.date.localeCompare(b.date));

  let fatLost = 0;
  let muscleLost = 0;
  let waterChange = 0;
  let totalWeightLost = 0;
  let fatLossEfficiency = 0;
  let qualityStatus: QualityStatus = 'insufficient-data';
  const hasInBodyData = periodScans.length >= 2;

  if (hasInBodyData) {
    const firstScan = periodScans[0];
    const lastScan = periodScans[periodScans.length - 1];

    // Calculate changes (positive = lost)
    totalWeightLost = (firstScan.weight || 0) - (lastScan.weight || 0);

    if (firstScan.fatMass && lastScan.fatMass) {
      fatLost = firstScan.fatMass - lastScan.fatMass;
    }

    if (firstScan.muscleMass && lastScan.muscleMass) {
      muscleLost = firstScan.muscleMass - lastScan.muscleMass;
    }

    if (firstScan.waterWeight && lastScan.waterWeight) {
      waterChange = firstScan.waterWeight - lastScan.waterWeight;
    }

    // Calculate fat loss efficiency
    if (totalWeightLost > 0.1 && fatLost > 0) {
      fatLossEfficiency = Math.round((fatLost / totalWeightLost) * 100);

      if (fatLossEfficiency >= 80) {
        qualityStatus = 'excellent';
      } else if (fatLossEfficiency >= 60) {
        qualityStatus = 'good';
      } else {
        qualityStatus = 'concerning';
      }
    } else if (totalWeightLost <= 0) {
      // Not losing weight, can't assess quality
      qualityStatus = 'insufficient-data';
    }
  }

  // ============================================
  // CALCULATE METABOLIC STATUS (BMR TREND)
  // ============================================

  let currentBMR = 0;
  let previousBMR = 0;
  let bmrChange = 0;
  let expectedBmrChange = 0;
  let metabolicStatus: MetabolicStatus = 'insufficient-data';
  const hasBMRData = periodScans.length >= 2 &&
    periodScans.some(s => s.bmr && s.bmr > 0);

  if (hasBMRData) {
    // Get scans with BMR data
    const scansWithBMR = periodScans.filter(s => s.bmr && s.bmr > 0);

    if (scansWithBMR.length >= 2) {
      const firstScan = scansWithBMR[0];
      const lastScan = scansWithBMR[scansWithBMR.length - 1];

      currentBMR = lastScan.bmr || 0;
      previousBMR = firstScan.bmr || 0;
      bmrChange = currentBMR - previousBMR; // Negative = BMR dropped

      // Expected BMR change: ~7 cal per kg lost
      expectedBmrChange = -Math.round(totalWeightLost * 7);

      // Check for metabolic adaptation
      // If BMR dropped more than expected, might be adapting
      const unexpectedDrop = Math.abs(bmrChange) - Math.abs(expectedBmrChange);

      if (totalWeightLost > 0.5) {
        if (unexpectedDrop < 30) {
          // BMR drop is within expected range
          metabolicStatus = 'healthy';
        } else if (bmrChange < expectedBmrChange - 50) {
          // BMR dropped significantly more than expected
          metabolicStatus = 'adapting';
        } else {
          metabolicStatus = 'healthy';
        }
      }
    }
  }

  return {
    accumulatedDeficit: Math.round(accumulatedDeficit),
    expectedWeightLoss: Math.round(expectedWeightLoss * 10) / 10,
    actualWeightLoss: Math.round(actualWeightLoss * 10) / 10,
    responseScore,
    responseStatus,
    fatLost: Math.round(fatLost * 10) / 10,
    muscleLost: Math.round(muscleLost * 10) / 10,
    waterChange: Math.round(waterChange * 10) / 10,
    totalWeightLost: Math.round(totalWeightLost * 10) / 10,
    fatLossEfficiency,
    qualityStatus,
    hasInBodyData,
    currentBMR,
    previousBMR,
    bmrChange: Math.round(bmrChange),
    expectedBmrChange,
    metabolicStatus,
    hasBMRData,
    periodDays,
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
    daysWithData,
  };
}

// ============================================
// INTERPRETATION HELPERS
// ============================================

export function getResponseScoreInterpretation(
  score: number,
  status: ResponseStatus
): ResponseInterpretation {
  switch (status) {
    case 'normal':
      return {
        status: 'On Track',
        message: 'Your body is responding as expected to your calorie deficit.',
        color: '#10b981', // green
        emoji: '✓',
      };
    case 'slow':
      return {
        status: 'Slower Than Expected',
        message: score < 50
          ? 'Water retention or metabolic adaptation may be occurring. Stay consistent!'
          : 'Slightly slower than expected. This is normal and may correct itself.',
        color: '#f59e0b', // amber
        emoji: '⏳',
      };
    case 'fast':
      return {
        status: 'Faster Than Expected',
        message: score > 150
          ? 'You may be losing water weight or muscle. Consider slowing down.'
          : 'Slightly faster than expected. Monitor your muscle retention.',
        color: '#8b5cf6', // purple
        emoji: '⚡',
      };
    default:
      return {
        status: 'Insufficient Data',
        message: 'Log at least 7 days of food and 2 weigh-ins to see your body response.',
        color: '#6b7280', // gray
        emoji: '📊',
      };
  }
}

export function getQualityInterpretation(
  efficiency: number,
  status: QualityStatus
): QualityInterpretation {
  switch (status) {
    case 'excellent':
      return {
        status: 'Excellent',
        message: `${efficiency}% of your weight loss is from fat. You're preserving muscle well!`,
        color: '#10b981', // green
        emoji: '💪',
      };
    case 'good':
      return {
        status: 'Good',
        message: `${efficiency}% from fat. Consider adding resistance training to preserve more muscle.`,
        color: '#f59e0b', // amber
        emoji: '👍',
      };
    case 'concerning':
      return {
        status: 'Needs Attention',
        message: `Only ${efficiency}% from fat. You may be losing muscle. Slow down and add protein.`,
        color: '#ef4444', // red
        emoji: '⚠️',
      };
    default:
      return {
        status: 'Insufficient Data',
        message: 'Need 2+ InBody scans to analyze your weight loss quality.',
        color: '#6b7280', // gray
        emoji: '📊',
      };
  }
}

export function getMetabolicInterpretation(
  status: MetabolicStatus,
  bmrChange: number
): { status: string; message: string; color: string; emoji: string } {
  switch (status) {
    case 'healthy':
      return {
        status: 'Healthy',
        message: 'No signs of metabolic adaptation. Your metabolism is responding normally.',
        color: '#10b981', // green
        emoji: '🔥',
      };
    case 'adapting':
      return {
        status: 'Adapting',
        message: `BMR dropped ${Math.abs(bmrChange)} cal more than expected. Consider a diet break or refeed.`,
        color: '#f59e0b', // amber
        emoji: '⚡',
      };
    default:
      return {
        status: 'Insufficient Data',
        message: 'Need 2+ InBody scans with BMR to track metabolic adaptation.',
        color: '#6b7280', // gray
        emoji: '📊',
      };
  }
}
