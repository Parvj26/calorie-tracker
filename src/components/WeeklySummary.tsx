import React from 'react';
import { Calendar, TrendingDown, Scale, Clock } from 'lucide-react';

interface WeeklySummaryProps {
  summary: {
    avgCalories: number;
    avgDeficit: number;
    weekWeightChange: number;
    weeksToGoal: number;
    daysLogged: number;
    latestWeight: number;
    weightToLose: number;
  } | null;
  goalProgress: {
    startWeight: number;
    currentWeight: number;
    goalWeight: number;
    weightLost: number;
    weightRemaining: number;
    progressPercent: number;
  };
}

export const WeeklySummary: React.FC<WeeklySummaryProps> = ({
  summary,
  goalProgress,
}) => {
  if (!summary) {
    return (
      <div className="weekly-summary">
        <div className="summary-header">
          <h2>Weekly Summary</h2>
        </div>
        <div className="card empty-state">
          <Calendar size={48} />
          <p>No data logged this week yet.</p>
          <p className="subtitle">Start logging meals to see your weekly summary!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="weekly-summary">
      <div className="summary-header">
        <h2>Weekly Summary</h2>
        <span className="days-logged">{summary.daysLogged} days logged this week</span>
      </div>

      <div className="summary-grid">
        {/* Average Calories */}
        <div className="card summary-card">
          <div className="card-icon calories">
            <Calendar size={24} />
          </div>
          <div className="card-content">
            <span className="card-value">{summary.avgCalories}</span>
            <span className="card-label">Avg Daily Calories</span>
          </div>
        </div>

        {/* Average Deficit */}
        <div className="card summary-card">
          <div className={`card-icon ${summary.avgDeficit >= 0 ? 'positive' : 'negative'}`}>
            <TrendingDown size={24} />
          </div>
          <div className="card-content">
            <span className="card-value">
              {summary.avgDeficit >= 0 ? '+' : ''}{summary.avgDeficit}
            </span>
            <span className="card-label">Avg Daily Deficit</span>
          </div>
        </div>

        {/* Weekly Weight Change */}
        <div className="card summary-card">
          <div className={`card-icon ${summary.weekWeightChange <= 0 ? 'positive' : 'negative'}`}>
            <Scale size={24} />
          </div>
          <div className="card-content">
            <span className="card-value">
              {summary.weekWeightChange > 0 ? '+' : ''}{summary.weekWeightChange} kg
            </span>
            <span className="card-label">Weight Change (Week)</span>
          </div>
        </div>

        {/* Time to Goal */}
        <div className="card summary-card">
          <div className="card-icon goal">
            <Clock size={24} />
          </div>
          <div className="card-content">
            <span className="card-value">
              {summary.weightToLose <= 0 ? 'Reached!' : `~${summary.weeksToGoal} weeks`}
            </span>
            <span className="card-label">Projected to Goal</span>
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="card progress-overview">
        <h3>Journey Overview</h3>
        <div className="journey-stats">
          <div className="journey-stat">
            <span className="label">Started at</span>
            <span className="value">{goalProgress.startWeight} kg</span>
          </div>
          <div className="journey-arrow">→</div>
          <div className="journey-stat current">
            <span className="label">Current</span>
            <span className="value">{goalProgress.currentWeight} kg</span>
          </div>
          <div className="journey-arrow">→</div>
          <div className="journey-stat goal">
            <span className="label">Goal</span>
            <span className="value">{goalProgress.goalWeight} kg</span>
          </div>
        </div>
        <div className="journey-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${goalProgress.progressPercent}%` }}
            />
          </div>
          <div className="progress-labels">
            <span>{goalProgress.weightLost} kg lost</span>
            <span>{goalProgress.weightRemaining} kg to go</span>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="card insights-card">
        <h3>Insights</h3>
        <ul className="insights-list">
          {summary.avgDeficit > 0 && (
            <li className="insight positive">
              You're averaging a {summary.avgDeficit} calorie deficit per day. Keep it up!
            </li>
          )}
          {summary.avgDeficit <= 0 && (
            <li className="insight warning">
              You're eating at maintenance or surplus. Consider reducing portions if weight loss is your goal.
            </li>
          )}
          {summary.weekWeightChange < 0 && (
            <li className="insight positive">
              Great progress! You lost {Math.abs(summary.weekWeightChange)} kg this week.
            </li>
          )}
          {summary.weekWeightChange > 0 && (
            <li className="insight warning">
              Weight is up {summary.weekWeightChange} kg this week. This could be water weight or muscle - stay consistent!
            </li>
          )}
          {summary.daysLogged < 5 && (
            <li className="insight info">
              Try to log meals every day for more accurate tracking and projections.
            </li>
          )}
          {summary.weightToLose <= 0 && (
            <li className="insight success">
              Congratulations! You've reached your goal weight! 🎉
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};
