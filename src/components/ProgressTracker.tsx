import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
  Legend,
} from 'recharts';
import { Target, TrendingDown, Plus, Trash2, Footprints, Flame, Trophy, TrendingUp, Sparkles, RefreshCw, Loader2, Calendar } from 'lucide-react';
import type { WeighIn, UserSettings, MonthlyInsights } from '../types';
import { formatWeightValue, convertWeight, convertToKg } from '../utils/weightConversion';

interface ProgressTrackerProps {
  weighIns: WeighIn[];
  settings: UserSettings;
  progressData: {
    calorieData: any[];
    weightData: any[];
    bodyCompData: any[];
    stepsData: any[];
    stepsStats: {
      avgSteps: number;
      maxSteps: number;
      totalSteps: number;
      currentStreak: number;
      daysTracked: number;
    };
  };
  goalProgress: {
    startWeight: number;
    currentWeight: number;
    goalWeight: number;
    weightLost: number;
    weightRemaining: number;
    progressPercent: number;
  };
  onAddWeighIn: (weighIn: WeighIn) => void;
  onDeleteWeighIn: (date: string) => void;
  // AI Insights
  monthlyInsights: MonthlyInsights | null;
  monthlyInsightsLoading: boolean;
  monthlyInsightsError: string | null;
  onGenerateMonthlyInsights: (forceRefresh?: boolean) => void;
  hasApiKey: boolean;
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  weighIns,
  settings,
  progressData,
  goalProgress,
  onAddWeighIn,
  onDeleteWeighIn,
  monthlyInsights,
  monthlyInsightsLoading,
  monthlyInsightsError,
  onGenerateMonthlyInsights,
  hasApiKey,
}) => {
  const weightUnit = settings.weightUnit || 'kg';
  const [newWeighIn, setNewWeighIn] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    weight: '',
  });
  const [activeChart, setActiveChart] = useState<'weight' | 'calories' | 'body' | 'steps' | 'fatmuscle' | 'bmr' | 'visceral'>('weight');

  const handleAddWeighIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWeighIn.weight) return;

    // Convert to kg for storage if using lbs
    const weightValue = parseFloat(newWeighIn.weight);
    const weightInKg = weightUnit === 'lbs' ? convertToKg(weightValue, 'lbs') : weightValue;

    onAddWeighIn({
      date: newWeighIn.date,
      weight: Math.round(weightInKg * 10) / 10, // Round to 1 decimal
    });

    setNewWeighIn({
      date: format(new Date(), 'yyyy-MM-dd'),
      weight: '',
    });
  };

  return (
    <div className="progress-tracker">
      <div className="progress-header">
        <h2>Progress Tracking</h2>
      </div>

      {/* Goal Progress Card */}
      <div className="card goal-card">
        <div className="goal-header">
          <Target size={24} />
          <h3>Weight Goal Progress</h3>
        </div>
        <div className="goal-stats">
          <div className="stat">
            <span className="stat-value">{formatWeightValue(goalProgress.startWeight, weightUnit)}</span>
            <span className="stat-label">Start ({weightUnit})</span>
          </div>
          <div className="stat current">
            <span className="stat-value">{formatWeightValue(goalProgress.currentWeight, weightUnit)}</span>
            <span className="stat-label">Current ({weightUnit})</span>
          </div>
          <div className="stat">
            <span className="stat-value">{formatWeightValue(goalProgress.goalWeight, weightUnit)}</span>
            <span className="stat-label">Goal ({weightUnit})</span>
          </div>
        </div>
        <div className="goal-progress-bar">
          <div
            className="goal-progress-fill"
            style={{ width: `${goalProgress.progressPercent}%` }}
          />
          <span className="goal-progress-text">
            {goalProgress.progressPercent}% to goal
          </span>
        </div>
        <div className="goal-details">
          <span className="lost">
            <TrendingDown size={16} />
            {formatWeightValue(goalProgress.weightLost, weightUnit)} {weightUnit} lost
          </span>
          <span className="remaining">{formatWeightValue(goalProgress.weightRemaining, weightUnit)} {weightUnit} remaining</span>
        </div>
      </div>

      {/* AI Monthly Insights */}
      <div className="card ai-insights-card monthly-insights">
        <div className="ai-insights-header">
          <div className="ai-insights-title">
            <Sparkles size={20} />
            <h3>Monthly AI Analysis</h3>
          </div>
          {hasApiKey && (
            <button
              className="insights-refresh-btn"
              onClick={() => onGenerateMonthlyInsights(true)}
              disabled={monthlyInsightsLoading}
              title="Refresh insights"
            >
              {monthlyInsightsLoading ? (
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
        ) : monthlyInsightsLoading ? (
          <div className="insights-loading">
            <Loader2 size={24} className="spinner" />
            <span>Analyzing your month...</span>
          </div>
        ) : monthlyInsightsError ? (
          <div className="insights-error">
            <p>{monthlyInsightsError}</p>
            <button onClick={() => onGenerateMonthlyInsights(true)}>Try Again</button>
          </div>
        ) : monthlyInsights ? (
          <div className="monthly-insights-content">
            {/* Summary */}
            <div className="monthly-insight-section summary-section">
              <p className="monthly-summary-text">{monthlyInsights.summary}</p>
            </div>

            {/* Goal Prediction */}
            {monthlyInsights.goalPrediction && (
              <div className="monthly-insight-section prediction-section">
                <div className="section-header">
                  <Target size={16} />
                  <span>Goal Prediction</span>
                </div>
                <p className="goal-prediction-text">{monthlyInsights.goalPrediction}</p>
              </div>
            )}

            {/* Trends */}
            {monthlyInsights.trends.length > 0 && (
              <div className="monthly-insight-section">
                <div className="section-header">
                  <TrendingUp size={16} />
                  <span>Trends</span>
                </div>
                <ul className="insight-list">
                  {monthlyInsights.trends.map((trend, idx) => (
                    <li key={idx}>{trend}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Comparison */}
            {monthlyInsights.comparison && (
              <div className="monthly-insight-section comparison-section">
                <div className="section-header">
                  <Calendar size={16} />
                  <span>Progress Check</span>
                </div>
                <p>{monthlyInsights.comparison}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="insights-empty">
            <button
              className="generate-insights-btn"
              onClick={() => onGenerateMonthlyInsights()}
            >
              <Sparkles size={16} />
              Analyze My Month
            </button>
          </div>
        )}
      </div>

      {/* Add Weigh-in Form */}
      <div className="card weighin-form-card">
        <h3>Log Weight</h3>
        <form onSubmit={handleAddWeighIn} className="weighin-form">
          <input
            type="date"
            value={newWeighIn.date}
            onChange={(e) => setNewWeighIn({ ...newWeighIn, date: e.target.value })}
          />
          <div className="weight-input-group">
            <input
              type="number"
              step="0.1"
              placeholder="Weight"
              value={newWeighIn.weight}
              onChange={(e) => setNewWeighIn({ ...newWeighIn, weight: e.target.value })}
            />
            <span>{weightUnit}</span>
          </div>
          <button type="submit">
            <Plus size={16} />
            Add
          </button>
        </form>
      </div>

      {/* Chart Tabs */}
      <div className="chart-tabs">
        <button
          className={activeChart === 'weight' ? 'active' : ''}
          onClick={() => setActiveChart('weight')}
        >
          Weight
        </button>
        <button
          className={activeChart === 'calories' ? 'active' : ''}
          onClick={() => setActiveChart('calories')}
        >
          Calories
        </button>
        <button
          className={activeChart === 'steps' ? 'active' : ''}
          onClick={() => setActiveChart('steps')}
        >
          Steps
        </button>
        {progressData.bodyCompData.length > 0 && (
          <button
            className={activeChart === 'body' ? 'active' : ''}
            onClick={() => setActiveChart('body')}
          >
            Body Comp
          </button>
        )}
        {progressData.bodyCompData.filter((d: any) => d.fatMass).length > 0 && (
          <button
            className={activeChart === 'fatmuscle' ? 'active' : ''}
            onClick={() => setActiveChart('fatmuscle')}
          >
            Fat vs Muscle
          </button>
        )}
        {progressData.bodyCompData.filter((d: any) => d.bmr).length > 0 && (
          <button
            className={activeChart === 'bmr' ? 'active' : ''}
            onClick={() => setActiveChart('bmr')}
          >
            BMR
          </button>
        )}
        {progressData.bodyCompData.filter((d: any) => d.visceralFatGrade).length > 0 && (
          <button
            className={activeChart === 'visceral' ? 'active' : ''}
            onClick={() => setActiveChart('visceral')}
          >
            Visceral Fat
          </button>
        )}
      </div>

      {/* Charts */}
      <div className="card chart-card">
        {activeChart === 'weight' && (
          <>
            <h3>Weight Over Time</h3>
            {progressData.weightData.length > 0 ? (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={progressData.weightData.map(d => ({
                    ...d,
                    weight: convertWeight(d.weight, weightUnit)
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="displayDate"
                      tick={{ fontSize: 12 }}
                      stroke="#9ca3af"
                    />
                    <YAxis
                      domain={['dataMin - 2', 'dataMax + 2']}
                      tick={{ fontSize: 12 }}
                      stroke="#9ca3af"
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                      formatter={(value) => [`${Number(value).toFixed(1)} ${weightUnit}`, 'Weight']}
                    />
                    <ReferenceLine
                      y={convertWeight(settings.goalWeight, weightUnit)}
                      stroke="#10b981"
                      strokeDasharray="5 5"
                      label={{ value: 'Goal', fill: '#10b981', fontSize: 12 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={{ fill: '#6366f1', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="no-data">No weight data yet. Add your first weigh-in above!</p>
            )}
          </>
        )}

        {activeChart === 'calories' && (
          <>
            <h3>Daily Calories (Last 30 Days)</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={progressData.calorieData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="displayDate"
                    tick={{ fontSize: 12 }}
                    stroke="#9ca3af"
                  />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <ReferenceLine
                    y={settings.dailyCalorieTargetMin}
                    stroke="#10b981"
                    strokeDasharray="3 3"
                  />
                  <ReferenceLine
                    y={settings.dailyCalorieTargetMax}
                    stroke="#f59e0b"
                    strokeDasharray="3 3"
                  />
                  <Area
                    type="monotone"
                    dataKey="calories"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {activeChart === 'body' && progressData.bodyCompData.length > 0 && (
          <>
            <h3>Body Composition</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={progressData.bodyCompData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="displayDate"
                    tick={{ fontSize: 12 }}
                    stroke="#9ca3af"
                  />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="bodyFat"
                    name="Body Fat %"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="skeletalMuscle"
                    name={`Skeletal Muscle (${weightUnit})`}
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* Fat vs Muscle Chart */}
        {activeChart === 'fatmuscle' && progressData.bodyCompData.filter((d: any) => d.fatMass).length > 0 && (
          <>
            <h3>Fat Mass vs Muscle Mass</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={progressData.bodyCompData.filter((d: any) => d.fatMass)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="displayDate"
                    tick={{ fontSize: 12 }}
                    stroke="#9ca3af"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="#9ca3af"
                    label={{ value: weightUnit, angle: -90, position: 'insideLeft', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    formatter={(value) => [`${value} ${weightUnit}`, '']}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="fatMass"
                    name="Fat Mass"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#ef4444' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="muscleMass"
                    name="Muscle Mass"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#10b981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* BMR Trend Chart */}
        {activeChart === 'bmr' && progressData.bodyCompData.filter((d: any) => d.bmr).length > 0 && (
          <>
            <h3>Basal Metabolic Rate (BMR) Trend</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={progressData.bodyCompData.filter((d: any) => d.bmr)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="displayDate"
                    tick={{ fontSize: 12 }}
                    stroke="#9ca3af"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="#9ca3af"
                    label={{ value: 'kcal/day', angle: -90, position: 'insideLeft', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    formatter={(value) => [`${value} kcal/day`, 'BMR']}
                  />
                  <Line
                    type="monotone"
                    dataKey="bmr"
                    name="BMR"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#f59e0b' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* Visceral Fat Chart */}
        {activeChart === 'visceral' && progressData.bodyCompData.filter((d: any) => d.visceralFatGrade).length > 0 && (
          <>
            <h3>Visceral Fat Grade</h3>
            <p className="chart-subtitle">
              <span className="healthy-zone">Grade 1-9: Healthy</span>
              <span className="elevated-zone">Grade 10-14: Elevated</span>
              <span className="danger-zone">Grade 15+: High Risk</span>
            </p>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={progressData.bodyCompData.filter((d: any) => d.visceralFatGrade)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="displayDate"
                    tick={{ fontSize: 12 }}
                    stroke="#9ca3af"
                  />
                  <YAxis
                    domain={[0, 20]}
                    tick={{ fontSize: 12 }}
                    stroke="#9ca3af"
                    label={{ value: 'Grade', angle: -90, position: 'insideLeft', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    formatter={(value) => {
                      const numValue = Number(value);
                      return [
                        `Grade ${value}`,
                        numValue < 10 ? 'Healthy' : numValue < 15 ? 'Elevated' : 'High Risk'
                      ];
                    }}
                  />
                  <ReferenceLine y={10} stroke="#f59e0b" strokeDasharray="5 5" />
                  <ReferenceLine y={15} stroke="#ef4444" strokeDasharray="5 5" />
                  <Line
                    type="monotone"
                    dataKey="visceralFatGrade"
                    name="Visceral Fat"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#8b5cf6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {activeChart === 'steps' && (
          <>
            <h3>Daily Steps (Last 30 Days)</h3>
            {progressData.stepsData.length > 0 ? (
              <>
                {/* Motivational Stats */}
                <div className="steps-stats-grid">
                  <div className="steps-stat-card">
                    <Flame size={20} className="stat-icon flame" />
                    <div className="stat-content">
                      <span className="stat-value">{progressData.stepsStats.currentStreak}</span>
                      <span className="stat-label">Day Streak (10k+)</span>
                    </div>
                  </div>
                  <div className="steps-stat-card">
                    <TrendingUp size={20} className="stat-icon avg" />
                    <div className="stat-content">
                      <span className="stat-value">{progressData.stepsStats.avgSteps.toLocaleString()}</span>
                      <span className="stat-label">Daily Average</span>
                    </div>
                  </div>
                  <div className="steps-stat-card">
                    <Trophy size={20} className="stat-icon trophy" />
                    <div className="stat-content">
                      <span className="stat-value">{progressData.stepsStats.maxSteps.toLocaleString()}</span>
                      <span className="stat-label">Personal Best</span>
                    </div>
                  </div>
                  <div className="steps-stat-card">
                    <Footprints size={20} className="stat-icon total" />
                    <div className="stat-content">
                      <span className="stat-value">{progressData.stepsStats.totalSteps.toLocaleString()}</span>
                      <span className="stat-label">Total Steps</span>
                    </div>
                  </div>
                </div>

                {/* Steps Chart */}
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={progressData.stepsData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="displayDate"
                        tick={{ fontSize: 12 }}
                        stroke="#9ca3af"
                      />
                      <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                      <Tooltip
                        contentStyle={{
                          background: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                        }}
                        formatter={(value) => [typeof value === 'number' ? value.toLocaleString() : '0', 'Steps']}
                      />
                      <ReferenceLine
                        y={10000}
                        stroke="#10b981"
                        strokeDasharray="5 5"
                        label={{ value: '10k Goal', fill: '#10b981', fontSize: 12 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="steps"
                        stroke="#8b5cf6"
                        fill="#8b5cf6"
                        fillOpacity={0.2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Motivational Message */}
                <div className="steps-motivation">
                  {progressData.stepsStats.avgSteps >= 10000 ? (
                    <p className="motivation-text success">
                      Amazing! You're averaging {progressData.stepsStats.avgSteps.toLocaleString()} steps daily. Keep crushing it!
                    </p>
                  ) : progressData.stepsStats.avgSteps >= 7500 ? (
                    <p className="motivation-text good">
                      Great progress! You're {(10000 - progressData.stepsStats.avgSteps).toLocaleString()} steps away from 10k average.
                    </p>
                  ) : (
                    <p className="motivation-text encourage">
                      Every step counts! Aim for 10,000 steps daily to boost your health.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="no-data">
                <Footprints size={48} className="no-data-icon" />
                <p>No steps data yet.</p>
                <p className="no-data-hint">Import your Apple Health data from the Dashboard to track your daily steps!</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Recent Weigh-ins */}
      {weighIns.length > 0 && (
        <div className="card weighins-list">
          <h3>Recent Weigh-ins</h3>
          <div className="weighins-grid">
            {[...weighIns]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 10)
              .map((weighIn) => (
                <div key={weighIn.date} className="weighin-item">
                  <span className="weighin-date">
                    {format(parseISO(weighIn.date), 'MMM d, yyyy')}
                  </span>
                  <span className="weighin-weight">{formatWeightValue(weighIn.weight, weightUnit)} {weightUnit}</span>
                  <button
                    className="delete-btn"
                    onClick={() => onDeleteWeighIn(weighIn.date)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
