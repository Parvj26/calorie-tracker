import React, { useState, useEffect } from 'react';
import { Camera, Dumbbell, TrendingDown, Utensils } from 'lucide-react';
import { CircularProgress } from './CircularProgress';
import { MealLogger } from './MealLogger';
import { FoodScanner } from './FoodScanner';
import type { DailyLog, Meal, UserSettings } from '../types';

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
