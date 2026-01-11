import React, { useState, useEffect } from 'react';
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

  if (!clientData) {
    return (
      <div className="client-detail-view error">
        <p>Unable to load client data</p>
        <button onClick={onBack}>Go Back</button>
      </div>
    );
  }

  const { profile, dailyLogs, weighIns, settings } = clientData;
  const clientName = profile.firstName && profile.lastName
    ? `${profile.firstName} ${profile.lastName}`
    : profile.displayName || profile.email || 'Client';

  const latestWeight = weighIns[0]?.weight;
  const previousWeight = weighIns[1]?.weight;
  const weightChange = latestWeight && previousWeight
    ? Math.round((latestWeight - previousWeight) * 10) / 10
    : null;

  // Calculate weekly averages
  const last7DaysLogs = dailyLogs.filter(log => {
    const logDate = new Date(log.date);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return logDate >= sevenDaysAgo;
  });

  const daysLogged = last7DaysLogs.length;

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
          {profile.firstName?.[0] || clientName[0]}
        </div>
        <div className="client-info">
          <h2>{clientName}</h2>
          {profile.email && <p className="email">{profile.email}</p>}
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
              {settings.dailyCalorieTarget ? `${settings.dailyCalorieTarget} cal` : 'Not set'}
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
              {settings.goalWeight ? `${settings.goalWeight} kg` : 'Not set'}
            </span>
          </div>
        </div>
      </div>

      {/* Weight History */}
      <div className="detail-section">
        <h3>Recent Weigh-ins</h3>
        {weighIns.length === 0 ? (
          <p className="no-data">No weigh-ins recorded</p>
        ) : (
          <div className="weighin-list">
            {weighIns.slice(0, 10).map((weighIn, idx) => (
              <div key={weighIn.date} className="weighin-item">
                <span className="weighin-date">
                  {new Date(weighIn.date).toLocaleDateString()}
                </span>
                <span className="weighin-weight">{weighIn.weight} kg</span>
                {idx < weighIns.length - 1 && (
                  <span
                    className={`weighin-change ${
                      weighIn.weight < weighIns[idx + 1].weight ? 'positive' : 'negative'
                    }`}
                  >
                    {weighIn.weight < weighIns[idx + 1].weight ? '-' : '+'}
                    {Math.abs(
                      Math.round((weighIn.weight - weighIns[idx + 1].weight) * 10) / 10
                    )}{' '}
                    kg
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity Log */}
      <div className="detail-section">
        <h3>Recent Activity</h3>
        {dailyLogs.length === 0 ? (
          <p className="no-data">No activity logged</p>
        ) : (
          <div className="activity-list">
            {dailyLogs.slice(0, 14).map((log) => {
              const mealCount = (log.meals?.length || 0) + (log.masterMealIds?.length || 0);
              return (
                <div key={log.date} className="activity-item">
                  <span className="activity-date">
                    {new Date(log.date).toLocaleDateString()}
                  </span>
                  <span className="activity-meals">{mealCount} meals logged</span>
                  {log.healthMetrics && (
                    <span className="activity-metrics">
                      {log.healthMetrics.steps?.toLocaleString()} steps
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
