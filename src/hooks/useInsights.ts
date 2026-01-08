import { useState, useCallback, useMemo } from 'react';
import { format, startOfWeek, startOfMonth } from 'date-fns';
import type {
  DailyLog,
  WeighIn,
  InBodyScan,
  UserSettings,
  UserProfile,
  DailyInsights,
  WeeklyInsights,
  MonthlyInsights,
} from '../types';
import {
  generateDailyInsights,
  generateWeeklyInsights,
  generateMonthlyInsights,
} from '../utils/groq';

interface DailyTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
}

interface CachedInsight<T> {
  data: T;
  cachedAt: string;
  key: string;
}

const CACHE_TTL = {
  daily: 4 * 60 * 60 * 1000,    // 4 hours
  weekly: 24 * 60 * 60 * 1000,  // 24 hours
  monthly: 24 * 60 * 60 * 1000, // 24 hours
};

function getCacheKey(type: 'daily' | 'weekly' | 'monthly', date: string): string {
  const d = new Date(date);
  switch (type) {
    case 'daily':
      return `caltrack_insights_daily_${format(d, 'yyyy-MM-dd')}`;
    case 'weekly':
      return `caltrack_insights_weekly_${format(startOfWeek(d), 'yyyy-MM-dd')}`;
    case 'monthly':
      return `caltrack_insights_monthly_${format(startOfMonth(d), 'yyyy-MM')}`;
  }
}

function getFromCache<T>(key: string, ttl: number): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const parsed: CachedInsight<T> = JSON.parse(cached);
    const cachedTime = new Date(parsed.cachedAt).getTime();
    const now = Date.now();

    if (now - cachedTime > ttl) {
      localStorage.removeItem(key);
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}

function saveToCache<T>(key: string, data: T): void {
  try {
    const cached: CachedInsight<T> = {
      data,
      cachedAt: new Date().toISOString(),
      key,
    };
    localStorage.setItem(key, JSON.stringify(cached));
  } catch (error) {
    console.error('Failed to cache insights:', error);
  }
}

interface UseInsightsParams {
  dailyLogs: DailyLog[];
  weighIns: WeighIn[];
  inBodyScans: InBodyScan[];
  settings: UserSettings;
  profile: UserProfile | null;
  selectedDate: string;
  todayTotals: DailyTotals;
}

interface InsightState<T> {
  insights: T | null;
  loading: boolean;
  error: string | null;
}

export function useInsights({
  dailyLogs,
  weighIns,
  inBodyScans,
  settings,
  profile,
  selectedDate,
  todayTotals,
}: UseInsightsParams) {
  const [dailyState, setDailyState] = useState<InsightState<DailyInsights>>({
    insights: null,
    loading: false,
    error: null,
  });

  const [weeklyState, setWeeklyState] = useState<InsightState<WeeklyInsights>>({
    insights: null,
    loading: false,
    error: null,
  });

  const [monthlyState, setMonthlyState] = useState<InsightState<MonthlyInsights>>({
    insights: null,
    loading: false,
    error: null,
  });

  // Get API keys based on provider
  const apiKey = useMemo(() => {
    const provider = settings.aiProvider || 'groq';
    return provider === 'groq' ? settings.groqApiKey : settings.openAiApiKey;
  }, [settings.aiProvider, settings.groqApiKey, settings.openAiApiKey]);

  const backupApiKey = useMemo(() => {
    const provider = settings.aiProvider || 'groq';
    return provider === 'groq' ? settings.groqApiKeyBackup : undefined;
  }, [settings.aiProvider, settings.groqApiKeyBackup]);

  const hasApiKey = Boolean(apiKey);

  // Generate daily insights
  const generateDaily = useCallback(async (forceRefresh = false) => {
    if (!apiKey) {
      setDailyState(prev => ({ ...prev, error: 'API key not configured' }));
      return;
    }

    const cacheKey = getCacheKey('daily', selectedDate);

    // Check cache first
    if (!forceRefresh) {
      const cached = getFromCache<DailyInsights>(cacheKey, CACHE_TTL.daily);
      if (cached) {
        setDailyState({ insights: cached, loading: false, error: null });
        return;
      }
    }

    setDailyState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const todayLog = dailyLogs.find(log => log.date === selectedDate);
      const insights = await generateDailyInsights(
        todayLog,
        todayTotals,
        settings,
        profile,
        apiKey,
        backupApiKey
      );

      saveToCache(cacheKey, insights);
      setDailyState({ insights, loading: false, error: null });
    } catch (error) {
      setDailyState({
        insights: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to generate insights',
      });
    }
  }, [apiKey, backupApiKey, selectedDate, dailyLogs, todayTotals, settings, profile]);

  // Generate weekly insights
  const generateWeekly = useCallback(async (forceRefresh = false) => {
    if (!apiKey) {
      setWeeklyState(prev => ({ ...prev, error: 'API key not configured' }));
      return;
    }

    const cacheKey = getCacheKey('weekly', selectedDate);

    // Check cache first
    if (!forceRefresh) {
      const cached = getFromCache<WeeklyInsights>(cacheKey, CACHE_TTL.weekly);
      if (cached) {
        setWeeklyState({ insights: cached, loading: false, error: null });
        return;
      }
    }

    setWeeklyState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const insights = await generateWeeklyInsights(
        dailyLogs,
        weighIns,
        settings,
        profile,
        apiKey,
        backupApiKey
      );

      saveToCache(cacheKey, insights);
      setWeeklyState({ insights, loading: false, error: null });
    } catch (error) {
      setWeeklyState({
        insights: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to generate insights',
      });
    }
  }, [apiKey, backupApiKey, selectedDate, dailyLogs, weighIns, settings, profile]);

  // Generate monthly insights
  const generateMonthly = useCallback(async (forceRefresh = false) => {
    if (!apiKey) {
      setMonthlyState(prev => ({ ...prev, error: 'API key not configured' }));
      return;
    }

    const cacheKey = getCacheKey('monthly', selectedDate);

    // Check cache first
    if (!forceRefresh) {
      const cached = getFromCache<MonthlyInsights>(cacheKey, CACHE_TTL.monthly);
      if (cached) {
        setMonthlyState({ insights: cached, loading: false, error: null });
        return;
      }
    }

    setMonthlyState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const insights = await generateMonthlyInsights(
        dailyLogs,
        weighIns,
        inBodyScans,
        settings,
        profile,
        apiKey,
        backupApiKey
      );

      saveToCache(cacheKey, insights);
      setMonthlyState({ insights, loading: false, error: null });
    } catch (error) {
      setMonthlyState({
        insights: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to generate insights',
      });
    }
  }, [apiKey, backupApiKey, selectedDate, dailyLogs, weighIns, inBodyScans, settings, profile]);

  return {
    hasApiKey,
    daily: {
      ...dailyState,
      generate: generateDaily,
    },
    weekly: {
      ...weeklyState,
      generate: generateWeekly,
    },
    monthly: {
      ...monthlyState,
      generate: generateMonthly,
    },
  };
}
