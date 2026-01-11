import React, { useState } from 'react';
import { useCoachClients } from '../../hooks/useCoachClients';
import { useUserProfile } from '../../hooks/useUserProfile';
import {
  Users,
  Copy,
  Check,
  AlertTriangle,
  Clock,
  TrendingDown,
  TrendingUp,
  ChevronRight,
  Loader2,
  Bell,
  UserCheck,
  UserX,
} from 'lucide-react';
import type { ClientSummary } from '../../types';

interface CoachDashboardProps {
  onViewClient?: (clientId: string) => void;
}

export const CoachDashboard: React.FC<CoachDashboardProps> = ({ onViewClient }) => {
  const { coachCode } = useUserProfile();
  const {
    clients,
    pendingRequests,
    alerts,
    loading,
    error,
    acceptRequest,
    rejectRequest,
    refreshClients,
  } = useCoachClients();

  const [copiedCode, setCopiedCode] = useState(false);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  const copyCode = () => {
    if (coachCode) {
      navigator.clipboard.writeText(coachCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleAccept = async (requestId: string) => {
    setProcessingRequest(requestId);
    await acceptRequest(requestId);
    setProcessingRequest(null);
  };

  const handleReject = async (requestId: string) => {
    if (!confirm('Are you sure you want to reject this request?')) return;
    setProcessingRequest(requestId);
    await rejectRequest(requestId);
    setProcessingRequest(null);
  };

  const getClientName = (
    client: { firstName?: string; lastName?: string; displayName?: string; email?: string } | undefined
  ) => {
    if (!client) return 'Client';
    const firstName = typeof client.firstName === 'string' ? client.firstName : '';
    const lastName = typeof client.lastName === 'string' ? client.lastName : '';
    const displayName = typeof client.displayName === 'string' ? client.displayName : '';
    const email = typeof client.email === 'string' ? client.email : '';

    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    return displayName || email || 'Client';
  };

  if (loading) {
    return (
      <div className="coach-dashboard loading">
        <Loader2 size={32} className="spinner" />
        <p>Loading your clients...</p>
      </div>
    );
  }

  return (
    <div className="coach-dashboard">
      {/* Coach Code Section */}
      <div className="coach-code-section">
        <div className="coach-code-content">
          <h3>Your Coach Code</h3>
          <p>Share this code with clients so they can connect with you</p>
          <div className="coach-code-display">
            <span className="code">{coachCode || 'Loading...'}</span>
            <button
              className="copy-btn"
              onClick={copyCode}
              disabled={!coachCode}
            >
              {copiedCode ? <Check size={18} /> : <Copy size={18} />}
              {copiedCode ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      {/* Overview Stats Bar */}
      {clients.length > 0 && (
        <div className="coach-overview-stats">
          <div className="overview-stat">
            <span className="stat-number">{clients.length}</span>
            <span className="stat-label">Total Clients</span>
          </div>
          <div className="overview-stat on-track">
            <span className="stat-number">
              {clients.filter(c => !c.isInactive && c.calorieTarget && c.caloriesToday !== undefined &&
                Math.abs((c.caloriesToday || 0) - c.calorieTarget) <= c.calorieTarget * 0.1).length}
            </span>
            <span className="stat-label">On Track</span>
          </div>
          <div className="overview-stat needs-attention">
            <span className="stat-number">
              {clients.filter(c => !c.isInactive && c.calorieTarget && c.caloriesToday !== undefined &&
                (c.caloriesToday || 0) < c.calorieTarget * 0.5).length}
            </span>
            <span className="stat-label">Low Intake</span>
          </div>
          <div className="overview-stat inactive">
            <span className="stat-number">{clients.filter(c => c.isInactive).length}</span>
            <span className="stat-label">Inactive</span>
          </div>
        </div>
      )}

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="coach-alerts-section">
          <h3><Bell size={18} /> Alerts</h3>
          <div className="alerts-list">
            {alerts.map((alert, index) => {
              const alertMessage = typeof alert.message === 'string' ? alert.message : 'Alert';
              const alertType = typeof alert.type === 'string' ? alert.type : '';
              const alertSeverity = typeof alert.severity === 'string' ? alert.severity : '';
              const alertClientId = typeof alert.clientId === 'string' ? alert.clientId : null;
              const alertId = typeof alert.id === 'string' ? alert.id : `alert-${alertType}-${alertClientId || index}`;

              return (
                <div
                  key={alertId}
                  className={`alert-item ${alertSeverity} ${alertType}`}
                >
                  <div className="alert-icon">
                    {alertType === 'inactive' && <Clock size={18} />}
                    {alertType === 'new_request' && <UserCheck size={18} />}
                    {alertType === 'plateau' && <TrendingDown size={18} />}
                    {alertType === 'missed_targets' && <AlertTriangle size={18} />}
                  </div>
                  <div className="alert-content">
                    <span className="alert-message">{alertMessage}</span>
                  </div>
                  {alertType !== 'new_request' && alertClientId && (
                    <button
                      className="alert-action"
                      onClick={() => onViewClient?.(alertClientId)}
                    >
                      View
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="pending-requests-section">
          <h3><Clock size={18} /> Pending Requests ({pendingRequests.length})</h3>
          <div className="requests-list">
            {pendingRequests.map((request) => {
              const reqFirstName = typeof request.clientProfile?.firstName === 'string' ? request.clientProfile.firstName : '';
              const reqEmail = typeof request.clientProfile?.email === 'string' ? request.clientProfile.email : '';
              const avatarInitial = reqFirstName?.[0] || reqEmail?.[0] || '?';

              return (
                <div key={request.id} className="request-card">
                  <div className="request-info">
                    <div className="client-avatar">
                      {avatarInitial}
                    </div>
                    <div className="client-details">
                      <strong>{getClientName(request.clientProfile)}</strong>
                      {reqEmail && (
                        <span className="client-email">{reqEmail}</span>
                      )}
                    </div>
                  </div>
                <div className="request-actions">
                  <button
                    className="accept-btn"
                    onClick={() => handleAccept(request.id)}
                    disabled={processingRequest === request.id}
                  >
                    {processingRequest === request.id ? (
                      <Loader2 size={16} className="spinner" />
                    ) : (
                      <UserCheck size={16} />
                    )}
                    Accept
                  </button>
                  <button
                    className="reject-btn"
                    onClick={() => handleReject(request.id)}
                    disabled={processingRequest === request.id}
                  >
                    <UserX size={16} />
                    Reject
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Connected Clients */}
      <div className="clients-section">
        <div className="section-header">
          <h3><Users size={18} /> Your Clients ({clients.length})</h3>
          <button className="refresh-btn" onClick={refreshClients}>
            Refresh
          </button>
        </div>

        {clients.length === 0 ? (
          <div className="empty-clients">
            <Users size={48} />
            <h4>No clients yet</h4>
            <p>Share your coach code with clients to get started.</p>
          </div>
        ) : (
          <div className="clients-grid">
            {clients.map((client) => (
              <ClientCard
                key={client.clientId}
                client={client}
                onClick={() => onViewClient?.(client.clientId)}
              />
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="coach-error-banner">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}
    </div>
  );
};

// Client Card Component
interface ClientCardProps {
  client: ClientSummary;
  onClick?: () => void;
}

const ClientCard: React.FC<ClientCardProps> = ({ client, onClick }) => {
  // Safely extract profile fields (ensure they're strings, not objects)
  const firstName = typeof client.profile?.firstName === 'string' ? client.profile.firstName : '';
  const lastName = typeof client.profile?.lastName === 'string' ? client.profile.lastName : '';
  const displayName = typeof client.profile?.displayName === 'string' ? client.profile.displayName : '';
  const email = typeof client.profile?.email === 'string' ? client.profile.email : '';

  const name = firstName && lastName
    ? `${firstName} ${lastName}`
    : displayName || email || 'Client';

  const initials = firstName && lastName
    ? `${firstName[0]}${lastName[0]}`
    : name[0] || '?';

  // Safely extract numeric values
  const calorieTarget = typeof client.calorieTarget === 'number' ? client.calorieTarget : 0;
  const caloriesToday = typeof client.caloriesToday === 'number' ? client.caloriesToday : 0;
  const latestWeight = typeof client.latestWeight === 'number' ? client.latestWeight : null;
  const weightChange7Days = typeof client.weightChange7Days === 'number' ? client.weightChange7Days : null;
  const daysInactive = typeof client.daysInactive === 'number' ? client.daysInactive : 0;
  const lastActivityDate = typeof client.lastActivityDate === 'string' ? client.lastActivityDate : '';

  // Calculate calorie progress percentage
  const calorieProgress = calorieTarget > 0
    ? Math.min(100, Math.round((caloriesToday / calorieTarget) * 100))
    : 0;

  // Determine status
  const getStatus = () => {
    if (client.isInactive) return 'inactive';
    if (calorieTarget > 0) {
      const diff = caloriesToday - calorieTarget;
      if (Math.abs(diff) <= calorieTarget * 0.1) return 'on-track'; // Within 10%
      if (caloriesToday < calorieTarget * 0.5) return 'needs-attention'; // Under 50%
    }
    return 'on-track';
  };
  const status = getStatus();

  return (
    <div
      className={`client-card ${status}`}
      onClick={onClick}
    >
      <div className="client-header">
        <div className="client-avatar large">
          {initials.toUpperCase()}
        </div>
        <div className="client-name-section">
          <strong>{name}</strong>
          <span className={`status-badge ${status}`}>
            {status === 'inactive' && <><Clock size={12} /> {daysInactive}d inactive</>}
            {status === 'on-track' && 'On Track'}
            {status === 'needs-attention' && <><AlertTriangle size={12} /> Needs Attention</>}
          </span>
        </div>
      </div>

      {/* Calorie Progress Bar */}
      {calorieTarget > 0 && (
        <div className="calorie-progress-section">
          <div className="calorie-progress-header">
            <span className="calorie-label">Today's Calories</span>
            <span className="calorie-numbers">
              <strong>{caloriesToday}</strong> / {calorieTarget}
            </span>
          </div>
          <div className="calorie-progress-bar">
            <div
              className={`calorie-progress-fill ${calorieProgress > 100 ? 'over' : ''}`}
              style={{ width: `${Math.min(100, calorieProgress)}%` }}
            />
          </div>
        </div>
      )}

      <div className="client-stats">
        {latestWeight !== null && (
          <div className="stat">
            <span className="stat-label">Weight</span>
            <span className="stat-value">
              {latestWeight} kg
              {weightChange7Days !== null && (
                <span className={`trend ${weightChange7Days < 0 ? 'down' : 'up'}`}>
                  {weightChange7Days < 0 ? (
                    <TrendingDown size={14} />
                  ) : (
                    <TrendingUp size={14} />
                  )}
                  {Math.abs(weightChange7Days)} kg
                </span>
              )}
            </span>
          </div>
        )}

        {lastActivityDate && (
          <div className="stat">
            <span className="stat-label">Last Active</span>
            <span className="stat-value">
              {new Date(lastActivityDate).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      <div className="view-details">
        <span>View Details</span>
        <ChevronRight size={16} />
      </div>
    </div>
  );
};
