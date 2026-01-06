import { useCallback, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, subDays, parseISO } from 'date-fns';
import { useLocalStorage } from './useLocalStorage';
import { useSupabaseSync } from './useSupabaseSync';
import { useAuth } from '../contexts/AuthContext';
import type { Meal, DailyLog, InBodyScan, WeighIn, UserSettings, HealthMetrics } from '../types';
import { defaultMeals, defaultSettings } from '../data/defaultMeals';

export function useCalorieTracker() {
  const { user } = useAuth();
  const [meals, setMeals] = useLocalStorage<Meal[]>('calorie-tracker-meals', defaultMeals);
  const [dailyLogs, setDailyLogs] = useLocalStorage<DailyLog[]>('calorie-tracker-daily-logs', []);
  const [inBodyScans, setInBodyScans] = useLocalStorage<InBodyScan[]>('calorie-tracker-inbody', []);
  const [weighIns, setWeighIns] = useLocalStorage<WeighIn[]>('calorie-tracker-weighins', []);
  const [settings, setSettings] = useLocalStorage<UserSettings>('calorie-tracker-settings', defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  const {
    syncState,
    loadFromSupabase,
    saveMeal,
    deleteMealFromDb,
    saveDailyLog,
    saveWeighIn,
    deleteWeighInFromDb,
    saveInBodyScan,
    deleteInBodyScanFromDb,
    saveSettings,
  } = useSupabaseSync();

  // Load data from Supabase when user logs in
  useEffect(() => {
    if (user && !isLoaded) {
      loadFromSupabase()
        .then((data) => {
          if (data) {
            if (data.meals.length > 0) setMeals(data.meals);
            if (data.dailyLogs.length > 0) setDailyLogs(data.dailyLogs);
            if (data.weighIns.length > 0) setWeighIns(data.weighIns);
            if (data.inBodyScans.length > 0) setInBodyScans(data.inBodyScans);
            if (data.settings) setSettings(data.settings);
          }
        })
        .catch((error) => {
          console.error('Failed to load from Supabase:', error);
        })
        .finally(() => {
          setIsLoaded(true);
        });
    }
  }, [user, isLoaded, loadFromSupabase, setMeals, setDailyLogs, setWeighIns, setInBodyScans, setSettings]);

  // Get today's date in YYYY-MM-DD format
  const today = format(new Date(), 'yyyy-MM-dd');

  // Get or create today's log
  const getTodayLog = useCallback((): DailyLog => {
    const existingLog = dailyLogs.find((log) => log.date === today);
    return existingLog || { date: today, meals: [], workoutCalories: 0 };
  }, [dailyLogs, today]);

  // Get log for a specific date
  const getLogForDate = useCallback((date: string): DailyLog => {
    const existingLog = dailyLogs.find((log) => log.date === date);
    return existingLog || { date, meals: [], workoutCalories: 0 };
  }, [dailyLogs]);

  // Toggle meal for today
  const toggleMealForDate = useCallback((mealId: string, date: string) => {
    setDailyLogs((prev) => {
      const existingLogIndex = prev.findIndex((log) => log.date === date);
      let updatedLog: DailyLog;

      if (existingLogIndex >= 0) {
        const existingLog = prev[existingLogIndex];
        const mealIndex = existingLog.meals.indexOf(mealId);
        const updatedMeals = mealIndex >= 0
          ? existingLog.meals.filter((id) => id !== mealId)
          : [...existingLog.meals, mealId];

        const updatedLogs = [...prev];
        updatedLog = { ...existingLog, meals: updatedMeals };
        updatedLogs[existingLogIndex] = updatedLog;

        // Sync to Supabase
        if (user) saveDailyLog(updatedLog);

        return updatedLogs;
      } else {
        updatedLog = { date, meals: [mealId], workoutCalories: 0 };

        // Sync to Supabase
        if (user) saveDailyLog(updatedLog);

        return [...prev, updatedLog];
      }
    });
  }, [setDailyLogs, user, saveDailyLog]);

  // Update workout calories for a date
  const updateWorkoutCalories = useCallback((calories: number, date: string) => {
    setDailyLogs((prev) => {
      const existingLogIndex = prev.findIndex((log) => log.date === date);
      let updatedLog: DailyLog;

      if (existingLogIndex >= 0) {
        const updatedLogs = [...prev];
        updatedLog = { ...prev[existingLogIndex], workoutCalories: calories };
        updatedLogs[existingLogIndex] = updatedLog;
        if (user) saveDailyLog(updatedLog);
        return updatedLogs;
      } else {
        updatedLog = { date, meals: [], workoutCalories: calories };
        if (user) saveDailyLog(updatedLog);
        return [...prev, updatedLog];
      }
    });
  }, [setDailyLogs, user, saveDailyLog]);

  // Update health metrics for a date (from Apple Health import)
  const updateHealthMetrics = useCallback((metrics: HealthMetrics, date: string) => {
    setDailyLogs((prev) => {
      const existingLogIndex = prev.findIndex((log) => log.date === date);
      let updatedLog: DailyLog;

      if (existingLogIndex >= 0) {
        const updatedLogs = [...prev];
        updatedLog = {
          ...prev[existingLogIndex],
          healthMetrics: metrics,
          workoutCalories: metrics.activeEnergy || prev[existingLogIndex].workoutCalories,
        };
        updatedLogs[existingLogIndex] = updatedLog;
        if (user) saveDailyLog(updatedLog);
        return updatedLogs;
      } else {
        updatedLog = {
          date,
          meals: [],
          workoutCalories: metrics.activeEnergy || 0,
          healthMetrics: metrics,
        };
        if (user) saveDailyLog(updatedLog);
        return [...prev, updatedLog];
      }
    });
  }, [setDailyLogs, user, saveDailyLog]);

  // Add custom meal
  const addMeal = useCallback((meal: Omit<Meal, 'id' | 'isCustom'>) => {
    const newMeal: Meal = {
      ...meal,
      id: uuidv4(),
      isCustom: true,
    };
    setMeals((prev) => [...prev, newMeal]);
    if (user) saveMeal(newMeal);
    return newMeal;
  }, [setMeals, user, saveMeal]);

  // Log a scanned meal (add as temporary and log to date)
  const logScannedMeal = useCallback((meal: Omit<Meal, 'id' | 'isCustom'>, date: string) => {
    const newMeal: Meal = {
      ...meal,
      id: uuidv4(),
      isCustom: true,
    };
    setMeals((prev) => [...prev, newMeal]);
    if (user) saveMeal(newMeal);

    // Also add to the daily log
    setDailyLogs((prev) => {
      const existingLogIndex = prev.findIndex((log) => log.date === date);
      let updatedLog: DailyLog;

      if (existingLogIndex >= 0) {
        const existingLog = prev[existingLogIndex];
        const updatedLogs = [...prev];
        updatedLog = {
          ...existingLog,
          meals: [...existingLog.meals, newMeal.id],
        };
        updatedLogs[existingLogIndex] = updatedLog;
        if (user) saveDailyLog(updatedLog);
        return updatedLogs;
      } else {
        updatedLog = { date, meals: [newMeal.id], workoutCalories: 0 };
        if (user) saveDailyLog(updatedLog);
        return [...prev, updatedLog];
      }
    });

    return newMeal;
  }, [setMeals, setDailyLogs, user, saveMeal, saveDailyLog]);

  // Save meal to library and log to date
  const saveAndLogMeal = useCallback((meal: Omit<Meal, 'id' | 'isCustom'>, date: string) => {
    return logScannedMeal(meal, date);
  }, [logScannedMeal]);

  // Delete meal
  const deleteMeal = useCallback((mealId: string) => {
    setMeals((prev) => prev.filter((meal) => meal.id !== mealId));
    if (user) deleteMealFromDb(mealId);
    // Also remove from all daily logs
    setDailyLogs((prev) =>
      prev.map((log) => {
        const updatedLog = {
          ...log,
          meals: log.meals.filter((id) => id !== mealId),
        };
        if (user) saveDailyLog(updatedLog);
        return updatedLog;
      })
    );
  }, [setMeals, setDailyLogs, user, deleteMealFromDb, saveDailyLog]);

  // Add InBody scan - also automatically adds weight to weigh-ins
  const addInBodyScan = useCallback((scan: Omit<InBodyScan, 'id'>) => {
    const newScan: InBodyScan = {
      ...scan,
      id: uuidv4(),
    };
    setInBodyScans((prev) => [...prev, newScan].sort((a, b) => b.date.localeCompare(a.date)));
    if (user) saveInBodyScan(newScan);

    // Automatically add weight to weigh-ins
    if (scan.weight > 0) {
      const weighIn = { date: scan.date, weight: scan.weight };
      setWeighIns((prev) => {
        const existingIndex = prev.findIndex((w) => w.date === scan.date);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = weighIn;
          return updated.sort((a, b) => a.date.localeCompare(b.date));
        }
        return [...prev, weighIn].sort((a, b) => a.date.localeCompare(b.date));
      });
      if (user) saveWeighIn(weighIn);
    }

    return newScan;
  }, [setInBodyScans, setWeighIns, user, saveInBodyScan, saveWeighIn]);

  // Delete InBody scan
  const deleteInBodyScan = useCallback((scanId: string) => {
    setInBodyScans((prev) => prev.filter((scan) => scan.id !== scanId));
    if (user) deleteInBodyScanFromDb(scanId);
  }, [setInBodyScans, user, deleteInBodyScanFromDb]);

  // Add weigh-in
  const addWeighIn = useCallback((weighIn: WeighIn) => {
    setWeighIns((prev) => {
      const existingIndex = prev.findIndex((w) => w.date === weighIn.date);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = weighIn;
        return updated.sort((a, b) => a.date.localeCompare(b.date));
      }
      return [...prev, weighIn].sort((a, b) => a.date.localeCompare(b.date));
    });
    if (user) saveWeighIn(weighIn);
  }, [setWeighIns, user, saveWeighIn]);

  // Delete weigh-in
  const deleteWeighIn = useCallback((date: string) => {
    setWeighIns((prev) => prev.filter((w) => w.date !== date));
    if (user) deleteWeighInFromDb(date);
  }, [setWeighIns, user, deleteWeighInFromDb]);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<UserSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if (user) saveSettings(updated);
      return updated;
    });
  }, [setSettings, user, saveSettings]);

  // Calculate totals for a log
  const calculateTotals = useCallback((log: DailyLog) => {
    const logMeals = log.meals.map((id) => meals.find((m) => m.id === id)).filter(Boolean) as Meal[];

    const totals = logMeals.reduce(
      (acc, meal) => ({
        calories: acc.calories + meal.calories,
        protein: acc.protein + meal.protein,
        carbs: acc.carbs + meal.carbs,
        fat: acc.fat + meal.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const targetCalories = (settings.dailyCalorieTargetMin + settings.dailyCalorieTargetMax) / 2;

    // Use health metrics if available for more accurate calculations
    const healthMetrics = log.healthMetrics;
    const restingEnergy = healthMetrics?.restingEnergy || 0;
    const activeEnergy = healthMetrics?.activeEnergy || log.workoutCalories;
    const tdee = restingEnergy + activeEnergy; // Total Daily Energy Expenditure
    const hasTDEE = restingEnergy > 0 && activeEnergy > 0;

    // If we have TDEE data, calculate true deficit based on actual burn
    // Otherwise fall back to target-based calculation
    const netCalories = totals.calories - activeEnergy;
    const trueDeficit = hasTDEE ? (tdee - totals.calories) : 0;
    const deficit = hasTDEE ? trueDeficit : (targetCalories - netCalories);
    const caloriesRemaining = hasTDEE
      ? (tdee - totals.calories)
      : (targetCalories - totals.calories + activeEnergy);

    return {
      ...totals,
      workoutCalories: activeEnergy,
      netCalories,
      deficit,
      caloriesRemaining,
      targetCalories,
      // New health-based fields
      restingEnergy,
      activeEnergy,
      tdee,
      hasTDEE,
      trueDeficit,
      steps: healthMetrics?.steps || 0,
      exerciseMinutes: healthMetrics?.exerciseMinutes || 0,
    };
  }, [meals, settings]);

  // Get weekly summary
  const getWeeklySummary = useCallback(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const weekLogs = daysInWeek.map((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      return getLogForDate(dateStr);
    });

    const logsWithData = weekLogs.filter((log) => log.meals.length > 0 || log.workoutCalories > 0);

    if (logsWithData.length === 0) {
      return null;
    }

    const totals = logsWithData.map((log) => calculateTotals(log));
    const avgCalories = totals.reduce((acc, t) => acc + t.calories, 0) / logsWithData.length;
    const avgDeficit = totals.reduce((acc, t) => acc + t.deficit, 0) / logsWithData.length;

    // Get weight change this week
    const weekWeighIns = weighIns.filter((w) => {
      const wDate = parseISO(w.date);
      return wDate >= weekStart && wDate <= weekEnd;
    });

    let weekWeightChange = 0;
    if (weekWeighIns.length >= 2) {
      const sorted = [...weekWeighIns].sort((a, b) => a.date.localeCompare(b.date));
      weekWeightChange = sorted[sorted.length - 1].weight - sorted[0].weight;
    }

    // Project time to goal
    const latestWeight = weighIns.length > 0
      ? weighIns[weighIns.length - 1].weight
      : settings.startWeight;
    const weightToLose = latestWeight - settings.goalWeight;

    // Assuming 7700 calories = 1kg
    const dailyDeficitForGoal = avgDeficit > 0 ? avgDeficit : 500;
    const daysToGoal = (weightToLose * 7700) / dailyDeficitForGoal;
    const weeksToGoal = Math.ceil(daysToGoal / 7);

    return {
      avgCalories: Math.round(avgCalories),
      avgDeficit: Math.round(avgDeficit),
      weekWeightChange: Math.round(weekWeightChange * 10) / 10,
      weeksToGoal,
      daysLogged: logsWithData.length,
      latestWeight,
      weightToLose: Math.round(weightToLose * 10) / 10,
    };
  }, [dailyLogs, weighIns, settings, calculateTotals, getLogForDate]);

  // Get progress data for charts
  const getProgressData = useCallback(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = subDays(new Date(), 29 - i);
      return format(date, 'yyyy-MM-dd');
    });

    const calorieData = last30Days.map((date) => {
      const log = getLogForDate(date);
      const totals = calculateTotals(log);
      return {
        date,
        displayDate: format(parseISO(date), 'MMM d'),
        calories: totals.calories,
        target: totals.targetCalories,
        deficit: totals.deficit,
      };
    });

    const weightData = weighIns
      .filter((w) => {
        const wDate = parseISO(w.date);
        const thirtyDaysAgo = subDays(new Date(), 30);
        return wDate >= thirtyDaysAgo;
      })
      .map((w) => ({
        date: w.date,
        displayDate: format(parseISO(w.date), 'MMM d'),
        weight: w.weight,
        goal: settings.goalWeight,
      }));

    const bodyCompData = inBodyScans.map((scan) => ({
      date: scan.date,
      displayDate: format(parseISO(scan.date), 'MMM d'),
      weight: scan.weight,
      bodyFat: scan.bodyFatPercent,
      muscleMass: scan.muscleMass,
      skeletalMuscle: scan.skeletalMuscle,
    }));

    // Steps data from health metrics
    const stepsData = last30Days.map((date) => {
      const log = getLogForDate(date);
      const steps = log.healthMetrics?.steps || 0;
      return {
        date,
        displayDate: format(parseISO(date), 'MMM d'),
        steps,
      };
    }).filter((d) => d.steps > 0);

    // Calculate steps stats
    const daysWithSteps = stepsData.filter((d) => d.steps > 0);
    const avgSteps = daysWithSteps.length > 0
      ? Math.round(daysWithSteps.reduce((acc, d) => acc + d.steps, 0) / daysWithSteps.length)
      : 0;
    const maxSteps = daysWithSteps.length > 0
      ? Math.max(...daysWithSteps.map((d) => d.steps))
      : 0;
    const totalSteps = daysWithSteps.reduce((acc, d) => acc + d.steps, 0);

    // Calculate current streak (consecutive days with 10k+ steps)
    let currentStreak = 0;
    const sortedByDateDesc = [...stepsData].sort((a, b) => b.date.localeCompare(a.date));
    for (const day of sortedByDateDesc) {
      if (day.steps >= 10000) {
        currentStreak++;
      } else {
        break;
      }
    }

    return {
      calorieData,
      weightData,
      bodyCompData,
      stepsData,
      stepsStats: {
        avgSteps,
        maxSteps,
        totalSteps,
        currentStreak,
        daysTracked: daysWithSteps.length,
      },
    };
  }, [dailyLogs, weighIns, inBodyScans, settings, calculateTotals, getLogForDate]);

  // Get progress towards goal
  const getGoalProgress = useCallback(() => {
    const latestWeight = weighIns.length > 0
      ? weighIns[weighIns.length - 1].weight
      : settings.startWeight;

    const totalToLose = settings.startWeight - settings.goalWeight;
    const lost = settings.startWeight - latestWeight;
    const progress = totalToLose > 0 ? (lost / totalToLose) * 100 : 0;

    return {
      startWeight: settings.startWeight,
      currentWeight: latestWeight,
      goalWeight: settings.goalWeight,
      weightLost: Math.round(lost * 10) / 10,
      weightRemaining: Math.round((latestWeight - settings.goalWeight) * 10) / 10,
      progressPercent: Math.min(100, Math.max(0, Math.round(progress))),
    };
  }, [weighIns, settings]);

  // Get latest InBody metrics
  const getLatestInBodyMetrics = useCallback(() => {
    if (inBodyScans.length === 0) return null;

    // Scans are sorted by date descending, so first one is latest
    const latest = inBodyScans[0];

    // Get previous scan for comparison
    const previous = inBodyScans.length > 1 ? inBodyScans[1] : null;

    return {
      weight: latest.weight,
      bodyFatPercent: latest.bodyFatPercent,
      muscleMass: latest.muscleMass,
      skeletalMuscle: latest.skeletalMuscle,
      date: latest.date,
      changes: previous ? {
        weight: Math.round((latest.weight - previous.weight) * 10) / 10,
        bodyFat: Math.round((latest.bodyFatPercent - previous.bodyFatPercent) * 10) / 10,
        muscleMass: Math.round((latest.muscleMass - previous.muscleMass) * 10) / 10,
        skeletalMuscle: Math.round((latest.skeletalMuscle - previous.skeletalMuscle) * 10) / 10,
      } : null,
    };
  }, [inBodyScans]);

  return {
    // Data
    meals,
    dailyLogs,
    inBodyScans,
    weighIns,
    settings,
    today,
    syncState,

    // Daily log operations
    getTodayLog,
    getLogForDate,
    toggleMealForDate,
    updateWorkoutCalories,
    updateHealthMetrics,
    calculateTotals,

    // Meal operations
    addMeal,
    deleteMeal,
    logScannedMeal,
    saveAndLogMeal,

    // InBody operations
    addInBodyScan,
    deleteInBodyScan,

    // Weigh-in operations
    addWeighIn,
    deleteWeighIn,

    // Settings
    updateSettings,

    // Analytics
    getWeeklySummary,
    getProgressData,
    getGoalProgress,
    getLatestInBodyMetrics,
  };
}
