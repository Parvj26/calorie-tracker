import React, { useState, useRef } from 'react';
import { X, Upload, Loader, Activity, Footprints, Check, AlertCircle, Flame, Clock, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { extractHealthData, type HealthDataExtracted } from '../utils/openai';
import { groqExtractHealthData } from '../utils/groq';
import type { AIProvider, HealthMetrics } from '../types';

interface HealthScannerProps {
  aiProvider: AIProvider;
  openAiApiKey?: string;
  groqApiKey?: string;
  selectedDate: string;
  currentHealthMetrics?: HealthMetrics;
  onUpdateHealthMetrics: (metrics: HealthMetrics, date: string) => void;
  onClose: () => void;
}

export const HealthScanner: React.FC<HealthScannerProps> = ({
  aiProvider,
  openAiApiKey,
  groqApiKey,
  selectedDate,
  onUpdateHealthMetrics,
  onClose,
}) => {
  const apiKey = aiProvider === 'groq' ? groqApiKey : openAiApiKey;
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<HealthDataExtracted | null>(null);
  const [imported, setImported] = useState(false);
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
      setImported(false);

      if (!apiKey) {
        setError(`Please add your ${aiProvider === 'groq' ? 'Groq' : 'OpenAI'} API key in Settings first`);
        return;
      }

      setAnalyzing(true);
      try {
        let data: HealthDataExtracted;
        if (aiProvider === 'groq') {
          data = await groqExtractHealthData(base64, apiKey);
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
                  <h3>Extracted Health Data</h3>

                  {extractedData.date && (
                    <p className="data-date">
                      Date: {format(new Date(extractedData.date), 'MMM d, yyyy')}
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
