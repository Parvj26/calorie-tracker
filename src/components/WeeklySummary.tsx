import React from 'react';
import { Calendar, TrendingDown, Scale, Clock, Sparkles, RefreshCw, Loader2, Trophy, Lightbulb, TrendingUp } from 'lucide-react';
import type { WeeklyInsights } from '../types';

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
  // AI Insights
  weeklyInsights: WeeklyInsights | null;
  weeklyInsightsLoading: boolean;
  weeklyInsightsError: string | null;
  onGenerateWeeklyInsights: (forceRefresh?: boolean) => void;
  hasApiKey: boolean;
}

export const WeeklySummary: React.FC<WeeklySummaryProps> = ({
  summary,
  goalProgress,
  weeklyInsights,
  weeklyInsightsLoading,
  weeklyInsightsError,
  onGenerateWeeklyInsights,
  hasApiKey,
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

      {/* Basic Insights */}
      <div className="card insights-card">
        <h3>Quick Insights</h3>
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

      {/* AI Weekly Insights */}
      <div className="card ai-insights-card weekly-insights">
        <div className="ai-insights-header">
          <div className="ai-insights-title">
            <Sparkles size={20} />
            <h3>AI Weekly Analysis</h3>
          </div>
          {hasApiKey && (
            <button
              className="insights-refresh-btn"
              onClick={() => onGenerateWeeklyInsights(true)}
              disabled={weeklyInsightsLoading}
              title="Refresh insights"
            >
              {weeklyInsightsLoading ? (
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
        ) : weeklyInsightsLoading ? (
          <div className="insights-loading">
            <Loader2 size={24} className="spinner" />
            <span>Analyzing your week...</span>
          </div>
        ) : weeklyInsightsError ? (
          <div className="insights-error">
            <p>{weeklyInsightsError}</p>
            <button onClick={() => onGenerateWeeklyInsights(true)}>Try Again</button>
          </div>
        ) : weeklyInsights ? (
          <div className="weekly-insights-content">
            {/* Summary */}
            <div className="weekly-insight-section summary-section">
              <p className="weekly-summary-text">{weeklyInsights.summary}</p>
            </div>

            {/* Patterns */}
            {weeklyInsights.patterns.length > 0 && (
              <div className="weekly-insight-section">
                <div className="section-header">
                  <TrendingUp size={16} />
                  <span>Patterns</span>
                </div>
                <ul className="insight-list">
                  {weeklyInsights.patterns.map((pattern, idx) => (
                    <li key={idx}>{pattern}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Wins */}
            {weeklyInsights.wins.length > 0 && (
              <div className="weekly-insight-section wins-section">
                <div className="section-header">
                  <Trophy size={16} />
                  <span>Wins</span>
                </div>
                <ul className="insight-list wins">
                  {weeklyInsights.wins.map((win, idx) => (
                    <li key={idx}>{win}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggestions */}
            {weeklyInsights.suggestions.length > 0 && (
              <div className="weekly-insight-section">
                <div className="section-header">
                  <Lightbulb size={16} />
                  <span>Suggestions</span>
                </div>
                <ul className="insight-list suggestions">
                  {weeklyInsights.suggestions.map((suggestion, idx) => (
                    <li key={idx}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="insights-empty">
            <button
              className="generate-insights-btn"
              onClick={() => onGenerateWeeklyInsights()}
            >
              <Sparkles size={16} />
              Analyze My Week
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
