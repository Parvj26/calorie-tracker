import React, { useState, useEffect, useMemo } from 'react';
import { Camera, Dumbbell, TrendingDown, Smartphone, ChevronLeft, ChevronRight, Calendar, Zap, Footprints, Clock, Target, X, Sparkles, RefreshCw, Loader2, Flame } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { createPortal } from 'react-dom';
import { FoodScanner } from './FoodScanner';
import { HealthScanner } from './HealthScanner';
import type { DailyLog, Meal, MasterMeal, UserSettings, HealthMetrics, QuantityUnit, DailyInsights } from '../types';

type MacroType = 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber' | 'sugar';

interface MealContribution {
  name: string;
  value: number;
  quantity: number;
  unit: string;
  isCommunity: boolean;
}

interface GoalProgress {
  startWeight: number;
  currentWeight: number;
  goalWeight: number;
  weightLost: number;
  weightRemaining: number;
  progressPercent: number;
}

interface DashboardProps {
  selectedDate: string;
  log: DailyLog;
  settings: UserSettings;
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    addedSugar: number;
    workoutCalories: number;
    netCalories: number;
    deficit: number;
    caloriesRemaining: number;
    targetCalories: number;
    restingEnergy: number;
    activeEnergy: number;
    tdee: number;
    hasTDEE: boolean;
    hasBMR?: boolean;
    trueDeficit: number;
    steps: number;
    exerciseMinutes: number;
    // New BMR-based fields
    bmr?: number;
    bmrSource?: 'inbody' | 'katch_mcardle' | 'mifflin_st_jeor' | 'none';
    baseCalories?: number;
    exerciseCalories?: number;
    adjustedTarget?: number;
    tdeeSource?: string | null;
  };
  goalProgress: GoalProgress;
  meals: Meal[];
  masterMeals: MasterMeal[];
  getMealQuantity: (mealId: string, date: string) => number;
  getMealUnit: (mealId: string, date: string) => string;
  getMasterMealQuantity: (mealId: string, date: string) => number;
  getMasterMealUnit: (mealId: string, date: string) => string;
  getServingMultiplier: (quantity: number, unit: QuantityUnit, servingSize?: number) => number;
  onUpdateWorkoutCalories: (calories: number, date: string) => void;
  onUpdateHealthMetrics: (metrics: HealthMetrics, date: string) => void;
  onDateChange: (date: string) => void;
  onLogScannedMeal: (meal: Omit<Meal, 'id' | 'isCustom'>, date: string) => void;
  onSaveAndLogMeal: (meal: Omit<Meal, 'id' | 'isCustom'>, date: string) => void;
  // AI Insights
  dailyInsights: DailyInsights | null;
  dailyInsightsLoading: boolean;
  dailyInsightsError: string | null;
  onGenerateDailyInsights: (forceRefresh?: boolean) => void;
  hasApiKey: boolean;
}

const macroLabels: Record<MacroType, string> = {
  calories: 'Calories',
  protein: 'Protein',
  carbs: 'Carbs',
  fat: 'Fat',
  fiber: 'Fiber',
  sugar: 'Sugar',
};

const macroUnits: Record<MacroType, string> = {
  calories: 'cal',
  protein: 'g',
  carbs: 'g',
  fat: 'g',
  fiber: 'g',
  sugar: 'g',
};

export const Dashboard: React.FC<DashboardProps> = ({
  selectedDate,
  log,
  settings,
  totals,
  goalProgress,
  meals,
  masterMeals,
  getMealQuantity,
  getMealUnit,
  getMasterMealQuantity,
  getMasterMealUnit,
  getServingMultiplier,
  onUpdateWorkoutCalories,
  onUpdateHealthMetrics,
  onDateChange,
  onLogScannedMeal,
  onSaveAndLogMeal,
  dailyInsights,
  dailyInsightsLoading,
  dailyInsightsError,
  onGenerateDailyInsights,
  hasApiKey,
}) => {
  const [workoutInput, setWorkoutInput] = useState(totals.activeEnergy.toString());
  const [showScanner, setShowScanner] = useState(false);
  const [showHealthScanner, setShowHealthScanner] = useState(false);
  const [selectedMacro, setSelectedMacro] = useState<MacroType | null>(null);

  useEffect(() => {
    setWorkoutInput(totals.activeEnergy.toString());
  }, [totals.activeEnergy]);

  const handleWorkoutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setWorkoutInput(value);
    onUpdateWorkoutCalories(parseInt(value) || 0, selectedDate);
  };

  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');
  // Always use goal-based target (BMR - deficit), not TDEE
  // totals.targetCalories is calculated as BMR - deficit in useCalorieTracker
  const targetCalories = totals.targetCalories;
  const calorieProgress = Math.min(100, (totals.calories / targetCalories) * 100);
  const isOverTarget = totals.caloriesRemaining < 0;

  const changeDate = (days: number) => {
    const current = parseISO(selectedDate);
    current.setDate(current.getDate() + days);
    onDateChange(format(current, 'yyyy-MM-dd'));
  };

  // Calculate meal contributions for a specific macro
  const getMacroBreakdown = useMemo(() => {
    return (macro: MacroType): MealContribution[] => {
      const contributions: MealContribution[] = [];

      // User meals - handle both string IDs and MealLogEntry objects
      const loggedMealEntries = log.meals || [];
      loggedMealEntries.forEach((entry) => {
        const mealId = typeof entry === 'string' ? entry : entry.mealId;
        const meal = meals.find((m) => m.id === mealId);
        if (meal && !meal.deletedAt) {
          const quantity = getMealQuantity(mealId, selectedDate);
          const unit = getMealUnit(mealId, selectedDate) as QuantityUnit;
          const multiplier = getServingMultiplier(quantity, unit, meal.servingSize);
          const value = Math.round((meal[macro] || 0) * multiplier);

          if (value > 0) {
            contributions.push({
              name: meal.name,
              value,
              quantity,
              unit,
              isCommunity: false,
            });
          }
        }
      });

      // Master meals (community) - handle both string IDs and MasterMealLogEntry objects
      const loggedMasterMealEntries = log.masterMealIds || [];
      loggedMasterMealEntries.forEach((entry) => {
        const mealId = typeof entry === 'string' ? entry : entry.mealId;
        const meal = masterMeals.find((m) => m.id === mealId);
        if (meal) {
          const quantity = getMasterMealQuantity(mealId, selectedDate);
          const unit = getMasterMealUnit(mealId, selectedDate) as QuantityUnit;
          const multiplier = getServingMultiplier(quantity, unit, meal.servingSize);
          const value = Math.round((meal[macro] || 0) * multiplier);

          if (value > 0) {
            contributions.push({
              name: meal.name,
              value,
              quantity,
              unit,
              isCommunity: true,
            });
          }
        }
      });

      // Sort by value descending
      return contributions.sort((a, b) => b.value - a.value);
    };
  }, [log, meals, masterMeals, selectedDate, getMealQuantity, getMealUnit, getMasterMealQuantity, getMasterMealUnit, getServingMultiplier]);

  const renderBreakdownModal = () => {
    if (!selectedMacro) return null;

    const breakdown = getMacroBreakdown(selectedMacro);
    const total = totals[selectedMacro];
    const unit = macroUnits[selectedMacro];

    return createPortal(
      <div className="modal-overlay" onClick={() => setSelectedMacro(null)}>
        <div className="breakdown-modal" onClick={(e) => e.stopPropagation()}>
          <div className="breakdown-header">
            <h3>{macroLabels[selectedMacro]} Breakdown</h3>
            <button className="close-btn" onClick={() => setSelectedMacro(null)}>
              <X size={20} />
            </button>
          </div>

          <div className="breakdown-total">
            <span className="breakdown-total-value">{total}{unit}</span>
            <span className="breakdown-total-label">total {macroLabels[selectedMacro].toLowerCase()}</span>
          </div>

          {breakdown.length === 0 ? (
            <div className="breakdown-empty">
              <p>No meals logged yet today</p>
            </div>
          ) : (
            <div className="breakdown-list">
              {breakdown.map((item, index) => (
                <div key={index} className="breakdown-item">
                  <div className="breakdown-item-info">
                    <span className="breakdown-item-name">
                      {item.name}
                      {item.isCommunity && <span className="community-badge">Community</span>}
                    </span>
                    <span className="breakdown-item-qty">
                      {item.quantity !== 1 && `${item.quantity} ${item.unit}`}
                    </span>
                  </div>
                  <div className="breakdown-item-value">
                    {item.value}{unit}
                  </div>
                  <div className="breakdown-item-bar">
                    <div
                      className={`breakdown-item-fill ${selectedMacro}`}
                      style={{ width: `${total > 0 ? (item.value / total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className="dashboard dashboard-v2">
      {/* Date Selector */}
      <div className="date-selector-compact">
        <button onClick={() => changeDate(-1)} className="date-nav-btn">
          <ChevronLeft size={20} />
        </button>
        <div className="date-display-compact">
          <Calendar size={16} />
          <span>{isToday ? 'Today' : format(parseISO(selectedDate), 'EEE, MMM d')}</span>
        </div>
        <button
          onClick={() => changeDate(1)}
          className="date-nav-btn"
          disabled={isToday}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* HERO: Calories Remaining - Clickable */}
      <div
        className={`hero-calories-card ${isOverTarget ? 'over-target' : ''} clickable`}
        onClick={() => setSelectedMacro('calories')}
      >
        <div className="hero-ring">
          <svg viewBox="0 0 100 100" className="progress-ring">
            <circle
              className="progress-ring-bg"
              cx="50"
              cy="50"
              r="42"
              fill="none"
              strokeWidth="8"
            />
            <circle
              className={`progress-ring-fill ${isOverTarget ? 'over' : ''}`}
              cx="50"
              cy="50"
              r="42"
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${calorieProgress * 2.64} 264`}
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div className="hero-content">
            <span className={`hero-number ${isOverTarget ? 'over' : ''}`}>
              {Math.abs(Math.round(totals.caloriesRemaining))}
            </span>
            <span className="hero-label">
              {isOverTarget ? 'over' : 'remaining'}
            </span>
          </div>
        </div>
        <div className="hero-details">
          <div className="hero-eaten">
            <span className="detail-value">{totals.calories}</span>
            <span className="detail-label">eaten</span>
          </div>
          <div className="hero-divider">/</div>
          <div className="hero-target">
            <span className="detail-value">{targetCalories}</span>
            <span className="detail-label">goal</span>
          </div>
        </div>
        <span className="tap-hint">Tap for breakdown</span>
      </div>

      {/* TDEE-based Remaining Card */}
      {totals.hasBMR && totals.tdee > 0 && (
        <div className="tdee-remaining-card">
          <div className="tdee-remaining-content">
            <span className={`tdee-remaining-number ${totals.trueDeficit < 0 ? 'over' : ''}`}>
              {Math.abs(Math.round(totals.trueDeficit))}
            </span>
            <span className="tdee-remaining-label">
              {totals.trueDeficit >= 0 ? 'under maintenance' : 'over maintenance'}
            </span>
          </div>
          <div className="tdee-remaining-details">
            <span>{totals.calories} eaten</span>
            <span className="tdee-divider">/</span>
            <span>{totals.tdee} TDEE</span>
          </div>
        </div>
      )}

      {/* Compact Macros Row - Clickable */}
      <div className="macros-compact">
        <div className="macro-pill protein clickable" onClick={() => setSelectedMacro('protein')}>
          <span className="macro-pill-value">{totals.protein}g</span>
          <span className="macro-pill-label">protein</span>
          <div className="macro-pill-bar" style={{ width: `${Math.min(100, (totals.protein / 150) * 100)}%` }} />
        </div>
        <div className="macro-pill carbs clickable" onClick={() => setSelectedMacro('carbs')}>
          <span className="macro-pill-value">{totals.carbs}g</span>
          <span className="macro-pill-label">carbs</span>
          <div className="macro-pill-bar" style={{ width: `${Math.min(100, (totals.carbs / 200) * 100)}%` }} />
        </div>
        <div className="macro-pill fat clickable" onClick={() => setSelectedMacro('fat')}>
          <span className="macro-pill-value">{totals.fat}g</span>
          <span className="macro-pill-label">fat</span>
          <div className="macro-pill-bar" style={{ width: `${Math.min(100, (totals.fat / 65) * 100)}%` }} />
        </div>
        <div className="macro-pill fiber clickable" onClick={() => setSelectedMacro('fiber')}>
          <span className="macro-pill-value">{totals.fiber}g</span>
          <span className="macro-pill-label">fiber</span>
          <div className="macro-pill-bar" style={{ width: `${Math.min(100, (totals.fiber / 28) * 100)}%` }} />
        </div>
        <div className={`macro-pill sugar clickable ${totals.addedSugar > 36 ? 'over-limit' : ''}`} onClick={() => setSelectedMacro('sugar')}>
          <span className="macro-pill-value">
            {totals.sugar}g
            {totals.addedSugar > 0 && <span className="added-sugar-indicator"> ({totals.addedSugar}g added)</span>}
          </span>
          <span className="macro-pill-label">sugar</span>
          <div className="macro-pill-bar" style={{ width: `${Math.min(100, (totals.addedSugar / 36) * 100)}%` }} />
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="quick-stats-grid">
        {/* Energy/Deficit Card */}
        <div className="stat-card energy-card">
          <div className="stat-card-header">
            <TrendingDown size={16} />
            <span>{totals.hasTDEE ? 'Deficit' : 'Net'}</span>
          </div>
          <div className={`stat-card-value ${totals.deficit >= 0 ? 'positive' : 'negative'}`}>
            {totals.deficit >= 0 ? '+' : ''}{Math.round(totals.deficit)}
          </div>
          <div className="stat-card-label">cal {totals.deficit >= 0 ? 'deficit' : 'surplus'}</div>
        </div>

        {/* Activity Card */}
        <div className="stat-card activity-card" onClick={() => setShowHealthScanner(true)}>
          <div className="stat-card-header">
            {totals.hasTDEE ? <Zap size={16} /> : <Dumbbell size={16} />}
            <span>{totals.hasTDEE ? 'Active' : 'Workout'}</span>
          </div>
          {totals.hasTDEE ? (
            <>
              <div className="stat-card-value">{totals.activeEnergy}</div>
              <div className="stat-card-label">cal burned</div>
            </>
          ) : (
            <>
              <input
                type="number"
                className="workout-input-mini"
                value={workoutInput}
                onChange={handleWorkoutChange}
                onClick={(e) => e.stopPropagation()}
                placeholder="0"
                min="0"
              />
              <div className="stat-card-label">cal burned</div>
            </>
          )}
          {!totals.hasTDEE && (
            <div className="stat-card-action">
              <Smartphone size={12} />
              <span>Import</span>
            </div>
          )}
        </div>

        {/* Goal Progress Card */}
        <div className="stat-card goal-card">
          <div className="stat-card-header">
            <Target size={16} />
            <span>Goal</span>
          </div>
          <div className="stat-card-value">{goalProgress.progressPercent}%</div>
          <div className="stat-card-label">
            {goalProgress.currentWeight} → {goalProgress.goalWeight} kg
          </div>
          <div className="goal-mini-progress">
            <div className="goal-mini-fill" style={{ width: `${goalProgress.progressPercent}%` }} />
          </div>
        </div>
      </div>

      {/* MFP-Style Calorie Equation */}
      {totals.hasBMR && totals.bmr && totals.bmr > 0 && (
        <div className="calorie-equation-card">
          <div className="equation-row">
            <div className="equation-item goal">
              <span className="equation-value">{totals.targetCalories}</span>
              <span className="equation-label">Goal</span>
            </div>
            <span className="equation-operator">−</span>
            <div className="equation-item food">
              <span className="equation-value">{totals.calories}</span>
              <span className="equation-label">Food</span>
            </div>
            <span className="equation-operator">+</span>
            <div className="equation-item exercise">
              <span className="equation-value">{totals.exerciseCalories || totals.activeEnergy}</span>
              <span className="equation-label">Exercise</span>
            </div>
            <span className="equation-operator">=</span>
            <div className={`equation-item result ${totals.caloriesRemaining < 0 ? 'negative' : ''}`}>
              <span className="equation-value">{Math.round(totals.caloriesRemaining)}</span>
              <span className="equation-label">Remaining</span>
            </div>
          </div>
          <div className="bmr-info-row">
            <div className="bmr-badge">
              <Flame size={14} />
              <span className="bmr-value">BMR: {totals.bmr}</span>
              <span className="bmr-source">
                {totals.bmrSource === 'inbody' && 'InBody'}
                {totals.bmrSource === 'katch_mcardle' && 'Katch-McArdle'}
                {totals.bmrSource === 'mifflin_st_jeor' && 'Formula'}
              </span>
            </div>
            {(totals.steps > 0 || totals.exerciseMinutes > 0) && (
              <div className="activity-badges">
                {totals.steps > 0 && (
                  <span className="activity-badge">
                    <Footprints size={12} />
                    {totals.steps.toLocaleString()}
                  </span>
                )}
                {totals.exerciseMinutes > 0 && (
                  <span className="activity-badge">
                    <Clock size={12} />
                    {totals.exerciseMinutes}min
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legacy TDEE display for users without BMR */}
      {!totals.hasBMR && totals.hasTDEE && (
        <div className="tdee-summary">
          <div className="tdee-item">
            <span className="tdee-icon">🔥</span>
            <span className="tdee-value">{totals.tdee}</span>
            <span className="tdee-label">TDEE</span>
          </div>
          <div className="tdee-breakdown">
            <span>{totals.restingEnergy} resting + {totals.activeEnergy} active</span>
          </div>
          {(totals.steps > 0 || totals.exerciseMinutes > 0) && (
            <div className="tdee-extras">
              {totals.steps > 0 && (
                <span className="tdee-extra">
                  <Footprints size={14} />
                  {totals.steps.toLocaleString()}
                </span>
              )}
              {totals.exerciseMinutes > 0 && (
                <span className="tdee-extra">
                  <Clock size={14} />
                  {totals.exerciseMinutes}min
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* AI Daily Insights */}
      <div className="ai-insights-card daily-insights">
        <div className="ai-insights-header">
          <div className="ai-insights-title">
            <Sparkles size={18} />
            <span>AI Tips</span>
          </div>
          {hasApiKey && (
            <button
              className="insights-refresh-btn"
              onClick={() => onGenerateDailyInsights(true)}
              disabled={dailyInsightsLoading}
              title="Refresh insights"
            >
              {dailyInsightsLoading ? (
                <Loader2 size={16} className="spinner" />
              ) : (
                <RefreshCw size={16} />
              )}
            </button>
          )}
        </div>

        {!hasApiKey ? (
          <div className="insights-no-key">
            <p>Configure your API key in Settings to get personalized AI insights.</p>
          </div>
        ) : dailyInsightsLoading ? (
          <div className="insights-loading">
            <Loader2 size={24} className="spinner" />
            <span>Analyzing your day...</span>
          </div>
        ) : dailyInsightsError ? (
          <div className="insights-error">
            <p>{dailyInsightsError}</p>
            <button onClick={() => onGenerateDailyInsights(true)}>Try Again</button>
          </div>
        ) : dailyInsights ? (
          <div className="insights-content enhanced compact">
            {/* Wins - Positive Reinforcement */}
            {dailyInsights.wins && dailyInsights.wins.length > 0 && (
              <div className="insight-row wins">
                <span className="row-icon">🎉</span>
                <span>{dailyInsights.wins[0]}</span>
              </div>
            )}

            {/* Pattern Insight */}
            {dailyInsights.patternInsight && (
              <div className="insight-row pattern">
                <span className="row-icon">🔍</span>
                <span>{dailyInsights.patternInsight}</span>
              </div>
            )}

            {/* Action Item */}
            {dailyInsights.actionItem && (
              <div className="insight-row action">
                <span className="row-icon">💡</span>
                <span>{dailyInsights.actionItem}</span>
              </div>
            )}

            {/* Progress Summary */}
            {dailyInsights.progressSummary && (
              <div className="insight-row progress">
                <span className="row-icon">🎯</span>
                <span>{dailyInsights.progressSummary}</span>
              </div>
            )}

            {/* Remaining calories */}
            {dailyInsights.remaining && (
              <div className="insight-remaining compact">
                {dailyInsights.remaining}
              </div>
            )}

            {/* Legacy tips support */}
            {dailyInsights.tips && dailyInsights.tips.length > 0 && !dailyInsights.patternInsight && (
              <>
                {dailyInsights.tips.map((tip, index) => (
                  <div key={index} className="insight-tip">
                    <span className="tip-bullet">•</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        ) : (
          <div className="insights-empty">
            <button
              className="generate-insights-btn"
              onClick={() => onGenerateDailyInsights()}
            >
              <Sparkles size={16} />
              Get AI Tips
            </button>
          </div>
        )}
      </div>

      {/* Floating Scan Button */}
      <button
        className="floating-scan-btn"
        onClick={() => setShowScanner(true)}
        aria-label="Scan food"
      >
        <Camera size={24} />
      </button>

      {/* Macro Breakdown Modal */}
      {renderBreakdownModal()}

      {/* Food Scanner Modal */}
      {showScanner && (
        <FoodScanner
          aiProvider={settings.aiProvider || 'groq'}
          openAiApiKey={settings.openAiApiKey}
          groqApiKey={settings.groqApiKey}
          groqApiKeyBackup={settings.groqApiKeyBackup}
          onLogMeal={(meal) => onLogScannedMeal(meal, selectedDate)}
          onSaveAndLogMeal={(meal) => onSaveAndLogMeal(meal, selectedDate)}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Health Scanner Modal */}
      {showHealthScanner && (
        <HealthScanner
          aiProvider={settings.aiProvider || 'groq'}
          openAiApiKey={settings.openAiApiKey}
          groqApiKey={settings.groqApiKey}
          groqApiKeyBackup={settings.groqApiKeyBackup}
          selectedDate={selectedDate}
          currentHealthMetrics={log.healthMetrics}
          onUpdateHealthMetrics={onUpdateHealthMetrics}
          onClose={() => setShowHealthScanner(false)}
        />
      )}
    </div>
  );
};
