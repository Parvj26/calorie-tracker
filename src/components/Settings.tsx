import React, { useState, useEffect } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import type { UserSettings } from '../types';
import { defaultSettings } from '../data/defaultMeals';

interface SettingsProps {
  settings: UserSettings;
  onUpdateSettings: (settings: Partial<UserSettings>) => void;
}

export const Settings: React.FC<SettingsProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [formData, setFormData] = useState(settings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleSave = () => {
    onUpdateSettings(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setFormData({
      ...defaultSettings,
      openAiApiKey: settings.openAiApiKey,
      groqApiKey: settings.groqApiKey,
      aiProvider: settings.aiProvider,
    });
  };

  return (
    <div className="settings">
      <div className="settings-header">
        <h2>Settings</h2>
      </div>

      <div className="card settings-card">
        <h3>Calorie Targets</h3>
        <div className="form-group">
          <label>Daily Calorie Range</label>
          <div className="range-inputs">
            <input
              type="number"
              value={formData.dailyCalorieTargetMin}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  dailyCalorieTargetMin: parseInt(e.target.value) || 0,
                })
              }
              placeholder="Min"
            />
            <span>to</span>
            <input
              type="number"
              value={formData.dailyCalorieTargetMax}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  dailyCalorieTargetMax: parseInt(e.target.value) || 0,
                })
              }
              placeholder="Max"
            />
            <span>calories</span>
          </div>
        </div>
      </div>

      <div className="card settings-card">
        <h3>Weight Goals</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Start Weight (kg)</label>
            <input
              type="number"
              step="0.1"
              value={formData.startWeight}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  startWeight: parseFloat(e.target.value) || 0,
                })
              }
            />
          </div>
          <div className="form-group">
            <label>Goal Weight (kg)</label>
            <input
              type="number"
              step="0.1"
              value={formData.goalWeight}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  goalWeight: parseFloat(e.target.value) || 0,
                })
              }
            />
          </div>
        </div>
        <div className="form-group">
          <label>Start Date</label>
          <input
            type="date"
            value={formData.startDate}
            onChange={(e) =>
              setFormData({
                ...formData,
                startDate: e.target.value,
              })
            }
          />
        </div>
      </div>

      <div className="card settings-card">
        <h3>AI Provider</h3>
        <p className="form-help">
          Choose your AI provider for food scanning and image analysis.
        </p>
        <div className="form-group">
          <label>Provider</label>
          <div className="provider-select">
            <button
              className={`provider-btn ${formData.aiProvider === 'groq' ? 'active' : ''}`}
              onClick={() => setFormData({ ...formData, aiProvider: 'groq' })}
            >
              <span className="provider-name">Groq</span>
              <span className="provider-tag free">Free</span>
            </button>
            <button
              className={`provider-btn ${formData.aiProvider === 'openai' ? 'active' : ''}`}
              onClick={() => setFormData({ ...formData, aiProvider: 'openai' })}
            >
              <span className="provider-name">OpenAI</span>
              <span className="provider-tag paid">Paid</span>
            </button>
          </div>
        </div>

        {formData.aiProvider === 'groq' && (
          <>
            <div className="form-group">
              <label>Groq API Key</label>
              <p className="form-help">
                Get your free API key from:{' '}
                <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer">
                  console.groq.com/keys
                </a>
              </p>
              <input
                type="password"
                value={formData.groqApiKey || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    groqApiKey: e.target.value,
                  })
                }
                placeholder="gsk_..."
              />
            </div>
            {formData.groqApiKey && formData.groqApiKey.startsWith('gsk_') && (
              <p className="form-help" style={{ color: '#10b981' }}>
                Groq API key configured
              </p>
            )}
          </>
        )}

        {formData.aiProvider === 'openai' && (
          <>
            <div className="form-group">
              <label>OpenAI API Key</label>
              <p className="form-help">
                Get your API key from:{' '}
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">
                  platform.openai.com/api-keys
                </a>
              </p>
              <input
                type="password"
                value={formData.openAiApiKey || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    openAiApiKey: e.target.value,
                  })
                }
                placeholder="sk-..."
              />
            </div>
            {formData.openAiApiKey && formData.openAiApiKey.startsWith('sk-') && (
              <p className="form-help" style={{ color: '#10b981' }}>
                OpenAI API key configured
              </p>
            )}
          </>
        )}
      </div>

      <div className="settings-actions">
        <button className="reset-btn" onClick={handleReset}>
          <RotateCcw size={16} />
          Reset to Defaults
        </button>
        <button className="save-btn" onClick={handleSave}>
          <Save size={16} />
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>

      <div className="card data-card">
        <h3>Data Management</h3>
        <p className="form-help">All your data is stored locally in your browser.</p>
        <button
          className="export-btn"
          onClick={() => {
            const data = {
              meals: localStorage.getItem('calorie-tracker-meals'),
              dailyLogs: localStorage.getItem('calorie-tracker-daily-logs'),
              inbody: localStorage.getItem('calorie-tracker-inbody'),
              weighins: localStorage.getItem('calorie-tracker-weighins'),
              settings: localStorage.getItem('calorie-tracker-settings'),
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], {
              type: 'application/json',
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `calorie-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
          }}
        >
          Export All Data
        </button>
        <button
          className="danger-btn"
          onClick={() => {
            if (
              window.confirm(
                'Are you sure you want to delete ALL your data? This cannot be undone.'
              )
            ) {
              localStorage.removeItem('calorie-tracker-meals');
              localStorage.removeItem('calorie-tracker-daily-logs');
              localStorage.removeItem('calorie-tracker-inbody');
              localStorage.removeItem('calorie-tracker-weighins');
              localStorage.removeItem('calorie-tracker-settings');
              window.location.reload();
            }
          }}
        >
          Clear All Data
        </button>
      </div>
    </div>
  );
};
