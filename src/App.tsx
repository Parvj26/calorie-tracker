import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import {
  LayoutDashboard,
  TrendingUp,
  ScanLine,
  Calendar,
  Settings as SettingsIcon,
  LogOut,
  Cloud,
  CloudOff,
  Loader2,
} from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useCalorieTracker } from './hooks/useCalorieTracker';
import { Dashboard } from './components/Dashboard';
import { ProgressTracker } from './components/ProgressTracker';
import { InBodyUpload } from './components/InBodyUpload';
import { WeeklySummary } from './components/WeeklySummary';
import { Settings } from './components/Settings';
import { Auth } from './components/Auth';
import type { TabType } from './types';
import './App.css';

function AppContent() {
  const { user, loading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const {
    meals,
    inBodyScans,
    weighIns,
    settings,
    syncState,
    getLogForDate,
    toggleMealForDate,
    updateWorkoutCalories,
    updateHealthMetrics,
    calculateTotals,
    addMeal,
    deleteMeal,
    logScannedMeal,
    saveAndLogMeal,
    addInBodyScan,
    deleteInBodyScan,
    addWeighIn,
    deleteWeighIn,
    updateSettings,
    getWeeklySummary,
    getProgressData,
    getGoalProgress,
    getLatestInBodyMetrics,
  } = useCalorieTracker();

  // All hooks must be called before any conditional returns
  const currentLog = useMemo(() => getLogForDate(selectedDate), [selectedDate, getLogForDate]);
  const totals = useMemo(() => calculateTotals(currentLog), [currentLog, calculateTotals]);
  const weeklySummary = useMemo(() => getWeeklySummary(), [getWeeklySummary]);
  const progressData = useMemo(() => getProgressData(), [getProgressData]);
  const goalProgress = useMemo(() => getGoalProgress(), [getGoalProgress]);
  const latestInBodyMetrics = useMemo(() => getLatestInBodyMetrics(), [getLatestInBodyMetrics]);

  // Show loading screen while checking auth
  if (loading) {
    return (
      <div className="app loading-screen">
        <Loader2 size={48} className="spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  // Show auth screen if not logged in
  if (!user) {
    return <Auth />;
  }

  const tabs = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'progress' as TabType, label: 'Progress', icon: TrendingUp },
    { id: 'inbody' as TabType, label: 'InBody', icon: ScanLine },
    { id: 'summary' as TabType, label: 'Summary', icon: Calendar },
    { id: 'settings' as TabType, label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>CalorieTracker</h1>
          <span className="subtitle">Your personalized nutrition companion</span>
        </div>
        <div className="header-right">
          <div className="sync-status" title={syncState.lastSynced ? `Last synced: ${syncState.lastSynced.toLocaleTimeString()}` : 'Not synced yet'}>
            {syncState.isSyncing ? (
              <Loader2 size={16} className="spinner" />
            ) : syncState.error ? (
              <CloudOff size={16} className="sync-error" />
            ) : (
              <Cloud size={16} className="sync-ok" />
            )}
          </div>
          <button className="logout-btn" onClick={signOut} title="Sign out">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <nav className="app-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`nav-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={20} />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      <main className="app-main">
        {activeTab === 'dashboard' && (
          <Dashboard
            meals={meals}
            selectedDate={selectedDate}
            log={currentLog}
            settings={settings}
            totals={totals}
            inBodyMetrics={latestInBodyMetrics}
            goalProgress={goalProgress}
            onToggleMeal={toggleMealForDate}
            onUpdateWorkoutCalories={updateWorkoutCalories}
            onUpdateHealthMetrics={updateHealthMetrics}
            onAddMeal={addMeal}
            onDeleteMeal={deleteMeal}
            onDateChange={setSelectedDate}
            onLogScannedMeal={logScannedMeal}
            onSaveAndLogMeal={saveAndLogMeal}
          />
        )}

        {activeTab === 'progress' && (
          <ProgressTracker
            weighIns={weighIns}
            settings={settings}
            progressData={progressData}
            goalProgress={goalProgress}
            onAddWeighIn={addWeighIn}
            onDeleteWeighIn={deleteWeighIn}
          />
        )}

        {activeTab === 'inbody' && (
          <InBodyUpload
            scans={inBodyScans}
            aiProvider={settings.aiProvider || 'groq'}
            openAiApiKey={settings.openAiApiKey}
            groqApiKey={settings.groqApiKey}
            onAddScan={addInBodyScan}
            onDeleteScan={deleteInBodyScan}
          />
        )}

        {activeTab === 'summary' && (
          <WeeklySummary
            summary={weeklySummary}
            goalProgress={goalProgress}
          />
        )}

        {activeTab === 'settings' && (
          <Settings
            settings={settings}
            onUpdateSettings={updateSettings}
          />
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
