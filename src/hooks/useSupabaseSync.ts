import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Meal, DailyLog, InBodyScan, WeighIn, UserSettings } from '../types';

interface SyncState {
  isSyncing: boolean;
  lastSynced: Date | null;
  error: string | null;
}

export function useSupabaseSync() {
  const { user } = useAuth();
  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    lastSynced: null,
    error: null,
  });

  // Load all data from Supabase
  const loadFromSupabase = useCallback(async () => {
    if (!user) return null;

    setSyncState((prev) => ({ ...prev, isSyncing: true, error: null }));

    try {
      const [mealsRes, logsRes, weighInsRes, scansRes, settingsRes] = await Promise.all([
        supabase.from('meals').select('*').eq('user_id', user.id),
        supabase.from('daily_logs').select('*').eq('user_id', user.id),
        supabase.from('weigh_ins').select('*').eq('user_id', user.id).order('date'),
        supabase.from('inbody_scans').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('user_settings').select('*').eq('user_id', user.id).single(),
      ]);

      // Transform database rows to app format
      const meals: Meal[] = (mealsRes.data || []).map((m) => ({
        id: m.id,
        name: m.name,
        calories: m.calories,
        protein: m.protein,
        carbs: m.carbs,
        fat: m.fat,
        isCustom: m.is_custom,
        favorite: m.favorite ?? false,
        recipe: m.recipe || undefined,
        deletedAt: m.deleted_at || undefined,
      }));

      const dailyLogs: DailyLog[] = (logsRes.data || []).map((l) => ({
        date: l.date,
        meals: l.meal_ids || [],
        workoutCalories: l.workout_calories || 0,
        healthMetrics: l.health_metrics || undefined,
        notes: l.notes,
      }));

      const weighIns: WeighIn[] = (weighInsRes.data || []).map((w) => ({
        date: w.date,
        weight: w.weight,
      }));

      const inBodyScans: InBodyScan[] = (scansRes.data || []).map((s) => ({
        id: s.id,
        date: s.date,
        weight: s.weight,
        bodyFatPercent: s.body_fat_percent,
        muscleMass: s.muscle_mass,
        skeletalMuscle: s.skeletal_muscle,
        // Enhanced metrics
        bmr: s.bmr || undefined,
        fatMass: s.fat_mass || undefined,
        visceralFatGrade: s.visceral_fat_grade || undefined,
        waterWeight: s.water_weight || undefined,
        trunkFatMass: s.trunk_fat_mass || undefined,
        bodyAge: s.body_age || undefined,
        proteinMass: s.protein_mass || undefined,
        boneMass: s.bone_mass || undefined,
        imageData: s.image_data,
        userId: s.user_id,
      }));

      const settings: UserSettings | null = settingsRes.data
        ? {
            dailyCalorieTargetMin: settingsRes.data.daily_calorie_target_min,
            dailyCalorieTargetMax: settingsRes.data.daily_calorie_target_max,
            startWeight: settingsRes.data.start_weight,
            goalWeight: settingsRes.data.goal_weight,
            startDate: settingsRes.data.start_date,
            aiProvider: settingsRes.data.ai_provider || 'groq',
            openAiApiKey: settingsRes.data.openai_api_key,
            groqApiKey: settingsRes.data.groq_api_key,
          }
        : null;

      setSyncState({
        isSyncing: false,
        lastSynced: new Date(),
        error: null,
      });

      return { meals, dailyLogs, weighIns, inBodyScans, settings };
    } catch (error) {
      setSyncState({
        isSyncing: false,
        lastSynced: null,
        error: (error as Error).message,
      });
      return null;
    }
  }, [user]);

  // Save meals to Supabase
  const saveMeal = useCallback(async (meal: Meal) => {
    if (!user) return;

    await supabase.from('meals').upsert({
      id: meal.id,
      user_id: user.id,
      name: meal.name,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      is_custom: meal.isCustom ?? true,
      favorite: meal.favorite ?? false,
      recipe: meal.recipe ?? null,
      updated_at: new Date().toISOString(),
    });
  }, [user]);

  const deleteMealFromDb = useCallback(async (mealId: string) => {
    if (!user) return;
    await supabase.from('meals').delete().eq('id', mealId).eq('user_id', user.id);
  }, [user]);

  // Soft delete meal (set deleted_at timestamp)
  const softDeleteMeal = useCallback(async (mealId: string) => {
    if (!user) return;
    await supabase.from('meals').update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', mealId).eq('user_id', user.id);
  }, [user]);

  // Restore meal (clear deleted_at timestamp)
  const restoreMealDb = useCallback(async (mealId: string) => {
    if (!user) return;
    await supabase.from('meals').update({
      deleted_at: null,
      updated_at: new Date().toISOString(),
    }).eq('id', mealId).eq('user_id', user.id);
  }, [user]);

  // Permanently delete meal (hard delete)
  const permanentDeleteMeal = useCallback(async (mealId: string) => {
    if (!user) return;
    await supabase.from('meals').delete().eq('id', mealId).eq('user_id', user.id);
  }, [user]);

  // Purge meals deleted more than 30 days ago
  const purgeExpiredMeals = useCallback(async () => {
    if (!user) return;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    await supabase.from('meals').delete()
      .eq('user_id', user.id)
      .not('deleted_at', 'is', null)
      .lt('deleted_at', thirtyDaysAgo.toISOString());
  }, [user]);

  // Save daily log to Supabase
  const saveDailyLog = useCallback(async (log: DailyLog) => {
    if (!user) return;

    await supabase.from('daily_logs').upsert({
      user_id: user.id,
      date: log.date,
      meal_ids: log.meals,
      workout_calories: log.workoutCalories,
      health_metrics: log.healthMetrics || null,
      notes: log.notes,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,date',
    });
  }, [user]);

  // Save weigh-in to Supabase
  const saveWeighIn = useCallback(async (weighIn: WeighIn) => {
    if (!user) return;

    await supabase.from('weigh_ins').upsert({
      user_id: user.id,
      date: weighIn.date,
      weight: weighIn.weight,
    }, {
      onConflict: 'user_id,date',
    });
  }, [user]);

  const deleteWeighInFromDb = useCallback(async (date: string) => {
    if (!user) return;
    await supabase.from('weigh_ins').delete().eq('date', date).eq('user_id', user.id);
  }, [user]);

  // Save InBody scan to Supabase
  const saveInBodyScan = useCallback(async (scan: InBodyScan) => {
    if (!user) return;

    await supabase.from('inbody_scans').upsert({
      id: scan.id,
      user_id: user.id,
      date: scan.date,
      weight: scan.weight,
      body_fat_percent: scan.bodyFatPercent,
      muscle_mass: scan.muscleMass,
      skeletal_muscle: scan.skeletalMuscle,
      // Enhanced metrics
      bmr: scan.bmr || null,
      fat_mass: scan.fatMass || null,
      visceral_fat_grade: scan.visceralFatGrade || null,
      water_weight: scan.waterWeight || null,
      trunk_fat_mass: scan.trunkFatMass || null,
      body_age: scan.bodyAge || null,
      protein_mass: scan.proteinMass || null,
      bone_mass: scan.boneMass || null,
      image_data: scan.imageData,
    });
  }, [user]);

  const deleteInBodyScanFromDb = useCallback(async (scanId: string) => {
    if (!user) return;
    await supabase.from('inbody_scans').delete().eq('id', scanId).eq('user_id', user.id);
  }, [user]);

  // Save settings to Supabase
  const saveSettings = useCallback(async (settings: UserSettings) => {
    if (!user) return;

    await supabase.from('user_settings').upsert({
      user_id: user.id,
      daily_calorie_target_min: settings.dailyCalorieTargetMin,
      daily_calorie_target_max: settings.dailyCalorieTargetMax,
      start_weight: settings.startWeight,
      goal_weight: settings.goalWeight,
      start_date: settings.startDate,
      ai_provider: settings.aiProvider,
      openai_api_key: settings.openAiApiKey,
      groq_api_key: settings.groqApiKey,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    });
  }, [user]);

  return {
    syncState,
    loadFromSupabase,
    saveMeal,
    deleteMealFromDb,
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
  };
}
