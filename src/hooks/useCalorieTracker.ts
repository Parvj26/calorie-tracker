import { useCallback, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, subDays, parseISO } from 'date-fns';
import { useLocalStorage } from './useLocalStorage';
import { useSupabaseSync } from './useSupabaseSync';
import { useAuth } from '../contexts/AuthContext';
import type { Meal, DailyLog, InBodyScan, WeighIn, UserSettings, HealthMetrics, MealLogEntry, MasterMealLogEntry, QuantityUnit } from '../types';
import { defaultMeals, defaultSettings } from '../data/defaultMeals';

// Helper functions for meal entries with quantity
const getMealId = (entry: string | MealLogEntry): string => {
  return typeof entry === 'string' ? entry : entry.mealId;
};

const getMealQuantity = (entry: string | MealLogEntry): number => {
  return typeof entry === 'string' ? 1 : entry.quantity;
};

const getMealUnit = (entry: string | MealLogEntry): QuantityUnit => {
  return typeof entry === 'string' ? 'serving' : (entry.unit || 'serving');
};

const getMasterMealId = (entry: string | MasterMealLogEntry): string => {
  return typeof entry === 'string' ? entry : entry.mealId;
};

const getMasterMealQuantity = (entry: string | MasterMealLogEntry): number => {
  return typeof entry === 'string' ? 1 : entry.quantity;
};

const getMasterMealUnit = (entry: string | MasterMealLogEntry): QuantityUnit => {
  return typeof entry === 'string' ? 'serving' : (entry.unit || 'serving');
};

// Convert quantity to serving multiplier based on unit
const getServingMultiplier = (quantity: number, unit: QuantityUnit, servingSize?: number): number => {
  if (unit === 'serving') return quantity;

  // For unit-based quantities, we need servingSize to convert
  const size = servingSize || 100; // Default to 100g if not specified

  if (unit === 'g') return quantity / size;
  if (unit === 'oz') return (quantity * 28.35) / size; // 1 oz = 28.35g
  if (unit === 'ml') return quantity / size; // Assume 1ml = 1g for simplicity

  return quantity;
};

export function useCalorieTracker() {
  const { user } = useAuth();
  const [meals, setMeals] = useLocalStorage<Meal[]>('calorie-tracker-meals', defaultMeals);
  const [deletedMeals, setDeletedMeals] = useLocalStorage<Meal[]>('calorie-tracker-deleted-meals', []);
  const [dailyLogs, setDailyLogs] = useLocalStorage<DailyLog[]>('calorie-tracker-daily-logs', []);
  const [inBodyScans, setInBodyScans] = useLocalStorage<InBodyScan[]>('calorie-tracker-inbody', []);
  const [weighIns, setWeighIns] = useLocalStorage<WeighIn[]>('calorie-tracker-weighins', []);
  const [settings, setSettings] = useLocalStorage<UserSettings>('calorie-tracker-settings', defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  const {
    syncState,
    loadFromSupabase,
    saveMeal,
    softDeleteMeal,
    restoreMealDb,
    permanentDeleteMeal,
    purgeExpiredMeals,
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
            // Separate active and deleted meals
            const activeMeals = data.meals.filter((m) => !m.deletedAt);
            const trashedMeals = data.meals.filter((m) => m.deletedAt);

            if (activeMeals.length > 0) setMeals(activeMeals);
            if (trashedMeals.length > 0) setDeletedMeals(trashedMeals);

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
  }, [user, isLoaded, loadFromSupabase, setMeals, setDeletedMeals, setDailyLogs, setWeighIns, setInBodyScans, setSettings]);

  // Auto-purge expired deleted meals on load
  useEffect(() => {
    if (user && isLoaded) {
      // Purge from database
      purgeExpiredMeals();

      // Also purge from local state
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      setDeletedMeals((prev) =>
        prev.filter((m) => !m.deletedAt || new Date(m.deletedAt) > thirtyDaysAgo)
      );
    }
  }, [user, isLoaded, purgeExpiredMeals, setDeletedMeals]);

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

  // Toggle meal for today (add with quantity 1 or remove)
  const toggleMealForDate = useCallback((mealId: string, date: string) => {
    setDailyLogs((prev) => {
      const existingLogIndex = prev.findIndex((log) => log.date === date);
      let updatedLog: DailyLog;

      if (existingLogIndex >= 0) {
        const existingLog = prev[existingLogIndex];
        const mealIndex = existingLog.meals.findIndex((entry) => getMealId(entry) === mealId);
        const updatedMeals = mealIndex >= 0
          ? existingLog.meals.filter((entry) => getMealId(entry) !== mealId)
          : [...existingLog.meals, { mealId, quantity: 1 } as MealLogEntry];

        const updatedLogs = [...prev];
        updatedLog = { ...existingLog, meals: updatedMeals };
        updatedLogs[existingLogIndex] = updatedLog;

        // Sync to Supabase
        if (user) saveDailyLog(updatedLog);

        return updatedLogs;
      } else {
        updatedLog = { date, meals: [{ mealId, quantity: 1 }], workoutCalories: 0 };

        // Sync to Supabase
        if (user) saveDailyLog(updatedLog);

        return [...prev, updatedLog];
      }
    });
  }, [setDailyLogs, user, saveDailyLog]);

  // Update meal quantity for a date
  const updateMealQuantity = useCallback((mealId: string, date: string, quantity: number, unit?: QuantityUnit) => {
    setDailyLogs((prev) => {
      const existingLogIndex = prev.findIndex((log) => log.date === date);
      if (existingLogIndex < 0) return prev;

      const existingLog = prev[existingLogIndex];
      const updatedMeals = existingLog.meals.map((entry) => {
        if (getMealId(entry) === mealId) {
          // Preserve existing unit if not provided
          const existingUnit = getMealUnit(entry);
          return { mealId, quantity, unit: unit || existingUnit } as MealLogEntry;
        }
        return entry;
      });

      const updatedLogs = [...prev];
      const updatedLog = { ...existingLog, meals: updatedMeals };
      updatedLogs[existingLogIndex] = updatedLog;

      if (user) saveDailyLog(updatedLog);
      return updatedLogs;
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

    // Also add to the daily log with quantity 1
    setDailyLogs((prev) => {
      const existingLogIndex = prev.findIndex((log) => log.date === date);
      let updatedLog: DailyLog;

      if (existingLogIndex >= 0) {
        const existingLog = prev[existingLogIndex];
        const updatedLogs = [...prev];
        updatedLog = {
          ...existingLog,
          meals: [...existingLog.meals, { mealId: newMeal.id, quantity: 1 }],
        };
        updatedLogs[existingLogIndex] = updatedLog;
        if (user) saveDailyLog(updatedLog);
        return updatedLogs;
      } else {
        updatedLog = { date, meals: [{ mealId: newMeal.id, quantity: 1 }], workoutCalories: 0 };
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

  // Delete meal (soft delete - moves to trash)
  const deleteMeal = useCallback((mealId: string) => {
    // Find the meal to soft delete
    const mealToDelete = meals.find((m) => m.id === mealId);
    if (!mealToDelete) return;

    // Add deletion timestamp and move to deleted meals
    const deletedMeal: Meal = {
      ...mealToDelete,
      deletedAt: new Date().toISOString(),
    };

    // Remove from active meals
    setMeals((prev) => prev.filter((meal) => meal.id !== mealId));

    // Add to deleted meals
    setDeletedMeals((prev) => [...prev, deletedMeal]);

    // Sync to Supabase (soft delete)
    if (user) softDeleteMeal(mealId);

    // Also remove from all daily logs
    setDailyLogs((prev) =>
      prev.map((log) => {
        const updatedLog = {
          ...log,
          meals: log.meals.filter((entry) => getMealId(entry) !== mealId),
        };
        if (user) saveDailyLog(updatedLog);
        return updatedLog;
      })
    );
  }, [meals, setMeals, setDeletedMeals, setDailyLogs, user, softDeleteMeal, saveDailyLog]);

  // Restore meal from trash (to library only, not daily logs)
  const restoreMeal = useCallback((mealId: string) => {
    // Find the deleted meal
    const mealToRestore = deletedMeals.find((m) => m.id === mealId);
    if (!mealToRestore) return;

    // Remove deletion timestamp
    const restoredMeal: Meal = {
      ...mealToRestore,
      deletedAt: undefined,
    };

    // Remove from deleted meals
    setDeletedMeals((prev) => prev.filter((m) => m.id !== mealId));

    // Add back to active meals
    setMeals((prev) => [...prev, restoredMeal]);

    // Sync to Supabase
    if (user) restoreMealDb(mealId);
  }, [deletedMeals, setDeletedMeals, setMeals, user, restoreMealDb]);

  // Permanently delete meal (hard delete from trash)
  const permanentlyDeleteMeal = useCallback((mealId: string) => {
    // Remove from deleted meals
    setDeletedMeals((prev) => prev.filter((m) => m.id !== mealId));

    // Hard delete from database
    if (user) permanentDeleteMeal(mealId);
  }, [setDeletedMeals, user, permanentDeleteMeal]);

  // Calculate days until a deleted meal expires
  const getDaysUntilExpiry = useCallback((deletedAt: string): number => {
    const expiryDate = new Date(deletedAt);
    expiryDate.setDate(expiryDate.getDate() + 30);
    const diffDays = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }, []);

  // Add a master meal to a daily log
  const addMasterMealToLog = useCallback((masterMealId: string, date: string) => {
    setDailyLogs((prev) => {
      const existingLogIndex = prev.findIndex((log) => log.date === date);
      let updatedLog: DailyLog;

      if (existingLogIndex >= 0) {
        const existingLog = prev[existingLogIndex];
        // Check if already added
        const alreadyExists = existingLog.masterMealIds?.some(
          (entry) => getMasterMealId(entry) === masterMealId
        );
        if (alreadyExists) {
          return prev;
        }
        updatedLog = {
          ...existingLog,
          masterMealIds: [...(existingLog.masterMealIds || []), { mealId: masterMealId, quantity: 1 }],
        };
        const updatedLogs = [...prev];
        updatedLogs[existingLogIndex] = updatedLog;
        if (user) saveDailyLog(updatedLog);
        return updatedLogs;
      } else {
        updatedLog = {
          date,
          meals: [],
          masterMealIds: [{ mealId: masterMealId, quantity: 1 }],
          workoutCalories: 0,
        };
        if (user) saveDailyLog(updatedLog);
        return [...prev, updatedLog];
      }
    });
  }, [setDailyLogs, user, saveDailyLog]);

  // Remove a master meal from a daily log
  const removeMasterMealFromLog = useCallback((masterMealId: string, date: string) => {
    setDailyLogs((prev) => {
      const existingLogIndex = prev.findIndex((log) => log.date === date);
      if (existingLogIndex < 0) return prev;

      const existingLog = prev[existingLogIndex];
      const updatedLog = {
        ...existingLog,
        masterMealIds: (existingLog.masterMealIds || []).filter(
          (entry) => getMasterMealId(entry) !== masterMealId
        ),
      };
      const updatedLogs = [...prev];
      updatedLogs[existingLogIndex] = updatedLog;
      if (user) saveDailyLog(updatedLog);
      return updatedLogs;
    });
  }, [setDailyLogs, user, saveDailyLog]);

  // Update master meal quantity for a date
  const updateMasterMealQuantity = useCallback((masterMealId: string, date: string, quantity: number, unit?: QuantityUnit) => {
    setDailyLogs((prev) => {
      const existingLogIndex = prev.findIndex((log) => log.date === date);
      if (existingLogIndex < 0) return prev;

      const existingLog = prev[existingLogIndex];
      const updatedMasterMeals = (existingLog.masterMealIds || []).map((entry) => {
        if (getMasterMealId(entry) === masterMealId) {
          // Preserve existing unit if not provided
          const existingUnit = getMasterMealUnit(entry);
          return { mealId: masterMealId, quantity, unit: unit || existingUnit } as MasterMealLogEntry;
        }
        return entry;
      });

      const updatedLogs = [...prev];
      const updatedLog = { ...existingLog, masterMealIds: updatedMasterMeals };
      updatedLogs[existingLogIndex] = updatedLog;

      if (user) saveDailyLog(updatedLog);
      return updatedLogs;
    });
  }, [setDailyLogs, user, saveDailyLog]);

  // Save a master meal to user's library (appears in Dashboard meals list)
  const saveMasterMealToLibrary = useCallback((masterMealId: string) => {
    setSettings((prev) => {
      const currentIds = prev.savedMasterMealIds || [];
      if (currentIds.includes(masterMealId)) {
        return prev; // Already saved
      }
      const updated = { ...prev, savedMasterMealIds: [...currentIds, masterMealId] };
      if (user) saveSettings(updated);
      return updated;
    });
  }, [setSettings, user, saveSettings]);

  // Remove a master meal from user's library
  const removeMasterMealFromLibrary = useCallback((masterMealId: string) => {
    setSettings((prev) => {
      const currentIds = prev.savedMasterMealIds || [];
      const updated = { ...prev, savedMasterMealIds: currentIds.filter((id) => id !== masterMealId) };
      if (user) saveSettings(updated);
      return updated;
    });
  }, [setSettings, user, saveSettings]);

  // Toggle favorite status for a meal
  const toggleFavorite = useCallback((mealId: string) => {
    setMeals((prev) => {
      const updatedMeals = prev.map((meal) =>
        meal.id === mealId ? { ...meal, favorite: !meal.favorite } : meal
      );
      // Find the updated meal and save to Supabase
      const updatedMeal = updatedMeals.find((m) => m.id === mealId);
      if (user && updatedMeal) saveMeal(updatedMeal);
      return updatedMeals;
    });
  }, [setMeals, user, saveMeal]);

  // Update an existing meal
  const updateMeal = useCallback((id: string, updates: Partial<Meal>) => {
    setMeals((prev) => {
      const updatedMeals = prev.map((meal) =>
        meal.id === id ? { ...meal, ...updates } : meal
      );
      // Find the updated meal and save to Supabase
      const updatedMeal = updatedMeals.find((m) => m.id === id);
      if (user && updatedMeal) saveMeal(updatedMeal);
      return updatedMeals;
    });
  }, [setMeals, user, saveMeal]);

  // Add InBody scan - replaces existing scan on same date, also updates weigh-ins
  const addInBodyScan = useCallback((scan: Omit<InBodyScan, 'id'>) => {
    let newScan: InBodyScan;

    setInBodyScans((prev) => {
      // Check if scan with same date already exists
      const existingIndex = prev.findIndex((s) => s.date === scan.date);

      if (existingIndex >= 0) {
        // Replace existing scan - keep the same ID for database update
        newScan = {
          ...scan,
          id: prev[existingIndex].id,
        };
        const updated = [...prev];
        updated[existingIndex] = newScan;
        return updated.sort((a, b) => b.date.localeCompare(a.date));
      } else {
        // Add new scan
        newScan = {
          ...scan,
          id: uuidv4(),
        };
        return [...prev, newScan].sort((a, b) => b.date.localeCompare(a.date));
      }
    });

    // Save to database (upsert handles both insert and update)
    if (user) saveInBodyScan(newScan!);

    // Automatically add/update weight in weigh-ins
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

    return newScan!;
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
    // Map meal entries to meals with quantities and units
    const logMealsWithQty = log.meals
      .map((entry) => {
        const mealId = getMealId(entry);
        const quantity = getMealQuantity(entry);
        const unit = getMealUnit(entry);
        const meal = meals.find((m) => m.id === mealId);
        if (!meal) return null;
        // Convert quantity to serving multiplier based on unit
        const servingMultiplier = getServingMultiplier(quantity, unit, meal.servingSize);
        return { meal, servingMultiplier };
      })
      .filter(Boolean) as { meal: Meal; servingMultiplier: number }[];

    const totals = logMealsWithQty.reduce(
      (acc, { meal, servingMultiplier }) => ({
        calories: acc.calories + Math.round(meal.calories * servingMultiplier),
        protein: acc.protein + Math.round(meal.protein * servingMultiplier),
        carbs: acc.carbs + Math.round(meal.carbs * servingMultiplier),
        fat: acc.fat + Math.round(meal.fat * servingMultiplier),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const targetCalories = (settings.dailyCalorieTargetMin + settings.dailyCalorieTargetMax) / 2;

    // Get latest InBody scan with BMR for more accurate resting energy
    const latestScanWithBMR = inBodyScans
      .filter(scan => scan.bmr)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    // Use health metrics if available for more accurate calculations
    const healthMetrics = log.healthMetrics;

    // Priority: InBody BMR > Apple Health Resting Energy > 0
    const restingEnergy = latestScanWithBMR?.bmr || healthMetrics?.restingEnergy || 0;
    const activeEnergy = healthMetrics?.activeEnergy || log.workoutCalories;
    const tdee = restingEnergy + activeEnergy; // Total Daily Energy Expenditure
    const hasTDEE = restingEnergy > 0 && activeEnergy > 0;

    // Track which source is being used for transparency
    const tdeeSource = latestScanWithBMR?.bmr
      ? 'InBody BMR + Apple Health Active'
      : healthMetrics?.restingEnergy
        ? 'Apple Health Estimated'
        : null;

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
      // Health-based fields
      restingEnergy,
      activeEnergy,
      tdee,
      hasTDEE,
      trueDeficit,
      tdeeSource,
      steps: healthMetrics?.steps || 0,
      exerciseMinutes: healthMetrics?.exerciseMinutes || 0,
    };
  }, [meals, settings, inBodyScans]);

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
      // Enhanced metrics for charts
      bmr: scan.bmr,
      fatMass: scan.fatMass,
      visceralFatGrade: scan.visceralFatGrade,
      waterWeight: scan.waterWeight,
      trunkFatMass: scan.trunkFatMass,
      bodyAge: scan.bodyAge,
      proteinMass: scan.proteinMass,
      boneMass: scan.boneMass,
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
      // Enhanced metrics
      bmr: latest.bmr,
      fatMass: latest.fatMass,
      visceralFatGrade: latest.visceralFatGrade,
      waterWeight: latest.waterWeight,
      trunkFatMass: latest.trunkFatMass,
      bodyAge: latest.bodyAge,
      proteinMass: latest.proteinMass,
      boneMass: latest.boneMass,
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
    deletedMeals,
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
    updateMealQuantity,
    updateWorkoutCalories,
    updateHealthMetrics,
    calculateTotals,

    // Meal entry helpers (for UI to get meal ID/quantity from entries)
    getMealId,
    getMealQuantity,
    getMealUnit,
    getMasterMealId,
    getMasterMealQuantity,
    getMasterMealUnit,
    getServingMultiplier,

    // Meal operations
    addMeal,
    updateMeal,
    deleteMeal,
    restoreMeal,
    permanentlyDeleteMeal,
    getDaysUntilExpiry,
    toggleFavorite,
    logScannedMeal,
    saveAndLogMeal,

    // Master meal operations
    addMasterMealToLog,
    removeMasterMealFromLog,
    updateMasterMealQuantity,
    saveMasterMealToLibrary,
    removeMasterMealFromLibrary,

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
