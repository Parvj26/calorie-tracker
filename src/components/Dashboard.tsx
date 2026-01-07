import React, { useState, useEffect } from 'react';
import { Camera, Dumbbell, TrendingDown, Scale, Target, Smartphone, ChevronLeft, ChevronRight, Calendar, Zap, Footprints, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { CircularProgress } from './CircularProgress';
import { FoodScanner } from './FoodScanner';
import { HealthScanner } from './HealthScanner';
import type { DailyLog, Meal, UserSettings, HealthMetrics } from '../types';

interface InBodyMetrics {
  weight: number;
  bodyFatPercent: number;
  muscleMass: number;
  skeletalMuscle: number;
  date: string;
  // Enhanced metrics
  bmr?: number;
  fatMass?: number;
  visceralFatGrade?: number;
  waterWeight?: number;
  trunkFatMass?: number;
  bodyAge?: number;
  proteinMass?: number;
  boneMass?: number;
  changes: {
    weight: number;
    bodyFat: number;
    muscleMass: number;
    skeletalMuscle: number;
  } | null;
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
    workoutCalories: number;
    netCalories: number;
    deficit: number;
    caloriesRemaining: number;
    targetCalories: number;
    restingEnergy: number;
    activeEnergy: number;
    tdee: number;
    hasTDEE: boolean;
    trueDeficit: number;
    steps: number;
    exerciseMinutes: number;
  };
  inBodyMetrics: InBodyMetrics | null;
  goalProgress: GoalProgress;
  onUpdateWorkoutCalories: (calories: number, date: string) => void;
  onUpdateHealthMetrics: (metrics: HealthMetrics, date: string) => void;
  onDateChange: (date: string) => void;
  onLogScannedMeal: (meal: Omit<Meal, 'id' | 'isCustom'>, date: string) => void;
  onSaveAndLogMeal: (meal: Omit<Meal, 'id' | 'isCustom'>, date: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  selectedDate,
  log,
  settings,
  totals,
  inBodyMetrics,
  goalProgress,
  onUpdateWorkoutCalories,
  onUpdateHealthMetrics,
  onDateChange,
  onLogScannedMeal,
  onSaveAndLogMeal,
}) => {
  const [workoutInput, setWorkoutInput] = useState(totals.activeEnergy.toString());
  const [showScanner, setShowScanner] = useState(false);
  const [showHealthScanner, setShowHealthScanner] = useState(false);

  useEffect(() => {
    setWorkoutInput(totals.activeEnergy.toString());
  }, [totals.activeEnergy]);

  const handleWorkoutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setWorkoutInput(value);
    onUpdateWorkoutCalories(parseInt(value) || 0, selectedDate);
  };

  const targetRange = `${settings.dailyCalorieTargetMin}-${settings.dailyCalorieTargetMax}`;
  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');

  const changeDate = (days: number) => {
    const current = parseISO(selectedDate);
    current.setDate(current.getDate() + days);
    onDateChange(format(current, 'yyyy-MM-dd'));
  };

  const formatChange = (value: number, inverse: boolean = false) => {
    const isPositive = inverse ? value < 0 : value > 0;
    const sign = value > 0 ? '+' : '';
    return (
      <span className={isPositive ? 'change-positive' : value < 0 ? 'change-negative' : ''}>
        {sign}{value}
      </span>
    );
  };

  return (
    <div className="dashboard">
      {/* Date Selector at Top */}
      <div className="card date-selector-card">
        <button onClick={() => changeDate(-1)} className="date-nav-btn">
          <ChevronLeft size={24} />
        </button>
        <div className="date-display-main">
          <Calendar size={20} />
          <div className="date-text">
            <span className="date-day">{isToday ? 'Today' : format(parseISO(selectedDate), 'EEEE')}</span>
            <span className="date-full">{format(parseISO(selectedDate), 'MMMM d, yyyy')}</span>
          </div>
        </div>
        <button
          onClick={() => changeDate(1)}
          className="date-nav-btn"
          disabled={isToday}
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Primary CTA - Scan Food Button */}
      <div className="card scan-food-card" onClick={() => setShowScanner(true)}>
        <button className="scan-food-btn">
          <div className="icon-wrapper">
            <Camera size={32} />
          </div>
          <div className="btn-text">
            <span className="btn-title">Scan Your Food</span>
            <span className="btn-subtitle">AI-powered calorie detection</span>
          </div>
        </button>
      </div>

      {/* TDEE Card - Show when health data is imported */}
      {totals.hasTDEE && (
        <div className="card tdee-card">
          <div className="card-header">
            <Zap size={20} />
            <h3>Today's Energy</h3>
          </div>
          <div className="tdee-main">
            <div className="tdee-value">{totals.tdee.toLocaleString()}</div>
            <div className="tdee-label">Total Burn (TDEE)</div>
          </div>
          <div className="tdee-breakdown-row">
            <div className="tdee-item">
              <span className="tdee-item-value">{totals.restingEnergy.toLocaleString()}</span>
              <span className="tdee-item-label">Resting</span>
            </div>
            <span className="tdee-plus">+</span>
            <div className="tdee-item">
              <span className="tdee-item-value">{totals.activeEnergy.toLocaleString()}</span>
              <span className="tdee-item-label">Active</span>
            </div>
          </div>
          <div className="tdee-stats-row">
            {totals.steps > 0 && (
              <div className="tdee-stat">
                <Footprints size={16} />
                <span>{totals.steps.toLocaleString()} steps</span>
              </div>
            )}
            {totals.exerciseMinutes > 0 && (
              <div className="tdee-stat">
                <Clock size={16} />
                <span>{totals.exerciseMinutes} min exercise</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Body Metrics Card - Show if we have InBody data */}
      {inBodyMetrics && (
        <div className="card body-metrics-card">
          <div className="card-header">
            <Scale size={20} />
            <h3>Body Metrics</h3>
            <span className="metrics-date">
              {format(new Date(inBodyMetrics.date), 'MMM d')}
            </span>
          </div>
          <div className="metrics-grid">
            <div className="metric-item">
              <span className="metric-value">{inBodyMetrics.weight}</span>
              <span className="metric-unit">kg</span>
              <span className="metric-label">Weight</span>
              {inBodyMetrics.changes && (
                <span className="metric-change">
                  {formatChange(inBodyMetrics.changes.weight, true)}
                </span>
              )}
            </div>
            <div className="metric-item">
              <span className="metric-value">{inBodyMetrics.bodyFatPercent}</span>
              <span className="metric-unit">%</span>
              <span className="metric-label">Body Fat</span>
              {inBodyMetrics.changes && (
                <span className="metric-change">
                  {formatChange(inBodyMetrics.changes.bodyFat, true)}
                </span>
              )}
            </div>
            <div className="metric-item">
              <span className="metric-value">{inBodyMetrics.muscleMass}</span>
              <span className="metric-unit">kg</span>
              <span className="metric-label">Muscle</span>
              {inBodyMetrics.changes && (
                <span className="metric-change">
                  {formatChange(inBodyMetrics.changes.muscleMass)}
                </span>
              )}
            </div>
            <div className="metric-item">
              <span className="metric-value">{inBodyMetrics.skeletalMuscle}</span>
              <span className="metric-unit">kg</span>
              <span className="metric-label">SMM</span>
              {inBodyMetrics.changes && (
                <span className="metric-change">
                  {formatChange(inBodyMetrics.changes.skeletalMuscle)}
                </span>
              )}
            </div>
          </div>

          {/* Enhanced Metrics */}
          {inBodyMetrics.bmr && (
            <div className="bmr-highlight">
              <span className="bmr-label">BMR</span>
              <span className="bmr-value">{inBodyMetrics.bmr} kcal/day</span>
              <span className="bmr-subtitle">Resting metabolism</span>
            </div>
          )}

          {(inBodyMetrics.fatMass || inBodyMetrics.visceralFatGrade) && (
            <div className="enhanced-metrics-row">
              {inBodyMetrics.fatMass && (
                <div className="mini-metric">
                  <span className="mini-label">Fat Mass</span>
                  <span className="mini-value">{inBodyMetrics.fatMass} kg</span>
                </div>
              )}
              {inBodyMetrics.visceralFatGrade && (
                <div className={`mini-metric ${
                  inBodyMetrics.visceralFatGrade < 10 ? 'status-success' :
                  inBodyMetrics.visceralFatGrade < 15 ? 'status-warning' :
                  'status-danger'
                }`}>
                  <span className="mini-label">Visceral Fat</span>
                  <span className="mini-value">Grade {inBodyMetrics.visceralFatGrade}</span>
                  <span className="mini-status">
                    {inBodyMetrics.visceralFatGrade < 10 && 'Healthy'}
                    {inBodyMetrics.visceralFatGrade >= 10 && inBodyMetrics.visceralFatGrade < 15 && 'Elevated'}
                    {inBodyMetrics.visceralFatGrade >= 15 && 'High Risk'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Additional details - collapsible */}
          {(inBodyMetrics.waterWeight || inBodyMetrics.bodyAge || inBodyMetrics.trunkFatMass) && (
            <details className="more-metrics-details">
              <summary>More Details</summary>
              <div className="more-metrics-grid">
                {inBodyMetrics.waterWeight && (
                  <div className="detail-item">
                    <span className="detail-label">Water</span>
                    <span className="detail-value">{inBodyMetrics.waterWeight} kg</span>
                  </div>
                )}
                {inBodyMetrics.trunkFatMass && (
                  <div className="detail-item">
                    <span className="detail-label">Trunk Fat</span>
                    <span className="detail-value">{inBodyMetrics.trunkFatMass} kg</span>
                  </div>
                )}
                {inBodyMetrics.bodyAge && (
                  <div className="detail-item">
                    <span className="detail-label">Body Age</span>
                    <span className="detail-value">{inBodyMetrics.bodyAge} yrs</span>
                  </div>
                )}
                {inBodyMetrics.proteinMass && (
                  <div className="detail-item">
                    <span className="detail-label">Protein</span>
                    <span className="detail-value">{inBodyMetrics.proteinMass} kg</span>
                  </div>
                )}
                {inBodyMetrics.boneMass && (
                  <div className="detail-item">
                    <span className="detail-label">Bone</span>
                    <span className="detail-value">{inBodyMetrics.boneMass} kg</span>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Goal Progress Card */}
      <div className="card goal-progress-card">
        <div className="card-header">
          <Target size={20} />
          <h3>Goal Progress</h3>
        </div>
        <div className="goal-mini-stats">
          <span>{goalProgress.currentWeight} kg</span>
          <span className="goal-arrow">→</span>
          <span className="goal-target">{goalProgress.goalWeight} kg</span>
        </div>
        <div className="goal-mini-bar">
          <div
            className="goal-mini-fill"
            style={{ width: `${goalProgress.progressPercent}%` }}
          />
        </div>
        <div className="goal-mini-labels">
          <span className="lost">{goalProgress.weightLost} kg lost</span>
          <span className="remaining">{goalProgress.weightRemaining} kg to go</span>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Main Progress */}
        <div className="card main-progress">
          <div className="progress-header">
            <h2>Daily Progress</h2>
            <span className="target-badge">
              {totals.hasTDEE ? `TDEE: ${totals.tdee}` : `Target: ${targetRange}`} cal
            </span>
          </div>
          <div className="progress-content">
            <CircularProgress
              value={totals.calories}
              max={totals.hasTDEE ? totals.tdee : totals.targetCalories}
              size={180}
              strokeWidth={14}
              label="calories"
              sublabel={`of ${totals.hasTDEE ? totals.tdee : totals.targetCalories}`}
            />
          </div>
          <div className="calories-remaining">
            {totals.caloriesRemaining > 0 ? (
              <>
                <span className="remaining-value positive">{Math.round(totals.caloriesRemaining)}</span>
                <span className="remaining-label">calories remaining</span>
              </>
            ) : (
              <>
                <span className="remaining-value negative">{Math.abs(Math.round(totals.caloriesRemaining))}</span>
                <span className="remaining-label">calories over</span>
              </>
            )}
          </div>
        </div>

        {/* Macros Card */}
        <div className="card macros-card">
          <h3>Macros</h3>
          <div className="macro-bars">
            <div className="macro-row">
              <div className="macro-label">
                <span className="macro-name">Protein</span>
                <span className="macro-value">{totals.protein}g</span>
              </div>
              <div className="macro-bar">
                <div
                  className="macro-bar-fill protein"
                  style={{ width: `${Math.min(100, (totals.protein / 150) * 100)}%` }}
                />
              </div>
            </div>
            <div className="macro-row">
              <div className="macro-label">
                <span className="macro-name">Carbs</span>
                <span className="macro-value">{totals.carbs}g</span>
              </div>
              <div className="macro-bar">
                <div
                  className="macro-bar-fill carbs"
                  style={{ width: `${Math.min(100, (totals.carbs / 200) * 100)}%` }}
                />
              </div>
            </div>
            <div className="macro-row">
              <div className="macro-label">
                <span className="macro-name">Fat</span>
                <span className="macro-value">{totals.fat}g</span>
              </div>
              <div className="macro-bar">
                <div
                  className="macro-bar-fill fat"
                  style={{ width: `${Math.min(100, (totals.fat / 65) * 100)}%` }}
                />
              </div>
            </div>
            <div className="macro-row">
              <div className="macro-label">
                <span className="macro-name">Fiber</span>
                <span className="macro-value">{totals.fiber}g</span>
              </div>
              <div className="macro-bar">
                <div
                  className="macro-bar-fill fiber"
                  style={{ width: `${Math.min(100, (totals.fiber / 28) * 100)}%` }}
                />
              </div>
            </div>
            <div className="macro-row">
              <div className="macro-label">
                <span className="macro-name">Sugar</span>
                <span className="macro-value">{totals.sugar}g</span>
              </div>
              <div className="macro-bar">
                <div
                  className={`macro-bar-fill sugar ${totals.sugar > 36 ? 'over-limit' : ''}`}
                  style={{ width: `${Math.min(100, (totals.sugar / 36) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Activity Card - replaces Workout Card when health data is available */}
        <div className="card workout-card">
          <div className="card-header">
            <Dumbbell size={20} />
            <h3>{totals.hasTDEE ? 'Activity' : 'Workout'}</h3>
          </div>
          {!totals.hasTDEE ? (
            <>
              <div className="workout-input-group">
                <input
                  type="number"
                  value={workoutInput}
                  onChange={handleWorkoutChange}
                  placeholder="0"
                  min="0"
                />
                <span>calories burned</span>
              </div>
              <button
                className="import-health-btn"
                onClick={() => setShowHealthScanner(true)}
              >
                <Smartphone size={16} />
                Import from Health
              </button>
            </>
          ) : (
            <>
              <div className="activity-summary">
                <div className="activity-value">{totals.activeEnergy.toLocaleString()}</div>
                <div className="activity-label">active calories</div>
              </div>
              <button
                className="import-health-btn"
                onClick={() => setShowHealthScanner(true)}
              >
                <Smartphone size={16} />
                Update from Health
              </button>
            </>
          )}
        </div>

        {/* Net Deficit Card */}
        <div className="card deficit-card">
          <div className="card-header">
            <TrendingDown size={20} />
            <h3>{totals.hasTDEE ? 'True Deficit' : 'Net Deficit'}</h3>
          </div>
          <div className="deficit-value">
            <span className={totals.deficit >= 0 ? 'positive' : 'negative'}>
              {totals.deficit >= 0 ? '+' : ''}{Math.round(totals.deficit)}
            </span>
            <span className="deficit-label">cal {totals.deficit >= 0 ? 'deficit' : 'surplus'}</span>
          </div>
          <div className="deficit-breakdown">
            {totals.hasTDEE ? (
              <>
                <div className="breakdown-row">
                  <span>TDEE:</span>
                  <span>{totals.tdee} cal</span>
                </div>
                <div className="breakdown-row">
                  <span>Eaten:</span>
                  <span>-{totals.calories} cal</span>
                </div>
                <div className="breakdown-row highlight">
                  <span>= Deficit:</span>
                  <span>{totals.deficit} cal</span>
                </div>
              </>
            ) : (
              <>
                <div className="breakdown-row">
                  <span>Target:</span>
                  <span>{totals.targetCalories} cal</span>
                </div>
                <div className="breakdown-row">
                  <span>Eaten:</span>
                  <span>-{totals.calories} cal</span>
                </div>
                <div className="breakdown-row">
                  <span>Burned:</span>
                  <span>+{totals.workoutCalories} cal</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Food Scanner Modal */}
      {showScanner && (
        <FoodScanner
          aiProvider={settings.aiProvider || 'groq'}
          openAiApiKey={settings.openAiApiKey}
          groqApiKey={settings.groqApiKey}
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
          selectedDate={selectedDate}
          currentHealthMetrics={log.healthMetrics}
          onUpdateHealthMetrics={onUpdateHealthMetrics}
          onClose={() => setShowHealthScanner(false)}
        />
      )}
    </div>
  );
};
