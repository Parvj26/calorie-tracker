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
import {
  Target,
  TrendingDown,
  Plus,
  Trash2,
  Footprints,
  Flame,
  Trophy,
  TrendingUp,
  Sparkles,
  RefreshCw,
  Loader2,
  Calendar,
  Brain,
  Scale,
  Activity,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { WeighIn, UserSettings, MonthlyInsights } from '../types';
import type { BodyIntelligence } from '../utils/bodyIntelligence';
import {
  getResponseScoreInterpretation,
  getQualityInterpretation,
  getMetabolicInterpretation,
} from '../utils/bodyIntelligence';
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
    bodyIntelligence: BodyIntelligence;
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
  const [activeChart, setActiveChart] = useState<'weight' | 'energy' | 'activity'>('weight');
  const [showWeighIns, setShowWeighIns] = useState(false);

  const bodyIntelligence = progressData.bodyIntelligence;
  const responseInterp = getResponseScoreInterpretation(
    bodyIntelligence.responseScore,
    bodyIntelligence.responseStatus
  );
  const qualityInterp = getQualityInterpretation(
    bodyIntelligence.fatLossEfficiency,
    bodyIntelligence.qualityStatus
  );
  const metabolicInterp = getMetabolicInterpretation(
    bodyIntelligence.metabolicStatus,
    bodyIntelligence.bmrChange
  );

  const handleAddWeighIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWeighIn.weight) return;

    const weightValue = parseFloat(newWeighIn.weight);
    const weightInKg = weightUnit === 'lbs' ? convertToKg(weightValue, 'lbs') : weightValue;

    onAddWeighIn({
      date: newWeighIn.date,
      weight: Math.round(weightInKg * 10) / 10,
    });

    setNewWeighIn({
      date: format(new Date(), 'yyyy-MM-dd'),
      weight: '',
    });
  };

  // Calculate this month's weight change for hero stats
  const monthWeightChange = bodyIntelligence.actualWeightLoss;

  return (
    <div className="progress-tracker">
      <div className="progress-header">
        <h2>Progress</h2>
      </div>

      {/* Hero Stats Bar */}
      <div className="hero-stats-bar">
        <div className="hero-stat">
          <span className="hero-stat-value" style={{ color: monthWeightChange > 0 ? '#10b981' : '#6b7280' }}>
            {monthWeightChange > 0 ? '-' : ''}{formatWeightValue(Math.abs(monthWeightChange), weightUnit)}
          </span>
          <span className="hero-stat-label">This Month</span>
        </div>
        <div className="hero-stat-divider" />
        <div className="hero-stat">
          <span
            className="hero-stat-value"
            style={{ color: responseInterp.color }}
          >
            {bodyIntelligence.responseStatus !== 'insufficient-data'
              ? `${bodyIntelligence.responseScore}%`
              : '—'}
          </span>
          <span className="hero-stat-label">Response</span>
        </div>
        <div className="hero-stat-divider" />
        <div className="hero-stat">
          <span
            className="hero-stat-value"
            style={{ color: qualityInterp.color }}
          >
            {bodyIntelligence.hasInBodyData && bodyIntelligence.fatLossEfficiency > 0
              ? `${bodyIntelligence.fatLossEfficiency}%`
              : '—'}
          </span>
          <span className="hero-stat-label">Fat Loss</span>
        </div>
      </div>

      {/* Body Intelligence Card */}
      <div className="card body-intelligence-card">
        <div className="card-header">
          <Brain size={20} />
          <h3>Body Intelligence</h3>
          {bodyIntelligence.daysWithData > 0 && (
            <span className={`confidence-badge confidence-${bodyIntelligence.confidence}`}>
              {bodyIntelligence.confidence === 'high' ? 'High' :
               bodyIntelligence.confidence === 'medium' ? 'Good' :
               bodyIntelligence.confidence === 'low' ? 'Early' : 'Very Early'}
            </span>
          )}
        </div>

        {/* Confidence Warning for early data */}
        {bodyIntelligence.daysWithData > 0 && !bodyIntelligence.hasEnoughData && (
          <div className="confidence-notice">
            <span className="confidence-icon">📊</span>
            <span>{bodyIntelligence.confidenceMessage}</span>
          </div>
        )}

        <div className="intelligence-status" style={{ borderLeftColor: responseInterp.color }}>
          <span className="status-emoji">{responseInterp.emoji}</span>
          <div className="status-content">
            <span className="status-title" style={{ color: responseInterp.color }}>
              {responseInterp.status}
            </span>
            <p className="status-message">{responseInterp.message}</p>
          </div>
        </div>

        {bodyIntelligence.daysWithData > 0 && bodyIntelligence.accumulatedDeficit !== 0 && (
          <div className="intelligence-details">
            <div className="detail-row">
              <span className="detail-label">Expected loss:</span>
              <span className="detail-value">
                {bodyIntelligence.expectedWeightLoss > 0 ? '-' : ''}
                {formatWeightValue(Math.abs(bodyIntelligence.expectedWeightLoss), weightUnit)} {weightUnit}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Actual loss:</span>
              <span className="detail-value highlight">
                {bodyIntelligence.actualWeightLoss > 0 ? '-' : '+'}
                {formatWeightValue(Math.abs(bodyIntelligence.actualWeightLoss), weightUnit)} {weightUnit}
              </span>
            </div>
            {bodyIntelligence.responseScore > 0 && (
              <div className="response-bar">
                <div
                  className="response-fill"
                  style={{
                    width: `${Math.min(100, Math.max(0, bodyIntelligence.responseScore))}%`,
                    backgroundColor: responseInterp.color,
                  }}
                />
                <span className="response-label">{bodyIntelligence.responseScore}%</span>
              </div>
            )}
            <p className="intelligence-footnote">
              Based on {bodyIntelligence.accumulatedDeficit.toLocaleString()} cal deficit
              over {bodyIntelligence.daysWithData} day{bodyIntelligence.daysWithData !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      {/* Weight Quality Card (only show with InBody data) */}
      {bodyIntelligence.hasInBodyData && bodyIntelligence.totalWeightLost > 0 && (
        <div className="card weight-quality-card">
          <div className="card-header">
            <Scale size={20} />
            <h3>Weight Quality</h3>
          </div>
          <div className="quality-status" style={{ borderLeftColor: qualityInterp.color }}>
            <span className="status-emoji">{qualityInterp.emoji}</span>
            <div className="status-content">
              <span className="status-title" style={{ color: qualityInterp.color }}>
                {qualityInterp.status}
              </span>
              <p className="status-message">{qualityInterp.message}</p>
            </div>
          </div>

          <div className="quality-breakdown">
            <div className="breakdown-item">
              <div className="breakdown-header">
                <span>Fat</span>
                <span>-{formatWeightValue(bodyIntelligence.fatLost, weightUnit)} {weightUnit}</span>
              </div>
              <div className="breakdown-bar">
                <div
                  className="breakdown-fill fat"
                  style={{
                    width: `${Math.min(100, (bodyIntelligence.fatLost / bodyIntelligence.totalWeightLost) * 100)}%`,
                  }}
                />
              </div>
            </div>
            <div className="breakdown-item">
              <div className="breakdown-header">
                <span>Muscle</span>
                <span>
                  {bodyIntelligence.muscleLost > 0 ? '-' : '+'}
                  {formatWeightValue(Math.abs(bodyIntelligence.muscleLost), weightUnit)} {weightUnit}
                </span>
              </div>
              <div className="breakdown-bar">
                <div
                  className="breakdown-fill muscle"
                  style={{
                    width: `${Math.min(100, Math.abs(bodyIntelligence.muscleLost / bodyIntelligence.totalWeightLost) * 100)}%`,
                  }}
                />
              </div>
            </div>
            {bodyIntelligence.waterChange !== 0 && (
              <div className="breakdown-item">
                <div className="breakdown-header">
                  <span>Water</span>
                  <span>
                    {bodyIntelligence.waterChange > 0 ? '-' : '+'}
                    {formatWeightValue(Math.abs(bodyIntelligence.waterChange), weightUnit)} {weightUnit}
                  </span>
                </div>
                <div className="breakdown-bar">
                  <div
                    className="breakdown-fill water"
                    style={{
                      width: `${Math.min(100, Math.abs(bodyIntelligence.waterChange / bodyIntelligence.totalWeightLost) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Metabolic Health Card (only show with BMR data) */}
      {bodyIntelligence.hasBMRData && (
        <div className="card metabolic-health-card">
          <div className="card-header">
            <Activity size={20} />
            <h3>Metabolic Health</h3>
          </div>
          <div className="metabolic-status" style={{ borderLeftColor: metabolicInterp.color }}>
            <span className="status-emoji">{metabolicInterp.emoji}</span>
            <div className="status-content">
              <span className="status-title" style={{ color: metabolicInterp.color }}>
                {metabolicInterp.status}
              </span>
              <p className="status-message">{metabolicInterp.message}</p>
            </div>
          </div>

          <div className="metabolic-details">
            <div className="detail-row">
              <span className="detail-label">Current BMR:</span>
              <span className="detail-value">{bodyIntelligence.currentBMR} cal/day</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">BMR Change:</span>
              <span
                className="detail-value"
                style={{ color: bodyIntelligence.bmrChange < 0 ? '#f59e0b' : '#10b981' }}
              >
                {bodyIntelligence.bmrChange > 0 ? '+' : ''}{bodyIntelligence.bmrChange} cal/day
              </span>
            </div>
            <p className="metabolic-footnote">
              Expected: {bodyIntelligence.expectedBmrChange} cal drop per {formatWeightValue(bodyIntelligence.totalWeightLost, weightUnit)} {weightUnit} lost
            </p>
          </div>
        </div>
      )}

      {/* Goal Progress Card */}
      <div className="card goal-card">
        <div className="goal-header">
          <Target size={24} />
          <h3>Weight Goal</h3>
        </div>
        <div className="goal-stats">
          <div className="stat">
            <span className="stat-value">{formatWeightValue(goalProgress.startWeight, weightUnit)}</span>
            <span className="stat-label">Start</span>
          </div>
          <div className="stat current">
            <span className="stat-value">{formatWeightValue(goalProgress.currentWeight, weightUnit)}</span>
            <span className="stat-label">Current</span>
          </div>
          <div className="stat">
            <span className="stat-value">{formatWeightValue(goalProgress.goalWeight, weightUnit)}</span>
            <span className="stat-label">Goal</span>
          </div>
        </div>
        <div className="goal-progress-bar">
          <div
            className="goal-progress-fill"
            style={{ width: `${goalProgress.progressPercent}%` }}
          />
          <span className="goal-progress-text">
            {goalProgress.progressPercent}% complete
          </span>
        </div>
        <div className="goal-details">
          <span className="lost">
            <TrendingDown size={16} />
            {formatWeightValue(goalProgress.weightLost, weightUnit)} {weightUnit} lost
          </span>
          <span className="remaining">{formatWeightValue(goalProgress.weightRemaining, weightUnit)} {weightUnit} to go</span>
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
            <div className="monthly-insight-section summary-section">
              <p className="monthly-summary-text">{monthlyInsights.summary}</p>
            </div>

            {monthlyInsights.goalPrediction && (
              <div className="monthly-insight-section prediction-section">
                <div className="section-header">
                  <Target size={16} />
                  <span>Goal Prediction</span>
                </div>
                <p className="goal-prediction-text">{monthlyInsights.goalPrediction}</p>
              </div>
            )}

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

      {/* Consolidated Chart Tabs (3 instead of 7) */}
      <div className="chart-tabs">
        <button
          className={activeChart === 'weight' ? 'active' : ''}
          onClick={() => setActiveChart('weight')}
        >
          Weight & Body
        </button>
        <button
          className={activeChart === 'energy' ? 'active' : ''}
          onClick={() => setActiveChart('energy')}
        >
          Energy
        </button>
        <button
          className={activeChart === 'activity' ? 'active' : ''}
          onClick={() => setActiveChart('activity')}
        >
          Activity
        </button>
      </div>

      {/* Charts */}
      <div className="card chart-card">
        {/* Weight & Body Tab */}
        {activeChart === 'weight' && (
          <>
            <h3>Weight Over Time</h3>
            {progressData.weightData.length > 0 ? (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={progressData.weightData.map(d => ({
                    ...d,
                    weight: convertWeight(d.weight, weightUnit)
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="displayDate"
                      tick={{ fontSize: 11 }}
                      stroke="#9ca3af"
                    />
                    <YAxis
                      domain={['dataMin - 2', 'dataMax + 2']}
                      tick={{ fontSize: 11 }}
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
                      label={{ value: 'Goal', fill: '#10b981', fontSize: 11 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={{ fill: '#6366f1', r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="no-data">No weight data yet. Add your first weigh-in above!</p>
            )}

            {/* Body Composition (if InBody data exists) */}
            {progressData.bodyCompData.length > 0 && (
              <>
                <h3 style={{ marginTop: '1.5rem' }}>Body Composition</h3>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={progressData.bodyCompData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="displayDate"
                        tick={{ fontSize: 11 }}
                        stroke="#9ca3af"
                      />
                      <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                      <Tooltip
                        contentStyle={{
                          background: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="bodyFat"
                        name="Body Fat %"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="skeletalMuscle"
                        name={`Skeletal Muscle (${weightUnit})`}
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}

            {/* Fat vs Muscle Chart (if data exists) */}
            {progressData.bodyCompData.filter((d: any) => d.fatMass).length > 1 && (
              <>
                <h3 style={{ marginTop: '1.5rem' }}>Fat vs Muscle Mass</h3>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={progressData.bodyCompData.filter((d: any) => d.fatMass)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="displayDate"
                        tick={{ fontSize: 11 }}
                        stroke="#9ca3af"
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        stroke="#9ca3af"
                        label={{ value: weightUnit, angle: -90, position: 'insideLeft', fontSize: 11 }}
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
                        dot={{ r: 3, fill: '#ef4444' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="muscleMass"
                        name="Muscle Mass"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#10b981' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </>
        )}

        {/* Energy Tab */}
        {activeChart === 'energy' && (
          <>
            <h3>Daily Calories (Last 30 Days)</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={progressData.calorieData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="displayDate"
                    tick={{ fontSize: 11 }}
                    stroke="#9ca3af"
                  />
                  <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
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

            {/* BMR Trend (if data exists) */}
            {progressData.bodyCompData.filter((d: any) => d.bmr).length > 1 && (
              <>
                <h3 style={{ marginTop: '1.5rem' }}>BMR Trend</h3>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={progressData.bodyCompData.filter((d: any) => d.bmr)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="displayDate"
                        tick={{ fontSize: 11 }}
                        stroke="#9ca3af"
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        stroke="#9ca3af"
                        label={{ value: 'kcal/day', angle: -90, position: 'insideLeft', fontSize: 11 }}
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
                        dot={{ r: 3, fill: '#f59e0b' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </>
        )}

        {/* Activity Tab */}
        {activeChart === 'activity' && (
          <>
            <h3>Daily Steps (Last 30 Days)</h3>
            {progressData.stepsData.length > 0 ? (
              <>
                {/* Steps Stats Grid */}
                <div className="steps-stats-grid">
                  <div className="steps-stat-card">
                    <Flame size={18} className="stat-icon flame" />
                    <div className="stat-content">
                      <span className="stat-value">{progressData.stepsStats.currentStreak}</span>
                      <span className="stat-label">Day Streak</span>
                    </div>
                  </div>
                  <div className="steps-stat-card">
                    <TrendingUp size={18} className="stat-icon avg" />
                    <div className="stat-content">
                      <span className="stat-value">{progressData.stepsStats.avgSteps.toLocaleString()}</span>
                      <span className="stat-label">Avg Steps</span>
                    </div>
                  </div>
                  <div className="steps-stat-card">
                    <Trophy size={18} className="stat-icon trophy" />
                    <div className="stat-content">
                      <span className="stat-value">{progressData.stepsStats.maxSteps.toLocaleString()}</span>
                      <span className="stat-label">Best Day</span>
                    </div>
                  </div>
                  <div className="steps-stat-card">
                    <Footprints size={18} className="stat-icon total" />
                    <div className="stat-content">
                      <span className="stat-value">{progressData.stepsStats.totalSteps.toLocaleString()}</span>
                      <span className="stat-label">Total</span>
                    </div>
                  </div>
                </div>

                {/* Steps Chart */}
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={progressData.stepsData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="displayDate"
                        tick={{ fontSize: 11 }}
                        stroke="#9ca3af"
                      />
                      <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
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
                        label={{ value: '10k', fill: '#10b981', fontSize: 11 }}
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

                {/* Visceral Fat (if data exists) */}
                {progressData.bodyCompData.filter((d: any) => d.visceralFatGrade).length > 0 && (
                  <>
                    <h3 style={{ marginTop: '1.5rem' }}>Visceral Fat Grade</h3>
                    <p className="chart-subtitle">
                      <span className="healthy-zone">1-9: Healthy</span>
                      <span className="elevated-zone">10-14: Elevated</span>
                      <span className="danger-zone">15+: High Risk</span>
                    </p>
                    <div className="chart-container">
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={progressData.bodyCompData.filter((d: any) => d.visceralFatGrade)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis
                            dataKey="displayDate"
                            tick={{ fontSize: 11 }}
                            stroke="#9ca3af"
                          />
                          <YAxis
                            domain={[0, 20]}
                            tick={{ fontSize: 11 }}
                            stroke="#9ca3af"
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
                            dot={{ r: 3, fill: '#8b5cf6' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
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

      {/* Collapsible Recent Weigh-ins */}
      {weighIns.length > 0 && (
        <div className="card weighins-list">
          <button
            className="weighins-toggle"
            onClick={() => setShowWeighIns(!showWeighIns)}
          >
            <h3>Recent Weigh-ins</h3>
            {showWeighIns ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>

          {showWeighIns && (
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
          )}
        </div>
      )}
    </div>
  );
};
