import React, { useState } from 'react';
import { format } from 'date-fns';
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
} from 'recharts';
import { Target, TrendingDown, Plus, Trash2 } from 'lucide-react';
import type { WeighIn, UserSettings } from '../types';

interface ProgressTrackerProps {
  weighIns: WeighIn[];
  settings: UserSettings;
  progressData: {
    calorieData: any[];
    weightData: any[];
    bodyCompData: any[];
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
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  weighIns,
  settings,
  progressData,
  goalProgress,
  onAddWeighIn,
  onDeleteWeighIn,
}) => {
  const [newWeighIn, setNewWeighIn] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    weight: '',
  });
  const [activeChart, setActiveChart] = useState<'weight' | 'calories' | 'body'>('weight');

  const handleAddWeighIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWeighIn.weight) return;

    onAddWeighIn({
      date: newWeighIn.date,
      weight: parseFloat(newWeighIn.weight),
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
            <span className="stat-value">{goalProgress.startWeight}</span>
            <span className="stat-label">Start (kg)</span>
          </div>
          <div className="stat current">
            <span className="stat-value">{goalProgress.currentWeight}</span>
            <span className="stat-label">Current (kg)</span>
          </div>
          <div className="stat">
            <span className="stat-value">{goalProgress.goalWeight}</span>
            <span className="stat-label">Goal (kg)</span>
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
            {goalProgress.weightLost} kg lost
          </span>
          <span className="remaining">{goalProgress.weightRemaining} kg remaining</span>
        </div>
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
            <span>kg</span>
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
        {progressData.bodyCompData.length > 0 && (
          <button
            className={activeChart === 'body' ? 'active' : ''}
            onClick={() => setActiveChart('body')}
          >
            Body Comp
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
                  <LineChart data={progressData.weightData}>
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
                    />
                    <ReferenceLine
                      y={settings.goalWeight}
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
                    name="Skeletal Muscle (kg)"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
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
                    {format(new Date(weighIn.date), 'MMM d, yyyy')}
                  </span>
                  <span className="weighin-weight">{weighIn.weight} kg</span>
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
