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
    client: { firstName?: string; lastName?: string; displayName?: string; email?: string }
  ) => {
    if (client.firstName && client.lastName) {
      return `${client.firstName} ${client.lastName}`;
    }
    return client.displayName || client.email || 'Client';
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

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="coach-alerts-section">
          <h3><Bell size={18} /> Alerts</h3>
          <div className="alerts-list">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`alert-item ${alert.severity} ${alert.type}`}
              >
                <div className="alert-icon">
                  {alert.type === 'inactive' && <Clock size={18} />}
                  {alert.type === 'new_request' && <UserCheck size={18} />}
                  {alert.type === 'plateau' && <TrendingDown size={18} />}
                  {alert.type === 'missed_targets' && <AlertTriangle size={18} />}
                </div>
                <div className="alert-content">
                  <span className="alert-message">{alert.message}</span>
                </div>
                {alert.type !== 'new_request' && alert.clientId && (
                  <button
                    className="alert-action"
                    onClick={() => onViewClient?.(alert.clientId!)}
                  >
                    View
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="pending-requests-section">
          <h3><Clock size={18} /> Pending Requests ({pendingRequests.length})</h3>
          <div className="requests-list">
            {pendingRequests.map((request) => (
              <div key={request.id} className="request-card">
                <div className="request-info">
                  <div className="client-avatar">
                    {request.clientProfile?.firstName?.[0] ||
                      request.clientProfile?.email?.[0] ||
                      '?'}
                  </div>
                  <div className="client-details">
                    <strong>
                      {request.clientProfile
                        ? getClientName(request.clientProfile)
                        : 'Client'}
                    </strong>
                    {request.clientProfile?.email && (
                      <span className="client-email">{request.clientProfile.email}</span>
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
            ))}
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
  const name = client.profile.firstName && client.profile.lastName
    ? `${client.profile.firstName} ${client.profile.lastName}`
    : client.profile.displayName || client.profile.email || 'Client';

  const initials = client.profile.firstName && client.profile.lastName
    ? `${client.profile.firstName[0]}${client.profile.lastName[0]}`
    : name[0];

  return (
    <div
      className={`client-card ${client.isInactive ? 'inactive' : ''}`}
      onClick={onClick}
    >
      <div className="client-header">
        <div className="client-avatar large">
          {initials.toUpperCase()}
        </div>
        <div className="client-name-section">
          <strong>{name}</strong>
          {client.isInactive && (
            <span className="inactive-badge">
              <Clock size={12} />
              {client.daysInactive}d inactive
            </span>
          )}
        </div>
      </div>

      <div className="client-stats">
        {client.latestWeight && (
          <div className="stat">
            <span className="stat-label">Weight</span>
            <span className="stat-value">
              {client.latestWeight} kg
              {client.weightChange7Days !== undefined && (
                <span
                  className={`trend ${client.weightChange7Days < 0 ? 'down' : 'up'}`}
                >
                  {client.weightChange7Days < 0 ? (
                    <TrendingDown size={14} />
                  ) : (
                    <TrendingUp size={14} />
                  )}
                  {Math.abs(client.weightChange7Days)} kg
                </span>
              )}
            </span>
          </div>
        )}

        {client.calorieTarget && (
          <div className="stat">
            <span className="stat-label">Target</span>
            <span className="stat-value">{client.calorieTarget} cal</span>
          </div>
        )}

        {client.lastActivityDate && (
          <div className="stat">
            <span className="stat-label">Last Active</span>
            <span className="stat-value">
              {new Date(client.lastActivityDate).toLocaleDateString()}
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
