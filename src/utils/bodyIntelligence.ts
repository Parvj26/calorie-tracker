import { parseISO, subDays, isAfter, format } from 'date-fns';
import type { DailyLog, WeighIn, InBodyScan, Meal, MealLogEntry } from '../types';

// ============================================
// TYPES
// ============================================

export type ResponseStatus = 'normal' | 'slow' | 'fast' | 'insufficient-data';
export type QualityStatus = 'excellent' | 'good' | 'concerning' | 'insufficient-data';
export type MetabolicStatus = 'healthy' | 'adapting' | 'insufficient-data';

export type ConfidenceLevel = 'very-low' | 'low' | 'medium' | 'high';

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

  // Confidence indicator
  confidence: ConfidenceLevel;
  confidenceMessage: string;
  hasEnoughData: boolean;         // true if 7+ days with data
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
  return typeof entry === 'string' ? 1 : (entry.quantity || 1);
};

const getMealUnit = (entry: string | MealLogEntry): string => {
  return typeof entry === 'string' ? 'serving' : (entry.unit || 'serving');
};

/**
 * Convert quantity to serving multiplier based on unit
 */
const getServingMultiplier = (quantity: number, unit: string, servingSize?: number): number => {
  if (unit === 'serving') return quantity;

  // For unit-based quantities, we need servingSize to convert
  const size = servingSize || 100; // Default to 100g if not specified

  if (unit === 'g') return quantity / size;
  if (unit === 'oz') return (quantity * 28.35) / size; // 1 oz = 28.35g
  if (unit === 'ml') return quantity / size; // Assume 1ml = 1g for simplicity

  return quantity;
};

/**
 * Calculate total calories from a daily log
 */
function getLogCalories(log: DailyLog, meals: Meal[]): number {
  return log.meals.reduce((total, entry) => {
    const mealId = getMealId(entry);
    const quantity = getMealQuantity(entry);
    const unit = getMealUnit(entry);
    const meal = meals.find(m => m.id === mealId);
    if (!meal) return total;
    // Use serving multiplier to correctly calculate calories based on unit
    const multiplier = getServingMultiplier(quantity, unit, meal.servingSize);
    return total + Math.round(meal.calories * multiplier);
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

  // Helper to determine confidence level
  const getConfidence = (days: number): { level: ConfidenceLevel; message: string; hasEnough: boolean } => {
    if (days >= 14) {
      return { level: 'high', message: 'High confidence based on 2+ weeks of data', hasEnough: true };
    } else if (days >= 7) {
      return { level: 'medium', message: 'Good confidence. More data will improve accuracy.', hasEnough: true };
    } else if (days >= 3) {
      return { level: 'low', message: 'Early estimate. Log 7+ days for reliable insights.', hasEnough: false };
    } else {
      return { level: 'very-low', message: 'Very early data. Keep tracking for better insights!', hasEnough: false };
    }
  };

  // Default return for no data at all
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
    confidence: 'very-low',
    confidenceMessage: 'Start logging to see your body intelligence!',
    hasEnoughData: false,
  };

  // Filter logs within period
  const periodLogs = dailyLogs.filter(log =>
    isWithinPeriod(log.date, endDate, periodDays)
  );

  // Return default if no BMR or no logs at all
  if (periodLogs.length === 0 || bmr <= 0) {
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

  // Get confidence based on data we have
  const confidenceInfo = getConfidence(daysWithData);

  // If no days with actual food logged, return default
  if (daysWithData === 0) {
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

    // Calculate fat loss efficiency and quality status
    if (totalWeightLost > 0.1) {
      // User is losing weight
      if (fatLost > 0) {
        // Normal case: lost weight and lost fat
        fatLossEfficiency = Math.round((fatLost / totalWeightLost) * 100);

        if (fatLossEfficiency >= 80) {
          qualityStatus = 'excellent';
        } else if (fatLossEfficiency >= 60) {
          qualityStatus = 'good';
        } else {
          qualityStatus = 'concerning';
        }
      } else {
        // Lost weight but gained fat (or no change) - concerning!
        // Weight loss came entirely from muscle/water
        fatLossEfficiency = 0;
        qualityStatus = 'concerning';
      }
    } else if (totalWeightLost < -0.1) {
      // User is gaining weight - check if it's muscle or fat
      if (muscleLost < 0 && fatLost <= 0) {
        // Gained muscle and didn't lose fat (bulking well)
        // Use muscle gain ratio instead
        const muscleGained = Math.abs(muscleLost);
        const totalGained = Math.abs(totalWeightLost);
        fatLossEfficiency = Math.round((muscleGained / totalGained) * 100);
        if (fatLossEfficiency >= 70) {
          qualityStatus = 'excellent'; // Mostly muscle gain
        } else if (fatLossEfficiency >= 50) {
          qualityStatus = 'good';
        } else {
          qualityStatus = 'concerning'; // Mostly fat gain
        }
      } else if (fatLost > 0 && muscleLost < 0) {
        // Recomposition while gaining weight (lost fat, gained more muscle)
        qualityStatus = 'excellent';
        fatLossEfficiency = 100;
      } else {
        qualityStatus = 'concerning';
        fatLossEfficiency = 0;
      }
    } else {
      // Weight stable (within ±0.1kg) - check for recomposition
      if (fatLost > 0.1 && muscleLost <= 0) {
        // Lost fat while maintaining/gaining muscle - excellent recomp!
        qualityStatus = 'excellent';
        fatLossEfficiency = 100;
      } else if (fatLost > 0.1 && muscleLost > 0 && muscleLost < fatLost) {
        // Lost more fat than muscle - decent recomp
        qualityStatus = 'good';
        fatLossEfficiency = Math.round((fatLost / (fatLost + muscleLost)) * 100);
      } else if (Math.abs(fatLost) < 0.1 && Math.abs(muscleLost) < 0.1) {
        // No significant changes - maintaining
        qualityStatus = 'good';
        fatLossEfficiency = 0;
      } else {
        // Lost muscle or gained fat while weight stable
        qualityStatus = 'concerning';
        fatLossEfficiency = 0;
      }
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

      if (totalWeightLost > 0.2) {
        // User is losing weight - check if BMR drop is appropriate
        if (unexpectedDrop < 30) {
          // BMR drop is within expected range
          metabolicStatus = 'healthy';
        } else if (bmrChange < expectedBmrChange - 50) {
          // BMR dropped significantly more than expected
          metabolicStatus = 'adapting';
        } else {
          metabolicStatus = 'healthy';
        }
      } else {
        // User is maintaining or gaining weight
        // Just check if BMR is stable (within ~30 cal is normal fluctuation)
        if (Math.abs(bmrChange) <= 30) {
          metabolicStatus = 'healthy';
        } else if (bmrChange < -50) {
          // BMR dropped significantly without weight loss - possible adaptation
          metabolicStatus = 'adapting';
        } else {
          // BMR stable or increased
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
    confidence: confidenceInfo.level,
    confidenceMessage: confidenceInfo.message,
    hasEnoughData: confidenceInfo.hasEnough,
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
  status: QualityStatus,
  totalWeightLost: number = 0,
  fatLost: number = 0,
  muscleLost: number = 0
): QualityInterpretation {
  // Determine the context: weight loss, gain, or maintenance
  const isLosingWeight = totalWeightLost > 0.1;
  const isGainingWeight = totalWeightLost < -0.1;
  const isMaintaining = !isLosingWeight && !isGainingWeight;
  const isRecomposition = isMaintaining && fatLost > 0.1 && muscleLost <= 0;
  const isGainingMuscle = muscleLost < -0.1;

  switch (status) {
    case 'excellent':
      if (isRecomposition) {
        return {
          status: 'Excellent Recomp',
          message: `Losing fat while maintaining muscle at stable weight. Perfect body recomposition!`,
          color: '#10b981',
          emoji: '💪',
        };
      } else if (isGainingWeight && isGainingMuscle) {
        return {
          status: 'Quality Bulk',
          message: `${efficiency}% of weight gain is muscle. Great lean bulking!`,
          color: '#10b981',
          emoji: '💪',
        };
      } else {
        return {
          status: 'Excellent',
          message: `${efficiency}% of weight loss is from fat. You're preserving muscle well!`,
          color: '#10b981',
          emoji: '💪',
        };
      }
    case 'good':
      if (isMaintaining) {
        return {
          status: 'Maintaining',
          message: 'Body composition stable. Keep up the consistency!',
          color: '#f59e0b',
          emoji: '👍',
        };
      } else if (isGainingWeight) {
        return {
          status: 'Decent Bulk',
          message: `${efficiency}% muscle gain. Add more protein to maximize muscle growth.`,
          color: '#f59e0b',
          emoji: '👍',
        };
      } else {
        return {
          status: 'Good',
          message: `${efficiency}% from fat. Consider adding resistance training to preserve more muscle.`,
          color: '#f59e0b',
          emoji: '👍',
        };
      }
    case 'concerning':
      if (isGainingWeight) {
        return {
          status: 'Needs Attention',
          message: 'Weight gain is mostly fat. Add strength training and moderate calories.',
          color: '#ef4444',
          emoji: '⚠️',
        };
      } else if (isMaintaining) {
        return {
          status: 'Needs Attention',
          message: 'Losing muscle or gaining fat at stable weight. Increase protein and add resistance training.',
          color: '#ef4444',
          emoji: '⚠️',
        };
      } else {
        return {
          status: 'Needs Attention',
          message: efficiency > 0
            ? `Only ${efficiency}% from fat. You may be losing muscle. Slow down and add protein.`
            : 'Weight loss is from muscle/water. Add strength training and protein.',
          color: '#ef4444',
          emoji: '⚠️',
        };
      }
    default:
      return {
        status: 'Insufficient Data',
        message: 'Need 2+ InBody scans to analyze body composition changes.',
        color: '#6b7280',
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
