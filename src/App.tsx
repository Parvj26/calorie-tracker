import { useState, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import {
  LayoutDashboard,
  Utensils,
  TrendingUp,
  ScanLine,
  Calendar,
  Settings as SettingsIcon,
  LogOut,
  Loader2,
  Globe,
} from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useCalorieTracker } from './hooks/useCalorieTracker';
import { useUserProfile } from './hooks/useUserProfile';
import { useMasterMeals } from './hooks/useMasterMeals';
import { useMealSubmissions } from './hooks/useMealSubmissions';
import { Dashboard } from './components/Dashboard';
import { LogMeals } from './components/LogMeals';
import { ProgressTracker } from './components/ProgressTracker';
import { InBodyUpload } from './components/InBodyUpload';
import { WeeklySummary } from './components/WeeklySummary';
import { Settings } from './components/Settings';
import { Auth } from './components/Auth';
import { DiscoverTab } from './components/Discover/DiscoverTab';
import { ProfileSetupModal } from './components/ProfileSetupModal';
import type { TabType } from './types';
import './App.css';

function AppContent() {
  const { user, loading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const {
    meals,
    deletedMeals,
    dailyLogs,
    inBodyScans,
    weighIns,
    settings,
    getLogForDate,
    toggleMealForDate,
    updateMealQuantity,
    updateWorkoutCalories,
    updateHealthMetrics,
    calculateTotals,
    addMeal,
    updateMeal,
    deleteMeal,
    restoreMeal,
    permanentlyDeleteMeal,
    getDaysUntilExpiry,
    toggleFavorite,
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
    addMasterMealToLog,
    removeMasterMealFromLog,
    updateMasterMealQuantity,
    saveMasterMealToLibrary,
    removeMasterMealFromLibrary,
    getMealId,
    getMealQuantity,
    getMealUnit,
    getMasterMealId,
    getMasterMealQuantity,
    getMasterMealUnit,
    getServingMultiplier,
  } = useCalorieTracker();

  // User profile and admin status
  const { profile, isAdmin, needsProfileSetup, updateProfile } = useUserProfile();

  // Master meals for discover tab
  const {
    masterMeals,
    loading: masterMealsLoading,
    searchQuery: masterMealSearchQuery,
    setSearchQuery: setMasterMealSearchQuery,
    loadMasterMeals,
    incrementUsageCount,
    deleteMasterMeal,
    checkDuplicateName,
  } = useMasterMeals();

  // Meal submissions (user submissions + admin management)
  const {
    submissions,
    pendingCount,
    submitMealForReview,
    cancelSubmission,
    approveSubmission,
    rejectSubmission,
    loadPendingSubmissions,
  } = useMealSubmissions(isAdmin);

  // Refresh master meals after approval
  const handleRefreshMasterMeals = useCallback(() => {
    loadMasterMeals();
    loadPendingSubmissions();
  }, [loadMasterMeals, loadPendingSubmissions]);

  // All hooks must be called before any conditional returns
  const currentLog = useMemo(() => getLogForDate(selectedDate), [selectedDate, getLogForDate]);
  const totals = useMemo(() => calculateTotals(currentLog), [currentLog, calculateTotals]);
  const weeklySummary = useMemo(() => getWeeklySummary(), [getWeeklySummary]);
  const progressData = useMemo(() => getProgressData(), [getProgressData]);
  const goalProgress = useMemo(() => getGoalProgress(), [getGoalProgress]);

  // Get master meals to display in Dashboard (saved to library OR logged for current day)
  const displayMasterMeals = useMemo(() => {
    const savedIds = settings.savedMasterMealIds || [];
    const loggedIds = currentLog.masterMealIds || [];
    const allIds = [...new Set([...savedIds, ...loggedIds])];
    return masterMeals.filter(meal => allIds.includes(meal.id));
  }, [settings.savedMasterMealIds, currentLog.masterMealIds, masterMeals]);

  // Toggle master meal in daily log (add if not present, remove if present)
  const handleToggleMasterMeal = useCallback((mealId: string, date: string) => {
    const log = getLogForDate(date);
    if (log.masterMealIds?.includes(mealId)) {
      removeMasterMealFromLog(mealId, date);
    } else {
      addMasterMealToLog(mealId, date);
      incrementUsageCount(mealId);
    }
  }, [getLogForDate, addMasterMealToLog, removeMasterMealFromLog, incrementUsageCount]);

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
    { id: 'log' as TabType, label: 'Log', icon: Utensils },
    { id: 'discover' as TabType, label: 'Discover', icon: Globe },
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
          {profile && (
            <div className="user-initials" title={`${profile.firstName || ''} ${profile.lastName || ''}`.trim() || profile.email}>
              {profile.firstName && profile.lastName
                ? `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase()
                : profile.email?.[0]?.toUpperCase() || '?'}
            </div>
          )}
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
            selectedDate={selectedDate}
            log={currentLog}
            settings={settings}
            totals={totals}
            goalProgress={goalProgress}
            onUpdateWorkoutCalories={updateWorkoutCalories}
            onUpdateHealthMetrics={updateHealthMetrics}
            onDateChange={setSelectedDate}
            onLogScannedMeal={logScannedMeal}
            onSaveAndLogMeal={saveAndLogMeal}
          />
        )}

        {activeTab === 'log' && (
          <LogMeals
            meals={meals}
            deletedMeals={deletedMeals}
            dailyLogs={dailyLogs}
            selectedDate={selectedDate}
            log={currentLog}
            displayMasterMeals={displayMasterMeals}
            savedMasterMealIds={settings.savedMasterMealIds || []}
            onToggleMeal={toggleMealForDate}
            onToggleMasterMeal={handleToggleMasterMeal}
            onUpdateMealQuantity={updateMealQuantity}
            onUpdateMasterMealQuantity={updateMasterMealQuantity}
            getMealId={getMealId}
            getMealQuantity={getMealQuantity}
            getMealUnit={getMealUnit}
            getMasterMealId={getMasterMealId}
            getMasterMealQuantity={getMasterMealQuantity}
            getMasterMealUnit={getMasterMealUnit}
            getServingMultiplier={getServingMultiplier}
            onRemoveFromLibrary={removeMasterMealFromLibrary}
            onAddMeal={addMeal}
            onUpdateMeal={updateMeal}
            onDeleteMeal={deleteMeal}
            onRestoreMeal={restoreMeal}
            onPermanentDeleteMeal={permanentlyDeleteMeal}
            getDaysUntilExpiry={getDaysUntilExpiry}
            onToggleFavorite={toggleFavorite}
            onDateChange={setSelectedDate}
            groqApiKey={settings.groqApiKey}
          />
        )}

        {activeTab === 'discover' && (
          <DiscoverTab
            meals={meals}
            masterMeals={masterMeals}
            masterMealsLoading={masterMealsLoading}
            searchQuery={masterMealSearchQuery}
            onSearchChange={setMasterMealSearchQuery}
            savedMasterMealIds={settings.savedMasterMealIds || []}
            onSaveMasterMealToLibrary={saveMasterMealToLibrary}
            isAdmin={isAdmin}
            submissions={submissions}
            pendingCount={pendingCount}
            onSubmitMeal={submitMealForReview}
            onCancelSubmission={cancelSubmission}
            onApproveSubmission={approveSubmission}
            onRejectSubmission={rejectSubmission}
            onRefreshMasterMeals={handleRefreshMasterMeals}
            onDeleteMasterMeal={deleteMasterMeal}
            checkDuplicateName={checkDuplicateName}
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
            currentWeight={goalProgress.currentWeight}
          />
        )}
      </main>

      {needsProfileSetup && (
        <ProfileSetupModal
          onComplete={async (profileData) => {
            const success = await updateProfile(profileData);
            return success;
          }}
        />
      )}
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
