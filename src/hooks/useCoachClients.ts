import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type {
  CoachClientWithProfile,
  ClientSummary,
  CoachAlert,
  UserProfile,
  DailyLog,
  WeighIn,
} from '../types';

interface UseCoachClientsReturn {
  // Data
  clients: ClientSummary[];
  pendingRequests: CoachClientWithProfile[];
  alerts: CoachAlert[];
  loading: boolean;
  error: string | null;

  // Actions
  acceptRequest: (requestId: string) => Promise<boolean>;
  rejectRequest: (requestId: string) => Promise<boolean>;
  terminateClient: (clientId: string) => Promise<boolean>;
  refreshClients: () => Promise<void>;
  getClientData: (clientId: string) => Promise<ClientFullData | null>;
}

export interface ClientFullData {
  profile: UserProfile;
  dailyLogs: DailyLog[];
  weighIns: WeighIn[];
  settings: {
    dailyCalorieTarget?: number;
    goalWeight?: number;
  };
}

export function useCoachClients(): UseCoachClientsReturn {
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [pendingRequests, setPendingRequests] = useState<CoachClientWithProfile[]>([]);
  const [alerts, setAlerts] = useState<CoachAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load all connected clients and pending requests
  const loadClients = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Load coach-client relationships
      const { data: relationships, error: relError } = await supabase
        .from('coach_clients')
        .select('*')
        .eq('coach_id', user.id);

      if (relError) {
        console.error('Error loading relationships:', relError);
        setError('Failed to load clients');
        setLoading(false);
        return;
      }

      // Separate pending and accepted
      const pending = relationships?.filter(r => r.status === 'pending') || [];
      const accepted = relationships?.filter(r => r.status === 'accepted') || [];

      // Load profiles for pending requests
      const pendingWithProfiles: CoachClientWithProfile[] = [];
      for (const req of pending) {
        const { data: clientProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', req.client_id)
          .single();

        pendingWithProfiles.push({
          id: req.id,
          coachId: req.coach_id,
          clientId: req.client_id,
          status: req.status,
          requestedAt: req.requested_at,
          respondedAt: req.responded_at,
          createdAt: req.created_at,
          updatedAt: req.updated_at,
          clientProfile: clientProfile ? {
            id: clientProfile.id,
            userId: clientProfile.user_id,
            email: clientProfile.email,
            displayName: clientProfile.display_name,
            firstName: clientProfile.first_name,
            lastName: clientProfile.last_name,
            role: clientProfile.role,
          } : undefined,
        });
      }
      setPendingRequests(pendingWithProfiles);

      // Load client summaries for accepted connections
      const clientSummaries: ClientSummary[] = [];
      const newAlerts: CoachAlert[] = [];

      for (const rel of accepted) {
        // Load profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', rel.client_id)
          .single();

        if (!profile) continue;

        // Load latest weigh-in
        const { data: weighIns } = await supabase
          .from('weigh_ins')
          .select('weight, date')
          .eq('user_id', rel.client_id)
          .order('date', { ascending: false })
          .limit(2);

        // Calorie calculation simplified - just set to 0 for now
        const caloriesToday = 0;

        // Load settings for calorie target
        const { data: settings } = await supabase
          .from('user_settings')
          .select('daily_calorie_target')
          .eq('user_id', rel.client_id)
          .single();

        // Load recent logs to check activity
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const { data: recentLogs } = await supabase
          .from('daily_logs')
          .select('date')
          .eq('user_id', rel.client_id)
          .gte('date', sevenDaysAgo.toISOString().split('T')[0]);

        // Calculate metrics
        const latestWeight = weighIns?.[0]?.weight;
        const previousWeight = weighIns?.[1]?.weight;
        const weightChange7Days = latestWeight && previousWeight
          ? Math.round((latestWeight - previousWeight) * 10) / 10
          : undefined;

        // Find last activity date
        const lastActivityDate = recentLogs?.length
          ? recentLogs.sort((a, b) => b.date.localeCompare(a.date))[0].date
          : undefined;

        // Calculate days inactive
        const daysInactive = lastActivityDate
          ? Math.floor((Date.now() - new Date(lastActivityDate).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        const isInactive = daysInactive >= 3;

        // Check for weight plateau (simplified)
        const hasWeightPlateau = false; // Would need more historical data

        // Calculate missed targets (simplified)
        const missedCalorieTargets = 0; // Would need meal calculations

        const clientName = profile.first_name && profile.last_name
          ? `${profile.first_name} ${profile.last_name}`
          : profile.display_name || profile.email || 'Client';

        // Generate alerts
        if (isInactive && daysInactive < 999) {
          newAlerts.push({
            id: `inactive-${rel.client_id}`,
            type: 'inactive',
            clientId: rel.client_id,
            clientName,
            message: `${clientName} hasn't logged for ${daysInactive} days`,
            severity: daysInactive >= 7 ? 'critical' : 'warning',
            createdAt: new Date().toISOString(),
          });
        }

        clientSummaries.push({
          clientId: rel.client_id,
          profile: {
            id: profile.id,
            userId: profile.user_id,
            email: profile.email,
            displayName: profile.display_name,
            firstName: profile.first_name,
            lastName: profile.last_name,
            role: profile.role,
          },
          latestWeight,
          weightChange7Days,
          caloriesToday,
          calorieTarget: settings?.daily_calorie_target,
          lastActivityDate,
          daysInactive,
          isInactive,
          hasWeightPlateau,
          missedCalorieTargets,
        });
      }

      // Add pending request alerts
      for (const req of pendingWithProfiles) {
        const clientName = req.clientProfile?.firstName && req.clientProfile?.lastName
          ? `${req.clientProfile.firstName} ${req.clientProfile.lastName}`
          : req.clientProfile?.displayName || req.clientProfile?.email || 'New client';

        newAlerts.push({
          id: `request-${req.id}`,
          type: 'new_request',
          clientId: req.clientId,
          clientName,
          message: `${clientName} wants to connect`,
          severity: 'info',
          createdAt: req.requestedAt,
        });
      }

      setClients(clientSummaries);
      setAlerts(newAlerts);
    } catch (err) {
      console.error('Error loading clients:', err);
      setError('Failed to load clients');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  // Accept a pending request
  const acceptRequest = useCallback(async (requestId: string): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('coach_clients')
        .update({
          status: 'accepted',
          responded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .eq('coach_id', user?.id);

      if (updateError) {
        console.error('Error accepting request:', updateError);
        return false;
      }

      await loadClients();
      return true;
    } catch (err) {
      console.error('Error accepting request:', err);
      return false;
    }
  }, [user, loadClients]);

  // Reject a pending request
  const rejectRequest = useCallback(async (requestId: string): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('coach_clients')
        .update({
          status: 'rejected',
          responded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .eq('coach_id', user?.id);

      if (updateError) {
        console.error('Error rejecting request:', updateError);
        return false;
      }

      await loadClients();
      return true;
    } catch (err) {
      console.error('Error rejecting request:', err);
      return false;
    }
  }, [user, loadClients]);

  // Terminate a client connection
  const terminateClient = useCallback(async (clientId: string): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('coach_clients')
        .update({
          status: 'terminated',
          updated_at: new Date().toISOString(),
        })
        .eq('coach_id', user?.id)
        .eq('client_id', clientId)
        .eq('status', 'accepted');

      if (updateError) {
        console.error('Error terminating client:', updateError);
        return false;
      }

      await loadClients();
      return true;
    } catch (err) {
      console.error('Error terminating client:', err);
      return false;
    }
  }, [user, loadClients]);

  // Get full data for a specific client
  const getClientData = useCallback(async (clientId: string): Promise<ClientFullData | null> => {
    if (!user) return null;

    try {
      // Load profile - this is required
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', clientId)
        .single();

      if (profileError || !profile) {
        console.error('Error loading client profile:', profileError);
        return null;
      }

      // Load daily logs (last 30 days) - optional, don't fail if blocked
      let dailyLogsData: DailyLog[] = [];
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const { data: dailyLogs, error: logsError } = await supabase
          .from('daily_logs')
          .select('*')
          .eq('user_id', clientId)
          .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
          .order('date', { ascending: false });

        if (!logsError && Array.isArray(dailyLogs)) {
          dailyLogsData = dailyLogs.map(log => {
            // Safely extract healthMetrics if it exists and has the right shape
            let healthMetrics: DailyLog['healthMetrics'] = undefined;
            if (log.health_metrics && typeof log.health_metrics === 'object') {
              const hm = log.health_metrics;
              if (typeof hm.restingEnergy === 'number' && typeof hm.activeEnergy === 'number' &&
                  typeof hm.steps === 'number' && typeof hm.exerciseMinutes === 'number') {
                healthMetrics = {
                  restingEnergy: hm.restingEnergy,
                  activeEnergy: hm.activeEnergy,
                  steps: hm.steps,
                  exerciseMinutes: hm.exerciseMinutes,
                  standHours: typeof hm.standHours === 'number' ? hm.standHours : undefined,
                };
              }
            }

            return {
              date: typeof log.date === 'string' ? log.date : '',
              meals: Array.isArray(log.meal_ids) ? log.meal_ids : [],
              masterMealIds: Array.isArray(log.master_meal_ids) ? log.master_meal_ids : [],
              workoutCalories: typeof log.workout_calories === 'number' ? log.workout_calories : 0,
              healthMetrics,
              notes: typeof log.notes === 'string' ? log.notes : undefined,
            };
          });
        }
      } catch {
        console.warn('Could not load daily logs for client');
      }

      // Load weigh-ins (last 60 days) - optional, don't fail if blocked
      let weighInsData: Array<{ date: string; weight: number }> = [];
      try {
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        const { data: weighIns, error: weighInsError } = await supabase
          .from('weigh_ins')
          .select('*')
          .eq('user_id', clientId)
          .gte('date', sixtyDaysAgo.toISOString().split('T')[0])
          .order('date', { ascending: false });

        if (!weighInsError && Array.isArray(weighIns)) {
          weighInsData = weighIns
            .filter(w => w && typeof w.date === 'string' && typeof w.weight === 'number')
            .map(w => ({
              date: w.date,
              weight: w.weight,
            }));
        }
      } catch {
        console.warn('Could not load weigh-ins for client');
      }

      // Load settings - optional, don't fail if blocked
      let settingsData: { dailyCalorieTarget?: number; goalWeight?: number } = {};
      try {
        const { data: settings, error: settingsError } = await supabase
          .from('user_settings')
          .select('daily_calorie_target, goal_weight')
          .eq('user_id', clientId)
          .single();

        if (!settingsError && settings) {
          settingsData = {
            dailyCalorieTarget: typeof settings.daily_calorie_target === 'number' ? settings.daily_calorie_target : undefined,
            goalWeight: typeof settings.goal_weight === 'number' ? settings.goal_weight : undefined,
          };
        }
      } catch {
        console.warn('Could not load settings for client');
      }

      return {
        profile: {
          id: typeof profile.id === 'string' ? profile.id : '',
          userId: typeof profile.user_id === 'string' ? profile.user_id : '',
          email: typeof profile.email === 'string' ? profile.email : '',
          displayName: typeof profile.display_name === 'string' ? profile.display_name : undefined,
          firstName: typeof profile.first_name === 'string' ? profile.first_name : undefined,
          lastName: typeof profile.last_name === 'string' ? profile.last_name : undefined,
          dateOfBirth: typeof profile.date_of_birth === 'string' ? profile.date_of_birth : undefined,
          gender: typeof profile.gender === 'string' ? profile.gender : undefined,
          heightCm: typeof profile.height_cm === 'number' ? profile.height_cm : undefined,
          activityLevel: typeof profile.activity_level === 'string' ? profile.activity_level : undefined,
          role: typeof profile.role === 'string' ? profile.role : 'user',
        },
        dailyLogs: dailyLogsData,
        weighIns: weighInsData,
        settings: settingsData,
      };
    } catch (err) {
      console.error('Error loading client data:', err);
      return null;
    }
  }, [user]);

  return {
    clients,
    pendingRequests,
    alerts,
    loading,
    error,
    acceptRequest,
    rejectRequest,
    terminateClient,
    refreshClients: loadClients,
    getClientData,
  };
}
