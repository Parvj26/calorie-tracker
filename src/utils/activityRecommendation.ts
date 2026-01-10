/**
 * Activity Level Recommendation Utility
 *
 * Analyzes user's actual activity data (steps, exercise minutes)
 * and recommends an appropriate activity level setting.
 */

import type { ActivityLevel, DailyLog } from '../types';

export interface ActivityAnalysis {
  recommendedLevel: ActivityLevel;
  currentLevel: ActivityLevel | undefined;
  shouldRecommend: boolean;
  avgSteps: number;
  avgExerciseMinutes: number;
  daysWithExercise: number;
  daysAnalyzed: number;
  confidence: 'low' | 'medium' | 'high';
}

/**
 * Activity level thresholds (CONSERVATIVE - takes lower of steps vs exercise):
 *
 * Steps-based:
 * - Sedentary: < 5,000 steps/day
 * - Light: 5,000-7,499 steps/day
 * - Moderate: 7,500-9,999 steps/day
 * - High: 10,000-12,499 steps/day
 * - Very High: ≥ 12,500 steps/day
 *
 * Exercise-based (workouts/week):
 * - Sedentary: 0 days
 * - Light: 1-2 days
 * - Moderate: 3-4 days
 * - High: 5-6 days
 * - Very High: 7 days
 *
 * Final recommendation = LOWER of the two (conservative for weight loss)
 */

/**
 * Analyze activity data from daily logs and recommend an activity level
 *
 * @param dailyLogs - Array of daily logs with health metrics
 * @param currentActivityLevel - User's current activity level setting
 * @param daysToAnalyze - Number of recent days to analyze (default: 14)
 */
export function analyzeActivityLevel(
  dailyLogs: DailyLog[],
  currentActivityLevel: ActivityLevel | undefined,
  daysToAnalyze: number = 14
): ActivityAnalysis {
  // Filter logs that have health metrics with steps or exercise data
  // Sort by date descending and take the most recent N days
  const sortedLogs = [...dailyLogs]
    .filter(log => log.healthMetrics?.steps || log.healthMetrics?.exerciseMinutes)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, daysToAnalyze);

  // Need at least 3 days of data to make a recommendation
  if (sortedLogs.length < 3) {
    return {
      recommendedLevel: currentActivityLevel || 'light',
      currentLevel: currentActivityLevel,
      shouldRecommend: false,
      avgSteps: 0,
      avgExerciseMinutes: 0,
      daysWithExercise: 0,
      daysAnalyzed: sortedLogs.length,
      confidence: 'low',
    };
  }

  // Calculate averages
  const totalSteps = sortedLogs.reduce((sum, log) =>
    sum + (log.healthMetrics?.steps || 0), 0);
  const avgSteps = Math.round(totalSteps / sortedLogs.length);

  const totalExerciseMinutes = sortedLogs.reduce((sum, log) =>
    sum + (log.healthMetrics?.exerciseMinutes || 0), 0);
  const avgExerciseMinutes = Math.round(totalExerciseMinutes / sortedLogs.length);

  // Count days with meaningful exercise (20+ minutes)
  const daysWithExercise = sortedLogs.filter(log =>
    (log.healthMetrics?.exerciseMinutes || 0) >= 20
  ).length;

  // Extrapolate to weekly exercise days
  const weeklyExerciseDays = Math.round((daysWithExercise / sortedLogs.length) * 7);

  // Activity level order for comparison (lower index = lower activity)
  const levelOrder: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'very_active'];

  // Determine level based on steps
  let stepsLevel: ActivityLevel = 'sedentary';
  if (avgSteps >= 12500) {
    stepsLevel = 'very_active';
  } else if (avgSteps >= 10000) {
    stepsLevel = 'active';
  } else if (avgSteps >= 7500) {
    stepsLevel = 'moderate';
  } else if (avgSteps >= 5000) {
    stepsLevel = 'light';
  }

  // Determine level based on exercise days
  let exerciseLevel: ActivityLevel = 'sedentary';
  if (weeklyExerciseDays >= 7) {
    exerciseLevel = 'very_active';
  } else if (weeklyExerciseDays >= 5) {
    exerciseLevel = 'active';
  } else if (weeklyExerciseDays >= 3) {
    exerciseLevel = 'moderate';
  } else if (weeklyExerciseDays >= 1) {
    exerciseLevel = 'light';
  }

  // CONSERVATIVE: Take the LOWER of the two levels
  const stepsIndex = levelOrder.indexOf(stepsLevel);
  const exerciseIndex = levelOrder.indexOf(exerciseLevel);
  const recommendedLevel = levelOrder[Math.min(stepsIndex, exerciseIndex)];

  // Determine confidence based on sample size
  const confidence: 'low' | 'medium' | 'high' =
    sortedLogs.length >= 10 ? 'high' :
    sortedLogs.length >= 5 ? 'medium' : 'low';

  // Should recommend if different from current and we have reasonable confidence
  const shouldRecommend = currentActivityLevel !== recommendedLevel && confidence !== 'low';

  return {
    recommendedLevel,
    currentLevel: currentActivityLevel,
    shouldRecommend,
    avgSteps,
    avgExerciseMinutes,
    daysWithExercise,
    daysAnalyzed: sortedLogs.length,
    confidence,
  };
}

/**
 * Get a human-readable explanation of why a level is recommended
 */
export function getRecommendationReason(analysis: ActivityAnalysis): string {
  const { avgSteps, daysWithExercise, daysAnalyzed, recommendedLevel } = analysis;

  const stepsStr = avgSteps.toLocaleString();
  const exerciseStr = `${daysWithExercise} exercise days`;

  switch (recommendedLevel) {
    case 'very_active':
      return `Your ${stepsStr} daily steps and ${exerciseStr} over the last ${daysAnalyzed} days indicate a very active lifestyle.`;
    case 'active':
      return `With ${stepsStr} daily steps and ${exerciseStr}, you're maintaining an active lifestyle.`;
    case 'moderate':
      return `Your activity data (${stepsStr} steps, ${exerciseStr}) suggests moderate activity.`;
    case 'light':
      return `Based on ${stepsStr} daily steps and ${exerciseStr}, light activity is a good fit.`;
    case 'sedentary':
      return `Your current activity level (${stepsStr} steps) suggests a sedentary lifestyle. Consider adding more movement!`;
  }
}
