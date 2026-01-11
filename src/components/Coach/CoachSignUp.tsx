import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Lock, UserPlus, Loader2, ArrowLeft, Users } from 'lucide-react';

interface CoachSignUpProps {
  onBack: () => void;
}

export const CoachSignUp: React.FC<CoachSignUpProps> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const { signUpAsCoach } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const { error } = await signUpAsCoach(email, password);
    if (error) {
      setError(error.message);
    } else {
      setMessage('Check your email for a confirmation link! Once confirmed, you\'ll get your unique coach code.');
    }

    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <button className="auth-back-btn" onClick={onBack} type="button">
          <ArrowLeft size={20} />
          Back
        </button>

        <div className="auth-header">
          <div className="coach-badge">
            <Users size={24} />
            <span>Coach Account</span>
          </div>
          <h1>CalorieTracker</h1>
          <p>Create your coach account to track your clients' progress</p>
        </div>

        <div className="coach-features">
          <div className="coach-feature">
            <span className="feature-icon">🔗</span>
            <span>Get a unique code to share with clients</span>
          </div>
          <div className="coach-feature">
            <span className="feature-icon">📊</span>
            <span>View all connected clients' data in real-time</span>
          </div>
          <div className="coach-feature">
            <span className="feature-icon">🔔</span>
            <span>Receive alerts when clients need attention</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <Mail size={18} className="input-icon" />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <Lock size={18} className="input-icon" />
            <input
              type="password"
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {error && <div className="auth-error">{error}</div>}
          {message && <div className="auth-message">{message}</div>}

          <button type="submit" className="auth-submit coach-submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={18} className="spinner" />
                Creating coach account...
              </>
            ) : (
              <>
                <UserPlus size={18} />
                Create Coach Account
              </>
            )}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <button type="button" className="auth-switch" onClick={onBack}>
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
};
