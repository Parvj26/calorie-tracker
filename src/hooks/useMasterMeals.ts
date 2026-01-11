import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { MasterMeal } from '../types';

export function useMasterMeals(shouldLoad: boolean = false) {
  const { user } = useAuth();
  const [masterMeals, setMasterMeals] = useState<MasterMeal[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);

  // Load all approved master meals
  const loadMasterMeals = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('master_meals')
        .select('*')
        .eq('status', 'approved')
        .order('usage_count', { ascending: false });

      if (error) {
        console.error('Error loading master meals:', error);
        return;
      }

      const meals: MasterMeal[] = (data || []).map((m) => ({
        id: m.id,
        name: m.name,
        calories: m.calories,
        protein: m.protein,
        carbs: m.carbs,
        fat: m.fat,
        fiber: m.fiber || 0,
        sugar: m.sugar || 0,
        recipe: m.recipe || undefined,
        status: m.status,
        submittedBy: m.submitted_by,
        submittedByName: m.submitted_by_name,
        approvedBy: m.approved_by,
        approvedAt: m.approved_at,
        usageCount: m.usage_count || 0,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
      }));

      setMasterMeals(meals);
      setHasLoaded(true);
    } catch (err) {
      console.error('Error loading master meals:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Search master meals by name
  const searchMasterMeals = useCallback(async (query: string) => {
    if (!query.trim()) {
      loadMasterMeals();
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('master_meals')
        .select('*')
        .eq('status', 'approved')
        .ilike('name', `%${query}%`)
        .order('usage_count', { ascending: false });

      if (error) {
        console.error('Error searching master meals:', error);
        return;
      }

      const meals: MasterMeal[] = (data || []).map((m) => ({
        id: m.id,
        name: m.name,
        calories: m.calories,
        protein: m.protein,
        carbs: m.carbs,
        fat: m.fat,
        fiber: m.fiber || 0,
        sugar: m.sugar || 0,
        recipe: m.recipe || undefined,
        status: m.status,
        submittedBy: m.submitted_by,
        submittedByName: m.submitted_by_name,
        approvedBy: m.approved_by,
        approvedAt: m.approved_at,
        usageCount: m.usage_count || 0,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
      }));

      setMasterMeals(meals);
    } catch (err) {
      console.error('Error searching master meals:', err);
    } finally {
      setLoading(false);
    }
  }, [loadMasterMeals]);

  // Increment usage count when a master meal is added to a log
  const incrementUsageCount = useCallback(async (mealId: string) => {
    try {
      // Get current usage count
      const { data: meal } = await supabase
        .from('master_meals')
        .select('usage_count')
        .eq('id', mealId)
        .single();

      if (meal) {
        await supabase
          .from('master_meals')
          .update({ usage_count: (meal.usage_count || 0) + 1 })
          .eq('id', mealId);

        // Update local state
        setMasterMeals((prev) =>
          prev.map((m) =>
            m.id === mealId ? { ...m, usageCount: m.usageCount + 1 } : m
          )
        );
      }
    } catch (err) {
      console.error('Error incrementing usage count:', err);
    }
  }, []);

  // Get a master meal by ID
  const getMasterMealById = useCallback((mealId: string): MasterMeal | undefined => {
    return masterMeals.find((m) => m.id === mealId);
  }, [masterMeals]);

  // Delete a master meal (admin only - soft delete by archiving)
  const deleteMasterMeal = useCallback(async (mealId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('master_meals')
        .update({ status: 'archived' })
        .eq('id', mealId);

      if (error) {
        console.error('Error deleting master meal:', error);
        return false;
      }

      // Remove from local state
      setMasterMeals((prev) => prev.filter((m) => m.id !== mealId));
      return true;
    } catch (err) {
      console.error('Error deleting master meal:', err);
      return false;
    }
  }, []);

  // Check if a meal name already exists in master meals
  const checkDuplicateName = useCallback((name: string): boolean => {
    return masterMeals.some(
      (m) => m.name.toLowerCase().trim() === name.toLowerCase().trim()
    );
  }, [masterMeals]);

  // Load master meals conditionally (only when shouldLoad is true)
  useEffect(() => {
    if (user && shouldLoad && !hasLoaded) {
      loadMasterMeals();
    }
  }, [user, shouldLoad, hasLoaded, loadMasterMeals]);

  // Filter meals locally based on search query
  const filteredMeals = searchQuery.trim()
    ? masterMeals.filter((meal) =>
        meal.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : masterMeals;

  return {
    masterMeals: filteredMeals,
    allMasterMeals: masterMeals,
    loading,
    searchQuery,
    setSearchQuery,
    loadMasterMeals,
    searchMasterMeals,
    incrementUsageCount,
    getMasterMealById,
    deleteMasterMeal,
    checkDuplicateName,
  };
}
