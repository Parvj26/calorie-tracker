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
 * Activity level thresholds based on research:
 * - Sedentary: < 5,000 steps/day, no exercise
 * - Light: 5,000-7,500 steps/day, 1-2 exercise days/week
 * - Moderate: 7,500-10,000 steps/day, 3-4 exercise days/week
 * - Active: 10,000-12,500 steps/day, 5-6 exercise days/week
 * - Very Active: > 12,500 steps/day, 7 exercise days/week
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

  // Determine recommended level based on both steps and exercise
  let recommendedLevel: ActivityLevel = 'sedentary';

  if (avgSteps >= 12500 || weeklyExerciseDays >= 6) {
    recommendedLevel = 'very_active';
  } else if (avgSteps >= 10000 || weeklyExerciseDays >= 5) {
    recommendedLevel = 'active';
  } else if (avgSteps >= 7500 || weeklyExerciseDays >= 3) {
    recommendedLevel = 'moderate';
  } else if (avgSteps >= 5000 || weeklyExerciseDays >= 1) {
    recommendedLevel = 'light';
  }

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
