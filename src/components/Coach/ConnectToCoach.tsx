import React, { useState } from 'react';
import { useCoachCode } from '../../hooks/useCoachCode';
import { Link2, Search, Loader2, Check, X, UserX, Clock } from 'lucide-react';

interface CoachLookupResult {
  userId: string;
  email?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
}

export const ConnectToCoach: React.FC = () => {
  const {
    loading,
    error,
    coachConnection,
    lookupCoach,
    requestConnection,
    cancelRequest,
    disconnectFromCoach,
  } = useCoachCode();

  const [code, setCode] = useState('');
  const [foundCoach, setFoundCoach] = useState<CoachLookupResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleLookup = async () => {
    if (!code.trim()) return;

    setFoundCoach(null);
    setLookupError(null);
    setSuccessMessage(null);

    const coach = await lookupCoach(code.trim());
    if (coach) {
      setFoundCoach(coach);
    } else {
      setLookupError(error || 'Coach not found');
    }
  };

  const handleConnect = async () => {
    if (!foundCoach) return;

    const success = await requestConnection(foundCoach.userId);
    if (success) {
      setSuccessMessage('Connection request sent!');
      setFoundCoach(null);
      setCode('');
    }
  };

  const handleCancel = async () => {
    const success = await cancelRequest();
    if (success) {
      setSuccessMessage('Request cancelled');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect from your coach?')) return;

    const success = await disconnectFromCoach();
    if (success) {
      setSuccessMessage('Disconnected from coach');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const getCoachName = (coach: { firstName?: string; lastName?: string; displayName?: string; email?: string }) => {
    if (coach.firstName && coach.lastName) {
      return `${coach.firstName} ${coach.lastName}`;
    }
    return coach.displayName || coach.email || 'Coach';
  };

  // Show existing connection
  if (coachConnection) {
    const isPending = coachConnection.status === 'pending';
    const coachName = coachConnection.coachProfile
      ? getCoachName(coachConnection.coachProfile)
      : 'Your Coach';

    return (
      <div className="coach-connection-section">
        <h3><Link2 size={18} /> Coach Connection</h3>

        <div className={`coach-connection-status ${isPending ? 'pending' : 'connected'}`}>
          <div className="connection-info">
            {isPending ? (
              <>
                <Clock size={20} className="status-icon pending" />
                <div>
                  <strong>Pending Request</strong>
                  <p>Waiting for {coachName} to accept</p>
                </div>
              </>
            ) : (
              <>
                <Check size={20} className="status-icon connected" />
                <div>
                  <strong>Connected to {coachName}</strong>
                  <p>Your coach can view your progress</p>
                </div>
              </>
            )}
          </div>

          <button
            className="disconnect-btn"
            onClick={isPending ? handleCancel : handleDisconnect}
            disabled={loading}
          >
            {isPending ? (
              <>
                <X size={16} />
                Cancel Request
              </>
            ) : (
              <>
                <UserX size={16} />
                Disconnect
              </>
            )}
          </button>
        </div>

        {successMessage && (
          <div className="coach-success-message">{successMessage}</div>
        )}
      </div>
    );
  }

  // Show lookup form
  return (
    <div className="coach-connection-section">
      <h3><Link2 size={18} /> Connect to Coach</h3>
      <p className="section-description">
        Enter your coach's code to connect and share your progress with them.
      </p>

      <div className="coach-lookup-form">
        <div className="input-with-button">
          <input
            type="text"
            placeholder="Enter coach code (e.g., ABC12XYZ)"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={8}
            disabled={loading}
          />
          <button
            onClick={handleLookup}
            disabled={!code.trim() || loading}
            className="lookup-btn"
          >
            {loading ? <Loader2 size={18} className="spinner" /> : <Search size={18} />}
            Look Up
          </button>
        </div>

        {lookupError && (
          <div className="coach-error-message">{lookupError}</div>
        )}

        {foundCoach && (
          <div className="coach-found-card">
            <div className="coach-info">
              <div className="coach-avatar">
                {foundCoach.firstName?.[0] || foundCoach.email?.[0] || '?'}
              </div>
              <div>
                <strong>{getCoachName(foundCoach)}</strong>
                {foundCoach.email && <p>{foundCoach.email}</p>}
              </div>
            </div>
            <button
              onClick={handleConnect}
              disabled={loading}
              className="connect-btn"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="spinner" />
                  Connecting...
                </>
              ) : (
                <>
                  <Link2 size={18} />
                  Send Request
                </>
              )}
            </button>
          </div>
        )}

        {successMessage && (
          <div className="coach-success-message">{successMessage}</div>
        )}

        {error && !lookupError && (
          <div className="coach-error-message">{error}</div>
        )}
      </div>
    </div>
  );
};
