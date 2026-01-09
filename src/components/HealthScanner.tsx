import React, { useState, useRef } from 'react';
import { X, Upload, Loader, Activity, Footprints, Check, AlertCircle, Flame, Clock, Zap, Edit3 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { extractHealthData, type HealthDataExtracted } from '../utils/openai';
import { groqExtractHealthData } from '../utils/groq';
import type { AIProvider, HealthMetrics } from '../types';

type EntryMode = 'upload' | 'manual';

interface HealthScannerProps {
  aiProvider: AIProvider;
  openAiApiKey?: string;
  groqApiKey?: string;
  groqApiKeyBackup?: string;
  selectedDate: string;
  currentHealthMetrics?: HealthMetrics;
  onUpdateHealthMetrics: (metrics: HealthMetrics, date: string) => void;
  onClose: () => void;
}

export const HealthScanner: React.FC<HealthScannerProps> = ({
  aiProvider,
  openAiApiKey,
  groqApiKey,
  groqApiKeyBackup,
  selectedDate,
  currentHealthMetrics,
  onUpdateHealthMetrics,
  onClose,
}) => {
  const apiKey = aiProvider === 'groq' ? groqApiKey : openAiApiKey;
  const [entryMode, setEntryMode] = useState<EntryMode>('upload');
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<HealthDataExtracted | null>(null);
  const [imported, setImported] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual entry form state
  const [manualForm, setManualForm] = useState<HealthMetrics>({
    restingEnergy: currentHealthMetrics?.restingEnergy || 0,
    activeEnergy: currentHealthMetrics?.activeEnergy || 0,
    steps: currentHealthMetrics?.steps || 0,
    exerciseMinutes: currentHealthMetrics?.exerciseMinutes || 0,
    standHours: currentHealthMetrics?.standHours,
  });

  const handleManualSave = () => {
    onUpdateHealthMetrics(manualForm, selectedDate);
    setImported(true);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setImage(base64);
      setError(null);
      setExtractedData(null);
      setImported(false);

      if (!apiKey) {
        setError(`Please add your ${aiProvider === 'groq' ? 'Groq' : 'OpenAI'} API key in Settings first`);
        return;
      }

      setAnalyzing(true);
      try {
        let data: HealthDataExtracted;
        if (aiProvider === 'groq') {
          // Use Groq API (with automatic fallback to backup key if rate limited)
          data = await groqExtractHealthData(base64, groqApiKey, groqApiKeyBackup);
        } else {
          data = await extractHealthData(base64, apiKey);
        }
        setExtractedData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to analyze image');
      } finally {
        setAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImportAll = () => {
    if (!extractedData) return;

    const metrics: HealthMetrics = {
      restingEnergy: extractedData.restingCalories || 0,
      activeEnergy: extractedData.activeCalories || 0,
      steps: extractedData.steps || 0,
      exerciseMinutes: extractedData.exerciseMinutes || 0,
      standHours: extractedData.standHours || undefined,
    };

    onUpdateHealthMetrics(metrics, selectedDate);
    setImported(true);
  };

  const getTDEE = () => {
    if (!extractedData) return 0;
    return (extractedData.restingCalories || 0) + (extractedData.activeCalories || 0);
  };

  const hasAnyData = extractedData && (
    extractedData.restingCalories ||
    extractedData.activeCalories ||
    extractedData.steps ||
    extractedData.exerciseMinutes
  );

  return (
    <div className="health-scanner-overlay">
      <div className="health-scanner">
        <div className="scanner-header">
          <h2>Health Metrics</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="entry-mode-toggle">
          <button
            className={`mode-btn ${entryMode === 'upload' ? 'active' : ''}`}
            onClick={() => setEntryMode('upload')}
          >
            <Upload size={18} />
            Upload Screenshot
          </button>
          <button
            className={`mode-btn ${entryMode === 'manual' ? 'active' : ''}`}
            onClick={() => setEntryMode('manual')}
          >
            <Edit3 size={18} />
            Manual Entry
          </button>
        </div>

        <div className="scanner-content">
          {/* Manual Entry Mode */}
          {entryMode === 'manual' && (
            <div className="manual-entry-section">
              {imported ? (
                <div className="import-success">
                  <Check size={48} className="success-icon" />
                  <h3>Saved!</h3>
                  <p>Health metrics updated for {format(parseISO(selectedDate), 'MMM d, yyyy')}</p>
                  <button className="done-btn" onClick={onClose}>Done</button>
                </div>
              ) : (
                <>
                  <div className="manual-form">
                    <div className="form-row">
                      <div className="form-field">
                        <label>
                          <Flame size={16} />
                          Resting Energy (BMR)
                        </label>
                        <div className="input-with-unit">
                          <input
                            type="number"
                            value={manualForm.restingEnergy || ''}
                            onChange={(e) => setManualForm({
                              ...manualForm,
                              restingEnergy: parseInt(e.target.value) || 0,
                            })}
                            placeholder="e.g., 1600"
                          />
                          <span className="unit">cal</span>
                        </div>
                        <span className="field-hint">Calories burned at rest</span>
                      </div>

                      <div className="form-field">
                        <label>
                          <Activity size={16} />
                          Active Energy
                        </label>
                        <div className="input-with-unit">
                          <input
                            type="number"
                            value={manualForm.activeEnergy || ''}
                            onChange={(e) => setManualForm({
                              ...manualForm,
                              activeEnergy: parseInt(e.target.value) || 0,
                            })}
                            placeholder="e.g., 500"
                          />
                          <span className="unit">cal</span>
                        </div>
                        <span className="field-hint">Move/exercise calories</span>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-field">
                        <label>
                          <Footprints size={16} />
                          Steps
                        </label>
                        <input
                          type="number"
                          value={manualForm.steps || ''}
                          onChange={(e) => setManualForm({
                            ...manualForm,
                            steps: parseInt(e.target.value) || 0,
                          })}
                          placeholder="e.g., 8000"
                        />
                      </div>

                      <div className="form-field">
                        <label>
                          <Clock size={16} />
                          Exercise Minutes
                        </label>
                        <div className="input-with-unit">
                          <input
                            type="number"
                            value={manualForm.exerciseMinutes || ''}
                            onChange={(e) => setManualForm({
                              ...manualForm,
                              exerciseMinutes: parseInt(e.target.value) || 0,
                            })}
                            placeholder="e.g., 45"
                          />
                          <span className="unit">min</span>
                        </div>
                      </div>
                    </div>

                    {/* TDEE Preview */}
                    {(manualForm.restingEnergy > 0 || manualForm.activeEnergy > 0) && (
                      <div className="tdee-preview">
                        <Zap size={20} />
                        <div className="tdee-info">
                          <span className="tdee-label">Total Daily Energy (TDEE)</span>
                          <span className="tdee-value">
                            {(manualForm.restingEnergy + manualForm.activeEnergy).toLocaleString()} cal
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="manual-actions">
                    <button className="save-btn" onClick={handleManualSave}>
                      <Check size={20} />
                      Save Health Metrics
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Upload Mode */}
          {entryMode === 'upload' && !image ? (
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
                <span className="upload-hint">Screenshot your Apple Health summary page</span>
              </button>
              {!apiKey && (
                <p className="api-warning">
                  <AlertCircle size={16} />
                  Add {aiProvider === 'groq' ? 'Groq' : 'OpenAI'} API key in Settings first
                </p>
              )}
              <div className="health-tips">
                <h4>Data we'll extract:</h4>
                <ul>
                  <li>Resting Energy (BMR)</li>
                  <li>Active Energy (Move calories)</li>
                  <li>Steps</li>
                  <li>Exercise Minutes</li>
                </ul>
              </div>
            </div>
          ) : null}

          {entryMode === 'upload' && image && (
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
                  <h3>Extracted Health Data</h3>

                  {extractedData.date && (
                    <p className="data-date">
                      Date: {(() => {
                        try {
                          const parsedDate = new Date(extractedData.date);
                          if (isNaN(parsedDate.getTime())) {
                            return extractedData.date; // Show raw date if invalid
                          }
                          return format(parsedDate, 'MMM d, yyyy');
                        } catch {
                          return extractedData.date; // Fallback to raw date string
                        }
                      })()}
                    </p>
                  )}

                  {/* TDEE Summary Card */}
                  {getTDEE() > 0 && (
                    <div className="tdee-summary-card">
                      <div className="tdee-header">
                        <Zap size={20} />
                        <span>Total Daily Energy Expenditure</span>
                      </div>
                      <div className="tdee-value">{getTDEE().toLocaleString()} cal</div>
                      <div className="tdee-breakdown">
                        <span>Resting: {extractedData.restingCalories?.toLocaleString() || 0}</span>
                        <span>+</span>
                        <span>Active: {extractedData.activeCalories?.toLocaleString() || 0}</span>
                      </div>
                    </div>
                  )}

                  <div className="health-metrics">
                    {/* Resting Energy */}
                    {extractedData.restingCalories && extractedData.restingCalories > 0 && (
                      <div className="health-metric-card">
                        <div className="metric-icon resting">
                          <Flame size={24} />
                        </div>
                        <div className="metric-details">
                          <span className="metric-title">Resting Energy</span>
                          <span className="metric-value-large">{extractedData.restingCalories.toLocaleString()} cal</span>
                          <span className="metric-sub">BMR - calories at rest</span>
                        </div>
                      </div>
                    )}

                    {/* Active Energy */}
                    {extractedData.activeCalories && extractedData.activeCalories > 0 && (
                      <div className="health-metric-card">
                        <div className="metric-icon calories">
                          <Activity size={24} />
                        </div>
                        <div className="metric-details">
                          <span className="metric-title">Active Energy</span>
                          <span className="metric-value-large">{extractedData.activeCalories.toLocaleString()} cal</span>
                          <span className="metric-sub">Move calories burned</span>
                        </div>
                      </div>
                    )}

                    {/* Steps */}
                    {extractedData.steps && extractedData.steps > 0 && (
                      <div className="health-metric-card">
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

                    {/* Exercise Minutes */}
                    {extractedData.exerciseMinutes && extractedData.exerciseMinutes > 0 && (
                      <div className="health-metric-card">
                        <div className="metric-icon exercise">
                          <Clock size={24} />
                        </div>
                        <div className="metric-details">
                          <span className="metric-title">Exercise</span>
                          <span className="metric-value-large">{extractedData.exerciseMinutes} min</span>
                        </div>
                      </div>
                    )}

                    {/* Stand Hours */}
                    {extractedData.standHours && extractedData.standHours > 0 && (
                      <div className="health-metric-card">
                        <div className="metric-icon stand">
                          <Activity size={24} />
                        </div>
                        <div className="metric-details">
                          <span className="metric-title">Stand</span>
                          <span className="metric-value-large">{extractedData.standHours} hr</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {!hasAnyData && (
                    <p className="no-data-message">
                      No health data found. Try a different screenshot.
                    </p>
                  )}

                  {hasAnyData && (
                    <button
                      className={`import-all-btn ${imported ? 'imported' : ''}`}
                      onClick={handleImportAll}
                      disabled={imported}
                    >
                      {imported ? (
                        <>
                          <Check size={20} />
                          Imported!
                        </>
                      ) : (
                        <>
                          <Check size={20} />
                          Import All Data
                        </>
                      )}
                    </button>
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
                    setImported(false);
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
