import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { UserProfile } from '../types';

export function useUserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = profile?.role === 'admin';

  // Load user profile from Supabase
  const loadProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // Profile might not exist yet (for existing users before this feature)
        // Create one automatically
        if (error.code === 'PGRST116') {
          const { data: newProfile, error: insertError } = await supabase
            .from('user_profiles')
            .insert({
              user_id: user.id,
              email: user.email,
              role: 'user',
            })
            .select()
            .single();

          if (!insertError && newProfile) {
            setProfile({
              id: newProfile.id,
              userId: newProfile.user_id,
              email: newProfile.email,
              displayName: newProfile.display_name,
              firstName: newProfile.first_name,
              lastName: newProfile.last_name,
              dateOfBirth: newProfile.date_of_birth,
              gender: newProfile.gender,
              role: newProfile.role,
              createdAt: newProfile.created_at,
              updatedAt: newProfile.updated_at,
            });
          }
        }
      } else if (data) {
        setProfile({
          id: data.id,
          userId: data.user_id,
          email: data.email,
          displayName: data.display_name,
          firstName: data.first_name,
          lastName: data.last_name,
          dateOfBirth: data.date_of_birth,
          gender: data.gender,
          role: data.role,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        });
      }
    } catch (err) {
      console.error('Error loading user profile:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Update display name
  const updateDisplayName = useCallback(async (displayName: string) => {
    if (!user || !profile) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          display_name: displayName,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (!error) {
        setProfile((prev) => prev ? { ...prev, displayName } : null);
      }
    } catch (err) {
      console.error('Error updating display name:', err);
    }
  }, [user, profile]);

  // Update profile fields
  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user || !profile) return false;

    try {
      // Convert camelCase to snake_case for database
      const dbUpdates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
      if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName;
      if (updates.dateOfBirth !== undefined) dbUpdates.date_of_birth = updates.dateOfBirth;
      if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
      if (updates.displayName !== undefined) dbUpdates.display_name = updates.displayName;

      const { error } = await supabase
        .from('user_profiles')
        .update(dbUpdates)
        .eq('user_id', user.id);

      if (!error) {
        setProfile((prev) => prev ? { ...prev, ...updates } : null);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error updating profile:', err);
      return false;
    }
  }, [user, profile]);

  // Check if profile setup is needed (no first name set)
  const needsProfileSetup = profile && !profile.firstName;

  // Load profile on mount and when user changes
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return {
    profile,
    isAdmin,
    loading,
    needsProfileSetup,
    loadProfile,
    updateDisplayName,
    updateProfile,
  };
}
