import React, { useState, useRef } from 'react';
import { X, Upload, Loader, Activity, Footprints, Check, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { extractHealthData, type HealthDataExtracted } from '../utils/openai';

interface HealthScannerProps {
  apiKey: string;
  selectedDate: string;
  currentWorkoutCalories: number;
  onUpdateWorkoutCalories: (calories: number, date: string) => void;
  onClose: () => void;
}

export const HealthScanner: React.FC<HealthScannerProps> = ({
  apiKey,
  selectedDate,
  currentWorkoutCalories,
  onUpdateWorkoutCalories,
  onClose,
}) => {
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<HealthDataExtracted | null>(null);
  const [appliedFields, setAppliedFields] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setImage(base64);
      setError(null);
      setExtractedData(null);
      setAppliedFields(new Set());

      if (!apiKey) {
        setError('Please add your OpenAI API key in Settings first');
        return;
      }

      setAnalyzing(true);
      try {
        const data = await extractHealthData(base64, apiKey);
        setExtractedData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to analyze image');
      } finally {
        setAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const applyWorkoutCalories = () => {
    const totalCals = getTotalWorkoutCalories();
    if (totalCals > 0) {
      const newTotal = currentWorkoutCalories + totalCals;
      onUpdateWorkoutCalories(newTotal, selectedDate);
      setAppliedFields(prev => new Set([...prev, 'calories']));
    }
  };

  const getTotalWorkoutCalories = () => {
    if (!extractedData) return 0;
    const workoutCals = extractedData.workouts?.reduce((sum, w) => sum + (w.calories || 0), 0) || 0;
    return extractedData.activeCalories || workoutCals;
  };

  return (
    <div className="health-scanner-overlay">
      <div className="health-scanner">
        <div className="scanner-header">
          <h2>Import from Health App</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="scanner-content">
          {!image ? (
            <div className="upload-section">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                ref={fileInputRef}
                hidden
              />
              <button
                className="upload-health-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={!apiKey}
              >
                <Upload size={32} />
                <span className="upload-title">Upload Health Screenshot</span>
                <span className="upload-hint">Take a screenshot of your Apple Health summary</span>
              </button>
              {!apiKey && (
                <p className="api-warning">
                  <AlertCircle size={16} />
                  Add OpenAI API key in Settings first
                </p>
              )}
              <div className="health-tips">
                <h4>Tips for best results:</h4>
                <ul>
                  <li>Screenshot your Activity rings summary</li>
                  <li>Or screenshot specific workout details</li>
                  <li>Shows Move calories, steps, exercise time</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="analysis-section">
              <div className="image-preview-small">
                <img src={image} alt="Health screenshot" />
                {analyzing && (
                  <div className="analyzing-overlay">
                    <Loader className="spin" size={32} />
                    <span>Analyzing...</span>
                  </div>
                )}
              </div>

              {error && (
                <div className="error-message">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}

              {extractedData && (
                <div className="extracted-data">
                  <h3>Extracted Data</h3>

                  {extractedData.date && (
                    <p className="data-date">
                      Date: {format(new Date(extractedData.date), 'MMM d, yyyy')}
                    </p>
                  )}

                  <div className="health-metrics">
                    {/* Workout Calories */}
                    {getTotalWorkoutCalories() > 0 && (
                      <div className={`health-metric-card ${appliedFields.has('calories') ? 'applied' : ''}`}>
                        <div className="metric-icon calories">
                          <Activity size={24} />
                        </div>
                        <div className="metric-details">
                          <span className="metric-title">Workout Calories</span>
                          <span className="metric-value-large">{getTotalWorkoutCalories()} cal</span>
                          {extractedData.workouts && extractedData.workouts.length > 0 && (
                            <span className="metric-sub">
                              {extractedData.workouts.map(w => w.type).join(', ')}
                            </span>
                          )}
                        </div>
                        <button
                          className={`apply-btn ${appliedFields.has('calories') ? 'applied' : ''}`}
                          onClick={applyWorkoutCalories}
                          disabled={appliedFields.has('calories')}
                        >
                          {appliedFields.has('calories') ? <Check size={18} /> : 'Add'}
                        </button>
                      </div>
                    )}


                    {/* Steps - Display only */}
                    {extractedData.steps && (
                      <div className="health-metric-card info-only">
                        <div className="metric-icon steps">
                          <Footprints size={24} />
                        </div>
                        <div className="metric-details">
                          <span className="metric-title">Steps</span>
                          <span className="metric-value-large">{extractedData.steps.toLocaleString()}</span>
                          {extractedData.walkingDistance && (
                            <span className="metric-sub">{extractedData.walkingDistance.toFixed(1)} km</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Exercise Minutes - Display only */}
                    {extractedData.exerciseMinutes && (
                      <div className="health-metric-card info-only">
                        <div className="metric-icon exercise">
                          <Activity size={24} />
                        </div>
                        <div className="metric-details">
                          <span className="metric-title">Exercise</span>
                          <span className="metric-value-large">{extractedData.exerciseMinutes} min</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {getTotalWorkoutCalories() === 0 && !extractedData.steps && !extractedData.exerciseMinutes && (
                    <p className="no-data-message">
                      No relevant data found. Try a different screenshot.
                    </p>
                  )}
                </div>
              )}

              <div className="scanner-actions">
                <button
                  className="retake-btn"
                  onClick={() => {
                    setImage(null);
                    setExtractedData(null);
                    setError(null);
                    setAppliedFields(new Set());
                  }}
                >
                  Upload Another
                </button>
                <button className="done-btn" onClick={onClose}>
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
