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
      // Load profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', clientId)
        .single();

      if (!profile) return null;

      // Load daily logs (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: dailyLogs } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', clientId)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });

      // Load weigh-ins (last 60 days)
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const { data: weighIns } = await supabase
        .from('weigh_ins')
        .select('*')
        .eq('user_id', clientId)
        .gte('date', sixtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });

      // Load settings
      const { data: settings } = await supabase
        .from('user_settings')
        .select('daily_calorie_target, goal_weight')
        .eq('user_id', clientId)
        .single();

      return {
        profile: {
          id: profile.id,
          userId: profile.user_id,
          email: profile.email,
          displayName: profile.display_name,
          firstName: profile.first_name,
          lastName: profile.last_name,
          dateOfBirth: profile.date_of_birth,
          gender: profile.gender,
          heightCm: profile.height_cm,
          activityLevel: profile.activity_level,
          role: profile.role,
        },
        dailyLogs: (dailyLogs || []).map(log => ({
          date: log.date,
          meals: log.meal_ids || [],
          masterMealIds: log.master_meal_ids || [],
          workoutCalories: log.workout_calories || 0,
          healthMetrics: log.health_metrics,
          notes: log.notes,
        })),
        weighIns: (weighIns || []).map(w => ({
          date: w.date,
          weight: w.weight,
        })),
        settings: {
          dailyCalorieTarget: settings?.daily_calorie_target,
          goalWeight: settings?.goal_weight,
        },
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
