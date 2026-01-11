import React, { useState, useEffect, useMemo } from 'react';
import { useCoachClients, type ClientFullData } from '../../hooks/useCoachClients';
import {
  ArrowLeft,
  User,
  Scale,
  Target,
  Calendar,
  TrendingDown,
  TrendingUp,
  Loader2,
  UserX,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ClientDetailViewProps {
  clientId: string;
  onBack: () => void;
}

export const ClientDetailView: React.FC<ClientDetailViewProps> = ({
  clientId,
  onBack,
}) => {
  const { getClientData, terminateClient } = useCoachClients();
  const [clientData, setClientData] = useState<ClientFullData | null>(null);
  const [loading, setLoading] = useState(true);
  const [terminating, setTerminating] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const data = await getClientData(clientId);
      setClientData(data);
      setLoading(false);
    };
    loadData();
  }, [clientId, getClientData]);

  const handleTerminate = async () => {
    if (!confirm('Are you sure you want to remove this client? They will need to reconnect.')) {
      return;
    }
    setTerminating(true);
    const success = await terminateClient(clientId);
    if (success) {
      onBack();
    } else {
      setTerminating(false);
      alert('Failed to remove client');
    }
  };

  if (loading) {
    return (
      <div className="client-detail-view loading">
        <Loader2 size={32} className="spinner" />
        <p>Loading client data...</p>
      </div>
    );
  }

  if (!clientData || !clientData.profile) {
    return (
      <div className="client-detail-view error">
        <p>Unable to load client data</p>
        <button onClick={onBack}>Go Back</button>
      </div>
    );
  }

  const { profile, dailyLogs = [], weighIns = [], settings = {} } = clientData;

  // Safely extract profile fields (ensure they're strings, not objects)
  const firstName = typeof profile.firstName === 'string' ? profile.firstName : '';
  const lastName = typeof profile.lastName === 'string' ? profile.lastName : '';
  const displayName = typeof profile.displayName === 'string' ? profile.displayName : '';
  const email = typeof profile.email === 'string' ? profile.email : '';

  const clientName = firstName && lastName
    ? `${firstName} ${lastName}`
    : displayName || email || 'Client';

  const safeWeighIns = Array.isArray(weighIns) ? weighIns : [];
  const safeDailyLogs = Array.isArray(dailyLogs) ? dailyLogs : [];
  const safeCalorieTarget = typeof settings?.dailyCalorieTarget === 'number' ? settings.dailyCalorieTarget : undefined;
  const safeGoalWeight = typeof settings?.goalWeight === 'number' ? settings.goalWeight : undefined;

  const latestWeight = safeWeighIns[0]?.weight;
  const previousWeight = safeWeighIns[1]?.weight;
  const weightChange = latestWeight && previousWeight
    ? Math.round((latestWeight - previousWeight) * 10) / 10
    : null;

  // Calculate weekly averages
  const last7DaysLogs = safeDailyLogs.filter(log => {
    const logDate = new Date(log.date);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return logDate >= sevenDaysAgo;
  });

  const daysLogged = last7DaysLogs.length;

  // Prepare weight chart data with safety checks
  const weightChartData = useMemo(() => {
    if (!safeWeighIns || safeWeighIns.length === 0) return [];

    try {
      return safeWeighIns
        .slice(0, 30)
        .reverse()
        .filter(w => w && typeof w.weight === 'number' && w.date)
        .map(w => ({
          date: new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          weight: Number(w.weight),
        }));
    } catch {
      return [];
    }
  }, [safeWeighIns]);

  // Calculate weight range for Y-axis
  const weightRange = useMemo(() => {
    if (!weightChartData || weightChartData.length === 0) {
      return { min: 50, max: 100 };
    }
    try {
      const weights = weightChartData.map(w => w.weight).filter(w => typeof w === 'number');
      if (weights.length === 0) return { min: 50, max: 100 };

      const min = Math.min(...weights);
      const max = Math.max(...weights);
      const padding = (max - min) * 0.1 || 5;
      return {
        min: Math.floor(min - padding),
        max: Math.ceil(max + padding),
      };
    } catch {
      return { min: 50, max: 100 };
    }
  }, [weightChartData]);

  return (
    <div className="client-detail-view">
      {/* Header */}
      <div className="client-detail-header">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={20} />
          Back
        </button>
        <button
          className="terminate-btn"
          onClick={handleTerminate}
          disabled={terminating}
        >
          {terminating ? (
            <Loader2 size={16} className="spinner" />
          ) : (
            <UserX size={16} />
          )}
          Remove Client
        </button>
      </div>

      {/* Client Profile Card */}
      <div className="client-profile-card">
        <div className="client-avatar-large">
          {firstName?.[0] || clientName[0] || '?'}
        </div>
        <div className="client-info">
          <h2>{clientName}</h2>
          {email && <p className="email">{email}</p>}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <Scale size={20} />
          <div className="stat-content">
            <span className="stat-label">Current Weight</span>
            <span className="stat-value">
              {latestWeight ? `${latestWeight} kg` : 'No data'}
            </span>
            {weightChange !== null && (
              <span className={`stat-change ${weightChange < 0 ? 'positive' : 'negative'}`}>
                {weightChange < 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                {Math.abs(weightChange)} kg
              </span>
            )}
          </div>
        </div>

        <div className="stat-card">
          <Target size={20} />
          <div className="stat-content">
            <span className="stat-label">Calorie Target</span>
            <span className="stat-value">
              {safeCalorieTarget ? `${safeCalorieTarget} cal` : 'Not set'}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <Calendar size={20} />
          <div className="stat-content">
            <span className="stat-label">Days Logged (7d)</span>
            <span className="stat-value">{daysLogged} / 7</span>
          </div>
        </div>

        <div className="stat-card">
          <User size={20} />
          <div className="stat-content">
            <span className="stat-label">Goal Weight</span>
            <span className="stat-value">
              {safeGoalWeight ? `${safeGoalWeight} kg` : 'Not set'}
            </span>
          </div>
        </div>
      </div>

      {/* Weight Chart */}
      {weightChartData.length >= 2 && (
        <div className="detail-section chart-section">
          <h3>Weight Trend</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart
                data={weightChartData}
                margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  domain={[weightRange.min, weightRange.max]}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickLine={{ stroke: '#e5e7eb' }}
                  width={50}
                />
                <Tooltip
                  formatter={(value) => [`${value} kg`, 'Weight']}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ fill: '#6366f1', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Weight History */}
      <div className="detail-section">
        <h3>Recent Weigh-ins</h3>
        {safeWeighIns.length === 0 ? (
          <p className="no-data">No weigh-ins recorded</p>
        ) : (
          <div className="weighin-list">
            {safeWeighIns.slice(0, 10).map((weighIn, idx) => {
              const weighInDate = typeof weighIn.date === 'string' ? weighIn.date : '';
              const weight = typeof weighIn.weight === 'number' ? weighIn.weight : 0;
              const nextWeight = idx < safeWeighIns.length - 1 && typeof safeWeighIns[idx + 1]?.weight === 'number'
                ? safeWeighIns[idx + 1].weight : null;
              const weightDiff = nextWeight !== null ? Math.round((weight - nextWeight) * 10) / 10 : null;

              return (
                <div key={weighInDate || idx} className="weighin-item">
                  <span className="weighin-date">
                    {weighInDate ? new Date(weighInDate).toLocaleDateString() : 'Unknown'}
                  </span>
                  <span className="weighin-weight">{weight} kg</span>
                  {weightDiff !== null && (
                    <span className={`weighin-change ${weightDiff < 0 ? 'positive' : 'negative'}`}>
                      {weightDiff < 0 ? '-' : '+'}{Math.abs(weightDiff)} kg
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Activity Log */}
      <div className="detail-section">
        <h3>Recent Activity</h3>
        {safeDailyLogs.length === 0 ? (
          <p className="no-data">No activity logged</p>
        ) : (
          <div className="activity-list">
            {safeDailyLogs.slice(0, 14).map((log) => {
              const mealCount = (Array.isArray(log.meals) ? log.meals.length : 0) +
                               (Array.isArray(log.masterMealIds) ? log.masterMealIds.length : 0);
              const logDate = typeof log.date === 'string' ? log.date : '';
              const steps = log.healthMetrics &&
                           typeof log.healthMetrics === 'object' &&
                           typeof log.healthMetrics.steps === 'number'
                           ? log.healthMetrics.steps : null;
              return (
                <div key={logDate || Math.random()} className="activity-item">
                  <span className="activity-date">
                    {logDate ? new Date(logDate).toLocaleDateString() : 'Unknown date'}
                  </span>
                  <span className="activity-meals">{mealCount} meals logged</span>
                  {steps !== null && (
                    <span className="activity-metrics">
                      {steps.toLocaleString()} steps
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
