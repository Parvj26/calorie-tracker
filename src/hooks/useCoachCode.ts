import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { CoachClientWithProfile } from '../types';

interface CoachLookupResult {
  userId: string;
  email?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
}

interface UseCoachCodeReturn {
  // State
  loading: boolean;
  error: string | null;
  coachConnection: CoachClientWithProfile | null;

  // Actions
  lookupCoach: (code: string) => Promise<CoachLookupResult | null>;
  requestConnection: (coachId: string) => Promise<boolean>;
  cancelRequest: () => Promise<boolean>;
  disconnectFromCoach: () => Promise<boolean>;
  refreshConnection: () => Promise<void>;
}

export function useCoachCode(): UseCoachCodeReturn {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coachConnection, setCoachConnection] = useState<CoachClientWithProfile | null>(null);

  // Load existing coach connection on mount
  const loadConnection = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('coach_clients')
        .select(`
          id,
          coach_id,
          client_id,
          status,
          requested_at,
          responded_at,
          created_at,
          updated_at
        `)
        .eq('client_id', user.id)
        .in('status', ['pending', 'accepted'])
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error loading coach connection:', fetchError);
        return;
      }

      if (data) {
        // Fetch coach profile
        const { data: coachProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', data.coach_id)
          .single();

        const connection: CoachClientWithProfile = {
          id: data.id,
          coachId: data.coach_id,
          clientId: data.client_id,
          status: data.status,
          requestedAt: data.requested_at,
          respondedAt: data.responded_at,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          coachProfile: coachProfile ? {
            id: coachProfile.id,
            userId: coachProfile.user_id,
            email: coachProfile.email,
            displayName: coachProfile.display_name,
            firstName: coachProfile.first_name,
            lastName: coachProfile.last_name,
            role: coachProfile.role,
            coachCode: coachProfile.coach_code,
          } : undefined,
        };

        setCoachConnection(connection);
      } else {
        setCoachConnection(null);
      }
    } catch (err) {
      console.error('Error in loadConnection:', err);
    }
  }, [user]);

  useEffect(() => {
    loadConnection();
  }, [loadConnection]);

  // Look up a coach by their code
  const lookupCoach = useCallback(async (code: string): Promise<CoachLookupResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: lookupError } = await supabase
        .rpc('lookup_coach_by_code', { code: code.toUpperCase() });

      if (lookupError) {
        setError('Error looking up coach code');
        console.error('Lookup error:', lookupError);
        setLoading(false);
        return null;
      }

      if (!data || data.length === 0) {
        setError('Invalid coach code. Please check and try again.');
        setLoading(false);
        return null;
      }

      const coach = data[0];
      setLoading(false);
      return {
        userId: coach.user_id,
        email: coach.email,
        displayName: coach.display_name,
        firstName: coach.first_name,
        lastName: coach.last_name,
      };
    } catch (err) {
      setError('Failed to look up coach');
      console.error('Lookup error:', err);
      setLoading(false);
      return null;
    }
  }, []);

  // Request connection to a coach
  const requestConnection = useCallback(async (coachId: string): Promise<boolean> => {
    if (!user) {
      setError('You must be logged in');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // Check if connection already exists
      const { data: existing } = await supabase
        .from('coach_clients')
        .select('id, status')
        .eq('client_id', user.id)
        .eq('coach_id', coachId)
        .single();

      if (existing) {
        if (existing.status === 'pending') {
          setError('You already have a pending request with this coach');
        } else if (existing.status === 'accepted') {
          setError('You are already connected to this coach');
        } else {
          // Reactivate terminated/rejected connection
          const { error: updateError } = await supabase
            .from('coach_clients')
            .update({
              status: 'pending',
              requested_at: new Date().toISOString(),
              responded_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

          if (updateError) {
            setError('Failed to send request');
            setLoading(false);
            return false;
          }
        }

        await loadConnection();
        setLoading(false);
        return !existing || existing.status === 'terminated' || existing.status === 'rejected';
      }

      // Create new connection request
      const { error: insertError } = await supabase
        .from('coach_clients')
        .insert({
          coach_id: coachId,
          client_id: user.id,
          status: 'pending',
          requested_at: new Date().toISOString(),
        });

      if (insertError) {
        setError('Failed to send connection request');
        console.error('Insert error:', insertError);
        setLoading(false);
        return false;
      }

      await loadConnection();
      setLoading(false);
      return true;
    } catch (err) {
      setError('Failed to request connection');
      console.error('Request error:', err);
      setLoading(false);
      return false;
    }
  }, [user, loadConnection]);

  // Cancel pending request
  const cancelRequest = useCallback(async (): Promise<boolean> => {
    if (!user || !coachConnection) return false;

    setLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('coach_clients')
        .delete()
        .eq('id', coachConnection.id)
        .eq('client_id', user.id);

      if (deleteError) {
        setError('Failed to cancel request');
        setLoading(false);
        return false;
      }

      setCoachConnection(null);
      setLoading(false);
      return true;
    } catch {
      setError('Failed to cancel request');
      setLoading(false);
      return false;
    }
  }, [user, coachConnection]);

  // Disconnect from coach
  const disconnectFromCoach = useCallback(async (): Promise<boolean> => {
    if (!user || !coachConnection) return false;

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('coach_clients')
        .update({
          status: 'terminated',
          updated_at: new Date().toISOString(),
        })
        .eq('id', coachConnection.id)
        .eq('client_id', user.id);

      if (updateError) {
        setError('Failed to disconnect');
        setLoading(false);
        return false;
      }

      setCoachConnection(null);
      setLoading(false);
      return true;
    } catch {
      setError('Failed to disconnect');
      setLoading(false);
      return false;
    }
  }, [user, coachConnection]);

  const refreshConnection = useCallback(async () => {
    await loadConnection();
  }, [loadConnection]);

  return {
    loading,
    error,
    coachConnection,
    lookupCoach,
    requestConnection,
    cancelRequest,
    disconnectFromCoach,
    refreshConnection,
  };
}
