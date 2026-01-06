import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import {
  LayoutDashboard,
  TrendingUp,
  ScanLine,
  Calendar,
  Settings as SettingsIcon,
} from 'lucide-react';
import { useCalorieTracker } from './hooks/useCalorieTracker';
import { Dashboard } from './components/Dashboard';
import { ProgressTracker } from './components/ProgressTracker';
import { InBodyUpload } from './components/InBodyUpload';
import { WeeklySummary } from './components/WeeklySummary';
import { Settings } from './components/Settings';
import type { TabType } from './types';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const {
    meals,
    inBodyScans,
    weighIns,
    settings,
    getLogForDate,
    toggleMealForDate,
    updateWorkoutCalories,
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

  const currentLog = useMemo(() => getLogForDate(selectedDate), [selectedDate, getLogForDate]);
  const totals = useMemo(() => calculateTotals(currentLog), [currentLog, calculateTotals]);
  const weeklySummary = useMemo(() => getWeeklySummary(), [getWeeklySummary]);
  const progressData = useMemo(() => getProgressData(), [getProgressData]);
  const goalProgress = useMemo(() => getGoalProgress(), [getGoalProgress]);
  const latestInBodyMetrics = useMemo(() => getLatestInBodyMetrics(), [getLatestInBodyMetrics]);

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
        <h1>CalorieTracker</h1>
        <span className="subtitle">Your personalized nutrition companion</span>
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
            apiKey={settings.openAiApiKey}
            onAddScan={addInBodyScan}
            onDeleteScan={deleteInBodyScan}
            onUpdateApiKey={(key) => updateSettings({ openAiApiKey: key })}
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

export default App;
