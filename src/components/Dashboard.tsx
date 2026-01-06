import React, { useState, useEffect } from 'react';
import { Camera, Dumbbell, TrendingDown, Utensils, Scale, Target } from 'lucide-react';
import { format } from 'date-fns';
import { CircularProgress } from './CircularProgress';
import { MealLogger } from './MealLogger';
import { FoodScanner } from './FoodScanner';
import type { DailyLog, Meal, UserSettings } from '../types';

interface InBodyMetrics {
  weight: number;
  bodyFatPercent: number;
  muscleMass: number;
  skeletalMuscle: number;
  date: string;
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
  meals: Meal[];
  selectedDate: string;
  log: DailyLog;
  settings: UserSettings;
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    workoutCalories: number;
    netCalories: number;
    deficit: number;
    caloriesRemaining: number;
    targetCalories: number;
  };
  inBodyMetrics: InBodyMetrics | null;
  goalProgress: GoalProgress;
  onToggleMeal: (mealId: string, date: string) => void;
  onUpdateWorkoutCalories: (calories: number, date: string) => void;
  onAddMeal: (meal: Omit<Meal, 'id' | 'isCustom'>) => void;
  onDeleteMeal: (mealId: string) => void;
  onDateChange: (date: string) => void;
  onLogScannedMeal: (meal: Omit<Meal, 'id' | 'isCustom'>, date: string) => void;
  onSaveAndLogMeal: (meal: Omit<Meal, 'id' | 'isCustom'>, date: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  meals,
  selectedDate,
  log,
  settings,
  totals,
  inBodyMetrics,
  goalProgress,
  onToggleMeal,
  onUpdateWorkoutCalories,
  onAddMeal,
  onDeleteMeal,
  onDateChange,
  onLogScannedMeal,
  onSaveAndLogMeal,
}) => {
  const [workoutInput, setWorkoutInput] = useState(log.workoutCalories.toString());
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    setWorkoutInput(log.workoutCalories.toString());
  }, [log.workoutCalories]);

  const handleWorkoutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setWorkoutInput(value);
    onUpdateWorkoutCalories(parseInt(value) || 0, selectedDate);
  };

  const targetRange = `${settings.dailyCalorieTargetMin}-${settings.dailyCalorieTargetMax}`;

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
            <span className="target-badge">Target: {targetRange} cal</span>
          </div>
          <div className="progress-content">
            <CircularProgress
              value={totals.calories}
              max={totals.targetCalories}
              size={180}
              strokeWidth={14}
              label="calories"
              sublabel={`of ${totals.targetCalories}`}
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
                <span className="remaining-label">calories over target</span>
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
          </div>
        </div>

        {/* Workout Card */}
        <div className="card workout-card">
          <div className="card-header">
            <Dumbbell size={20} />
            <h3>Workout</h3>
          </div>
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
        </div>

        {/* Net Deficit Card */}
        <div className="card deficit-card">
          <div className="card-header">
            <TrendingDown size={20} />
            <h3>Net Deficit</h3>
          </div>
          <div className="deficit-value">
            <span className={totals.deficit >= 0 ? 'positive' : 'negative'}>
              {totals.deficit >= 0 ? '+' : ''}{Math.round(totals.deficit)}
            </span>
            <span className="deficit-label">cal deficit</span>
          </div>
          <div className="deficit-breakdown">
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
          </div>
        </div>
      </div>

      {/* Meal Logger Section */}
      <div className="card meal-section">
        <div className="card-header">
          <Utensils size={20} />
          <h3>Log Meals</h3>
        </div>
        <MealLogger
          meals={meals}
          selectedDate={selectedDate}
          log={log}
          onToggleMeal={onToggleMeal}
          onAddMeal={onAddMeal}
          onDeleteMeal={onDeleteMeal}
          onDateChange={onDateChange}
        />
      </div>

      {/* Food Scanner Modal */}
      {showScanner && (
        <FoodScanner
          apiKey={settings.openAiApiKey}
          onLogMeal={(meal) => onLogScannedMeal(meal, selectedDate)}
          onSaveAndLogMeal={(meal) => onSaveAndLogMeal(meal, selectedDate)}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
};
