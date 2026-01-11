import { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { format } from 'date-fns';
import {
  LayoutDashboard,
  Utensils,
  TrendingUp,
  ScanLine,
  Settings as SettingsIcon,
  LogOut,
  Loader2,
  Globe,
  Users,
} from 'lucide-react';
import { useUserProfile } from '../hooks/useUserProfile';
import { useCalorieTracker } from '../hooks/useCalorieTracker';
import { useMasterMeals } from '../hooks/useMasterMeals';
import { useMealSubmissions } from '../hooks/useMealSubmissions';
import { ProfileSetupModal } from './ProfileSetupModal';
import type { TabType } from '../types';

// Lazy load all heavy components
const Dashboard = lazy(() => import('./Dashboard').then(m => ({ default: m.Dashboard })));
const LogMeals = lazy(() => import('./LogMeals').then(m => ({ default: m.LogMeals })));
const DiscoverTab = lazy(() => import('./Discover/DiscoverTab').then(m => ({ default: m.DiscoverTab })));
const ProgressTracker = lazy(() => import('./ProgressTracker').then(m => ({ default: m.ProgressTracker })));
const InBodyUpload = lazy(() => import('./InBodyUpload').then(m => ({ default: m.InBodyUpload })));
const Settings = lazy(() => import('./Settings').then(m => ({ default: m.Settings })));
const CoachDashboard = lazy(() => import('./Coach/CoachDashboard').then(m => ({ default: m.CoachDashboard })));
const ClientDetailView = lazy(() => import('./Coach/ClientDetailView').then(m => ({ default: m.ClientDetailView })));

// Loading fallback for lazy components
const TabLoader = () => (
  <div className="tab-loading">
    <Loader2 size={32} className="spinner" />
  </div>
);

export function AuthenticatedApp({ signOut }: { signOut: () => Promise<void> }) {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [viewingClientId, setViewingClientId] = useState<string | null>(null);

  const { profile, isAdmin, isCoach, needsProfileSetup, updateProfile } = useUserProfile();

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
    isDataLoaded,
  } = useCalorieTracker(profile);

  // Master meals - conditionally load based on active tab (only load when Discover or Dashboard is active)
  const shouldLoadMasterMeals = activeTab === 'discover' || activeTab === 'dashboard';
  const {
    masterMeals,
    loading: masterMealsLoading,
    searchQuery: masterMealSearchQuery,
    setSearchQuery: setMasterMealSearchQuery,
    loadMasterMeals,
    incrementUsageCount,
    deleteMasterMeal,
    checkDuplicateName,
  } = useMasterMeals(shouldLoadMasterMeals);

  const {
    submissions,
    pendingCount,
    submitMealForReview,
    cancelSubmission,
    approveSubmission,
    rejectSubmission,
    loadPendingSubmissions,
  } = useMealSubmissions(isAdmin);

  const handleRefreshMasterMeals = useCallback(() => {
    loadMasterMeals();
    loadPendingSubmissions();
  }, [loadMasterMeals, loadPendingSubmissions]);

  const currentLog = useMemo(() => getLogForDate(selectedDate), [selectedDate, getLogForDate]);
  const totals = useMemo(() => calculateTotals(currentLog, masterMeals), [currentLog, calculateTotals, masterMeals]);
  const progressData = useMemo(() => getProgressData(), [getProgressData]);
  const goalProgress = useMemo(() => getGoalProgress(), [getGoalProgress]);

  const displayMasterMeals = useMemo(() => {
    const savedIds = settings.savedMasterMealIds || [];
    const loggedIds = currentLog.masterMealIds || [];
    const allIds = [...new Set([...savedIds, ...loggedIds])];
    return masterMeals.filter(meal => allIds.includes(meal.id));
  }, [settings.savedMasterMealIds, currentLog.masterMealIds, masterMeals]);

  const handleToggleMasterMeal = useCallback((mealId: string, date: string) => {
    const log = getLogForDate(date);
    if (log.masterMealIds?.some(entry => {
      const id = typeof entry === 'string' ? entry : entry.mealId;
      return id === mealId;
    })) {
      removeMasterMealFromLog(mealId, date);
    } else {
      addMasterMealToLog(mealId, date);
      incrementUsageCount(mealId);
    }
  }, [getLogForDate, addMasterMealToLog, removeMasterMealFromLog, incrementUsageCount]);

  if (!isDataLoaded) {
    return (
      <div className="app loading-screen">
        <Loader2 size={48} className="spinner" />
        <p>Loading your data...</p>
      </div>
    );
  }

  const coachTabs = [
    { id: 'dashboard' as TabType, label: 'Clients', icon: Users },
  ];

  const userTabs = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'log' as TabType, label: 'Log', icon: Utensils },
    { id: 'discover' as TabType, label: 'Discover', icon: Globe },
    { id: 'progress' as TabType, label: 'Progress', icon: TrendingUp },
    { id: 'inbody' as TabType, label: 'InBody', icon: ScanLine },
  ];

  const tabs = isCoach ? coachTabs : userTabs;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>CalorieTracker</h1>
          <span className="subtitle">
            {isCoach ? 'Coach Dashboard' : 'Your personalized nutrition companion'}
          </span>
        </div>
        <div className="header-right">
          {profile && (
            <div className="user-initials" title={`${profile.firstName || ''} ${profile.lastName || ''}`.trim() || profile.email}>
              {profile.firstName && profile.lastName
                ? `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase()
                : profile.email?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <button
            className={`header-icon-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('settings');
              setViewingClientId(null);
            }}
            title="Settings"
          >
            <SettingsIcon size={18} />
          </button>
          <button className="header-icon-btn logout" onClick={signOut} title="Sign out">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <nav className="app-nav" role="tablist" aria-label="Main navigation">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id && !viewingClientId}
            aria-controls={`${tab.id}-panel`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            className={`nav-btn ${activeTab === tab.id && !viewingClientId ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(tab.id);
              setViewingClientId(null);
            }}
          >
            <tab.icon size={20} aria-hidden="true" />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      <main className="app-main" role="tabpanel" id={`${activeTab}-panel`}>
        {isCoach && viewingClientId && (
          <Suspense fallback={<TabLoader />}>
            <ClientDetailView
              clientId={viewingClientId}
              onBack={() => setViewingClientId(null)}
            />
          </Suspense>
        )}

        {isCoach && activeTab === 'dashboard' && !viewingClientId && (
          <Suspense fallback={<TabLoader />}>
            <CoachDashboard
              onViewClient={(clientId) => setViewingClientId(clientId)}
            />
          </Suspense>
        )}

        {!isCoach && activeTab === 'dashboard' && (
          <Suspense fallback={<TabLoader />}>
            <Dashboard
              selectedDate={selectedDate}
              log={currentLog}
              settings={settings}
              totals={totals}
              goalProgress={goalProgress}
              meals={meals}
              masterMeals={masterMeals}
              getServingMultiplier={getServingMultiplier}
              onUpdateWorkoutCalories={updateWorkoutCalories}
              onUpdateHealthMetrics={updateHealthMetrics}
              onDateChange={setSelectedDate}
              onLogScannedMeal={logScannedMeal}
              onSaveAndLogMeal={saveAndLogMeal}
            />
          </Suspense>
        )}

        {!isCoach && activeTab === 'log' && (
          <Suspense fallback={<TabLoader />}>
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
              groqApiKeyBackup={settings.groqApiKeyBackup}
              aiProvider={settings.aiProvider || 'groq'}
              openAiApiKey={settings.openAiApiKey}
              onLogScannedMeal={logScannedMeal}
              onSaveAndLogMeal={saveAndLogMeal}
            />
          </Suspense>
        )}

        {!isCoach && activeTab === 'discover' && (
          <Suspense fallback={<TabLoader />}>
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
          </Suspense>
        )}

        {!isCoach && activeTab === 'progress' && (
          <Suspense fallback={<TabLoader />}>
            <ProgressTracker
              weighIns={weighIns}
              settings={settings}
              progressData={progressData}
              goalProgress={goalProgress}
              onAddWeighIn={addWeighIn}
              onDeleteWeighIn={deleteWeighIn}
            />
          </Suspense>
        )}

        {!isCoach && activeTab === 'inbody' && (
          <Suspense fallback={<TabLoader />}>
            <InBodyUpload
              scans={inBodyScans}
              aiProvider={settings.aiProvider || 'groq'}
              openAiApiKey={settings.openAiApiKey}
              groqApiKey={settings.groqApiKey}
              groqApiKeyBackup={settings.groqApiKeyBackup}
              onAddScan={addInBodyScan}
              onDeleteScan={deleteInBodyScan}
            />
          </Suspense>
        )}

        {activeTab === 'settings' && (
          <Suspense fallback={<TabLoader />}>
            <Settings
              settings={settings}
              onUpdateSettings={updateSettings}
              currentWeight={goalProgress.currentWeight}
              bmr={totals.bmr}
              dailyLogs={dailyLogs}
            />
          </Suspense>
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
