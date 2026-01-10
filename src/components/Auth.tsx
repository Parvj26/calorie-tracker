import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, LogIn, UserPlus, Loader2, ArrowLeft, KeyRound } from 'lucide-react';

interface AuthProps {
  onBack?: () => void;
}

type AuthView = 'login' | 'signup' | 'forgot';

export const Auth: React.FC<AuthProps> = ({ onBack }) => {
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const { signIn, signUp, resetPasswordForEmail } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (view === 'login') {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message);
      }
    } else if (view === 'signup') {
      const { error } = await signUp(email, password);
      if (error) {
        setError(error.message);
      } else {
        setMessage('Check your email for a confirmation link!');
      }
    } else if (view === 'forgot') {
      const { error } = await resetPasswordForEmail(email);
      if (error) {
        setError(error.message);
      } else {
        setMessage('Check your email for a password reset link!');
      }
    }

    setLoading(false);
  };

  const switchView = (newView: AuthView) => {
    setView(newView);
    setError(null);
    setMessage(null);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {onBack && (
          <button className="auth-back-btn" onClick={onBack} type="button">
            <ArrowLeft size={20} />
            Back
          </button>
        )}
        <div className="auth-header">
          <h1>CalorieTracker</h1>
          <p>
            {view === 'forgot'
              ? 'Reset your password'
              : 'Your personalized nutrition companion'}
          </p>
        </div>

        {view !== 'forgot' && (
          <div className="auth-tabs">
            <button
              className={view === 'login' ? 'active' : ''}
              onClick={() => switchView('login')}
            >
              <LogIn size={18} />
              Sign In
            </button>
            <button
              className={view === 'signup' ? 'active' : ''}
              onClick={() => switchView('signup')}
            >
              <UserPlus size={18} />
              Sign Up
            </button>
          </div>
        )}

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

          {view !== 'forgot' && (
            <div className="input-group">
              <Lock size={18} className="input-icon" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}
          {message && <div className="auth-message">{message}</div>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={18} className="spinner" />
                {view === 'login' ? 'Signing in...' : view === 'signup' ? 'Creating account...' : 'Sending...'}
              </>
            ) : (
              <>
                {view === 'login' ? <LogIn size={18} /> : view === 'signup' ? <UserPlus size={18} /> : <KeyRound size={18} />}
                {view === 'login' ? 'Sign In' : view === 'signup' ? 'Create Account' : 'Send Reset Link'}
              </>
            )}
          </button>

          {view === 'login' && (
            <button
              type="button"
              className="auth-forgot-link"
              onClick={() => switchView('forgot')}
            >
              Forgot password?
            </button>
          )}
        </form>

        <p className="auth-footer">
          {view === 'login' && (
            <>
              Don't have an account?{' '}
              <button type="button" className="auth-switch" onClick={() => switchView('signup')}>
                Sign up
              </button>
            </>
          )}
          {view === 'signup' && (
            <>
              Already have an account?{' '}
              <button type="button" className="auth-switch" onClick={() => switchView('login')}>
                Sign in
              </button>
            </>
          )}
          {view === 'forgot' && (
            <>
              Remember your password?{' '}
              <button type="button" className="auth-switch" onClick={() => switchView('login')}>
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
};
