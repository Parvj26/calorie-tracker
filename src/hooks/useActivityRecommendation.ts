/**
 * Hook to analyze activity data and recommend activity level updates
 */

import { useMemo } from 'react';
import type { DailyLog, ActivityLevel } from '../types';
import { analyzeActivityLevel, type ActivityAnalysis } from '../utils/activityRecommendation';

export function useActivityRecommendation(
  dailyLogs: DailyLog[],
  currentActivityLevel: ActivityLevel | undefined
): ActivityAnalysis {
  return useMemo(
    () => analyzeActivityLevel(dailyLogs, currentActivityLevel),
    [dailyLogs, currentActivityLevel]
  );
}
