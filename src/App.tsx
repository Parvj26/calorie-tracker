import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Auth } from './components/Auth';
import { ResetPassword } from './components/ResetPassword';
import { LandingPage } from './components/LandingPage';
import { AuthenticatedApp } from './components/AuthenticatedApp';
import { Loader2 } from 'lucide-react';
import './App.css';

function AppContent() {
  const { user, loading, signOut, isPasswordRecovery, clearPasswordRecovery } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  // Show loading screen while checking auth
  if (loading) {
    return (
      <div className="app loading-screen">
        <Loader2 size={48} className="spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  // Show reset password screen if in password recovery mode
  if (isPasswordRecovery) {
    return (
      <ResetPassword
        onComplete={async () => {
          setShowAuth(true);
          window.history.replaceState({}, '', '/');
          await signOut();
          clearPasswordRecovery();
        }}
      />
    );
  }

  // Show landing page or auth screen if not logged in
  if (!user) {
    if (showAuth) {
      return <Auth onBack={() => setShowAuth(false)} />;
    }
    return <LandingPage onGetStarted={() => setShowAuth(true)} />;
  }

  // Only render authenticated app after confirming user is logged in
  return <AuthenticatedApp signOut={signOut} />;
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
