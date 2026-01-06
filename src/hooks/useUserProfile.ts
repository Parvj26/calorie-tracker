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

  // Load profile on mount and when user changes
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return {
    profile,
    isAdmin,
    loading,
    loadProfile,
    updateDisplayName,
  };
}
