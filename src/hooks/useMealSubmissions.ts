import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Meal, MealSubmission } from '../types';

export function useMealSubmissions(isAdmin: boolean = false) {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<MealSubmission[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Transform database row to MealSubmission
  const transformSubmission = (s: Record<string, unknown>): MealSubmission => ({
    id: s.id as string,
    sourceMealId: s.source_meal_id as string | undefined,
    name: s.name as string,
    calories: s.calories as number,
    protein: s.protein as number,
    carbs: s.carbs as number,
    fat: s.fat as number,
    fiber: (s.fiber as number) || 0,
    sugar: (s.sugar as number) || 0,
    recipe: (s.recipe as MealSubmission['recipe']) || undefined,
    submittedBy: s.submitted_by as string,
    submittedByEmail: s.submitted_by_email as string | undefined,
    submittedAt: s.submitted_at as string,
    status: s.status as MealSubmission['status'],
    reviewedBy: s.reviewed_by as string | undefined,
    reviewedAt: s.reviewed_at as string | undefined,
    rejectionReason: s.rejection_reason as string | undefined,
    masterMealId: s.master_meal_id as string | undefined,
  });

  // Load user's own submissions
  const loadMySubmissions = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('meal_submissions')
        .select('*')
        .eq('submitted_by', user.id)
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('Error loading submissions:', error);
        return;
      }

      setSubmissions((data || []).map(transformSubmission));
    } catch (err) {
      console.error('Error loading submissions:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load all pending submissions (admin only)
  const loadPendingSubmissions = useCallback(async () => {
    if (!user || !isAdmin) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('meal_submissions')
        .select('*')
        .eq('status', 'pending')
        .order('submitted_at', { ascending: true });

      if (error) {
        console.error('Error loading pending submissions:', error);
        return;
      }

      setSubmissions((data || []).map(transformSubmission));
      setPendingCount((data || []).length);
    } catch (err) {
      console.error('Error loading pending submissions:', err);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin]);

  // Get pending count (admin only)
  const refreshPendingCount = useCallback(async () => {
    if (!user || !isAdmin) return;

    try {
      const { count, error } = await supabase
        .from('meal_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (!error && count !== null) {
        setPendingCount(count);
      }
    } catch (err) {
      console.error('Error getting pending count:', err);
    }
  }, [user, isAdmin]);

  // Submit a meal for review
  const submitMealForReview = useCallback(async (meal: Meal): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase.from('meal_submissions').insert({
        source_meal_id: meal.id,
        name: meal.name,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        fiber: meal.fiber || 0,
        sugar: meal.sugar || 0,
        recipe: meal.recipe || null,
        submitted_by: user.id,
        submitted_by_email: user.email,
        status: 'pending',
      });

      if (error) {
        console.error('Error submitting meal:', error);
        return false;
      }

      // Refresh submissions list
      loadMySubmissions();
      return true;
    } catch (err) {
      console.error('Error submitting meal:', err);
      return false;
    }
  }, [user, loadMySubmissions]);

  // Cancel a pending submission
  const cancelSubmission = useCallback(async (submissionId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('meal_submissions')
        .delete()
        .eq('id', submissionId)
        .eq('submitted_by', user.id)
        .eq('status', 'pending');

      if (error) {
        console.error('Error canceling submission:', error);
        return false;
      }

      setSubmissions((prev) => prev.filter((s) => s.id !== submissionId));
      return true;
    } catch (err) {
      console.error('Error canceling submission:', err);
      return false;
    }
  }, [user]);

  // Approve a submission (admin only)
  const approveSubmission = useCallback(async (submissionId: string, submitterName?: string): Promise<boolean> => {
    if (!user || !isAdmin) return false;

    try {
      // Get the submission data
      const { data: submission, error: fetchError } = await supabase
        .from('meal_submissions')
        .select('*')
        .eq('id', submissionId)
        .single();

      if (fetchError || !submission) {
        console.error('Error fetching submission:', fetchError);
        return false;
      }

      // Create master meal from submission
      const { data: masterMeal, error: createError } = await supabase
        .from('master_meals')
        .insert({
          name: submission.name,
          calories: submission.calories,
          protein: submission.protein,
          carbs: submission.carbs,
          fat: submission.fat,
          fiber: submission.fiber || 0,
          sugar: submission.sugar || 0,
          recipe: submission.recipe,
          status: 'approved',
          submitted_by: submission.submitted_by,
          submitted_by_name: submitterName || submission.submitted_by_email?.split('@')[0] || 'Anonymous',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          usage_count: 0,
        })
        .select()
        .single();

      if (createError || !masterMeal) {
        console.error('Error creating master meal:', createError);
        return false;
      }

      // Update submission status
      const { error: updateError } = await supabase
        .from('meal_submissions')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          master_meal_id: masterMeal.id,
        })
        .eq('id', submissionId);

      if (updateError) {
        console.error('Error updating submission:', updateError);
        return false;
      }

      // Refresh pending submissions
      loadPendingSubmissions();
      return true;
    } catch (err) {
      console.error('Error approving submission:', err);
      return false;
    }
  }, [user, isAdmin, loadPendingSubmissions]);

  // Reject a submission (admin only)
  const rejectSubmission = useCallback(async (submissionId: string, reason: string): Promise<boolean> => {
    if (!user || !isAdmin) return false;

    try {
      const { error } = await supabase
        .from('meal_submissions')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq('id', submissionId);

      if (error) {
        console.error('Error rejecting submission:', error);
        return false;
      }

      // Refresh pending submissions
      loadPendingSubmissions();
      return true;
    } catch (err) {
      console.error('Error rejecting submission:', err);
      return false;
    }
  }, [user, isAdmin, loadPendingSubmissions]);

  // Load submissions on mount
  useEffect(() => {
    if (user) {
      if (isAdmin) {
        loadPendingSubmissions();
      } else {
        loadMySubmissions();
      }
    }
  }, [user, isAdmin, loadMySubmissions, loadPendingSubmissions]);

  // Refresh pending count periodically for admins
  useEffect(() => {
    if (user && isAdmin) {
      refreshPendingCount();
    }
  }, [user, isAdmin, refreshPendingCount]);

  return {
    submissions,
    pendingCount,
    loading,
    loadMySubmissions,
    loadPendingSubmissions,
    refreshPendingCount,
    submitMealForReview,
    cancelSubmission,
    approveSubmission,
    rejectSubmission,
  };
}
