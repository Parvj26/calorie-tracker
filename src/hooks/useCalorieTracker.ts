import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, subDays, parseISO } from 'date-fns';
import { useLocalStorage } from './useLocalStorage';
import type { Meal, DailyLog, InBodyScan, WeighIn, UserSettings } from '../types';
import { defaultMeals, defaultSettings } from '../data/defaultMeals';

export function useCalorieTracker() {
  const [meals, setMeals] = useLocalStorage<Meal[]>('calorie-tracker-meals', defaultMeals);
  const [dailyLogs, setDailyLogs] = useLocalStorage<DailyLog[]>('calorie-tracker-daily-logs', []);
  const [inBodyScans, setInBodyScans] = useLocalStorage<InBodyScan[]>('calorie-tracker-inbody', []);
  const [weighIns, setWeighIns] = useLocalStorage<WeighIn[]>('calorie-tracker-weighins', []);
  const [settings, setSettings] = useLocalStorage<UserSettings>('calorie-tracker-settings', defaultSettings);

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

      if (existingLogIndex >= 0) {
        const existingLog = prev[existingLogIndex];
        const mealIndex = existingLog.meals.indexOf(mealId);
        const updatedMeals = mealIndex >= 0
          ? existingLog.meals.filter((id) => id !== mealId)
          : [...existingLog.meals, mealId];

        const updatedLogs = [...prev];
        updatedLogs[existingLogIndex] = { ...existingLog, meals: updatedMeals };
        return updatedLogs;
      } else {
        return [...prev, { date, meals: [mealId], workoutCalories: 0 }];
      }
    });
  }, [setDailyLogs]);

  // Update workout calories for a date
  const updateWorkoutCalories = useCallback((calories: number, date: string) => {
    setDailyLogs((prev) => {
      const existingLogIndex = prev.findIndex((log) => log.date === date);

      if (existingLogIndex >= 0) {
        const updatedLogs = [...prev];
        updatedLogs[existingLogIndex] = { ...prev[existingLogIndex], workoutCalories: calories };
        return updatedLogs;
      } else {
        return [...prev, { date, meals: [], workoutCalories: calories }];
      }
    });
  }, [setDailyLogs]);

  // Add custom meal
  const addMeal = useCallback((meal: Omit<Meal, 'id' | 'isCustom'>) => {
    const newMeal: Meal = {
      ...meal,
      id: uuidv4(),
      isCustom: true,
    };
    setMeals((prev) => [...prev, newMeal]);
    return newMeal;
  }, [setMeals]);

  // Log a scanned meal (add as temporary and log to date)
  const logScannedMeal = useCallback((meal: Omit<Meal, 'id' | 'isCustom'>, date: string) => {
    const newMeal: Meal = {
      ...meal,
      id: uuidv4(),
      isCustom: true,
    };
    setMeals((prev) => [...prev, newMeal]);

    // Also add to the daily log
    setDailyLogs((prev) => {
      const existingLogIndex = prev.findIndex((log) => log.date === date);

      if (existingLogIndex >= 0) {
        const existingLog = prev[existingLogIndex];
        const updatedLogs = [...prev];
        updatedLogs[existingLogIndex] = {
          ...existingLog,
          meals: [...existingLog.meals, newMeal.id],
        };
        return updatedLogs;
      } else {
        return [...prev, { date, meals: [newMeal.id], workoutCalories: 0 }];
      }
    });

    return newMeal;
  }, [setMeals, setDailyLogs]);

  // Save meal to library and log to date
  const saveAndLogMeal = useCallback((meal: Omit<Meal, 'id' | 'isCustom'>, date: string) => {
    return logScannedMeal(meal, date);
  }, [logScannedMeal]);

  // Delete meal
  const deleteMeal = useCallback((mealId: string) => {
    setMeals((prev) => prev.filter((meal) => meal.id !== mealId));
    // Also remove from all daily logs
    setDailyLogs((prev) =>
      prev.map((log) => ({
        ...log,
        meals: log.meals.filter((id) => id !== mealId),
      }))
    );
  }, [setMeals, setDailyLogs]);

  // Add InBody scan
  const addInBodyScan = useCallback((scan: Omit<InBodyScan, 'id'>) => {
    const newScan: InBodyScan = {
      ...scan,
      id: uuidv4(),
    };
    setInBodyScans((prev) => [...prev, newScan].sort((a, b) => b.date.localeCompare(a.date)));
    return newScan;
  }, [setInBodyScans]);

  // Delete InBody scan
  const deleteInBodyScan = useCallback((scanId: string) => {
    setInBodyScans((prev) => prev.filter((scan) => scan.id !== scanId));
  }, [setInBodyScans]);

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
  }, [setWeighIns]);

  // Delete weigh-in
  const deleteWeighIn = useCallback((date: string) => {
    setWeighIns((prev) => prev.filter((w) => w.date !== date));
  }, [setWeighIns]);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, [setSettings]);

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
    const netCalories = totals.calories - log.workoutCalories;
    const deficit = targetCalories - netCalories;
    const caloriesRemaining = targetCalories - totals.calories + log.workoutCalories;

    return {
      ...totals,
      workoutCalories: log.workoutCalories,
      netCalories,
      deficit,
      caloriesRemaining,
      targetCalories,
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

    return { calorieData, weightData, bodyCompData };
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

  return {
    // Data
    meals,
    dailyLogs,
    inBodyScans,
    weighIns,
    settings,
    today,

    // Daily log operations
    getTodayLog,
    getLogForDate,
    toggleMealForDate,
    updateWorkoutCalories,
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
  };
}
