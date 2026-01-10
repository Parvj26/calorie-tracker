import React, { useState, useEffect, useMemo } from 'react';
import { Save, RotateCcw, User, Target, Footprints, Scale } from 'lucide-react';
import type { UserSettings, Gender, ActivityLevel, DailyLog } from '../types';
import { ACTIVITY_LABELS, ACTIVITY_MULTIPLIERS } from '../utils/bmrCalculation';
import { defaultSettings } from '../data/defaultMeals';
import { useUserProfile } from '../hooks/useUserProfile';
import { useActivityRecommendation } from '../hooks/useActivityRecommendation';
import { getRecommendationReason } from '../utils/activityRecommendation';
import { calculateNutritionGoals, calculateAge, getDefaultNutritionGoals, type NutritionGoals } from '../utils/nutritionGoals';

interface SettingsProps {
  settings: UserSettings;
  onUpdateSettings: (settings: Partial<UserSettings>) => void;
  currentWeight?: number; // From weighIns or inBodyScans
  bmr?: number; // For goal calculation preview
  dailyLogs?: DailyLog[]; // For activity recommendation
}

export const Settings: React.FC<SettingsProps> = ({
  settings,
  onUpdateSettings,
  currentWeight,
  bmr,
  dailyLogs = [],
}) => {
  const { profile, updateProfile } = useUserProfile();
  const [formData, setFormData] = useState(settings);

  // Activity level recommendation based on actual behavior
  const activityRec = useActivityRecommendation(dailyLogs, profile?.activityLevel);
  const [saved, setSaved] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [goalSaved, setGoalSaved] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '' as Gender | '',
    heightFeet: '' as string,
    heightInches: '' as string,
    activityLevel: '' as ActivityLevel | '',
  });

  // Convert cm to feet and inches
  const cmToFeetInches = (cm: number): { feet: number; inches: number } => {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return { feet, inches: inches === 12 ? 0 : inches };
  };

  // Convert feet and inches to cm
  const feetInchesToCm = (feet: number, inches: number): number => {
    const totalInches = (feet * 12) + inches;
    return Math.round(totalInches * 2.54);
  };

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  useEffect(() => {
    if (profile) {
      const height = profile.heightCm ? cmToFeetInches(profile.heightCm) : { feet: 0, inches: 0 };
      setProfileForm({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        dateOfBirth: profile.dateOfBirth || '',
        gender: profile.gender || '',
        heightFeet: height.feet ? height.feet.toString() : '',
        heightInches: height.inches ? height.inches.toString() : '',
        activityLevel: profile.activityLevel || '',
      });
    }
  }, [profile]);

  // Calculate personalized nutrition goals based on user profile
  const nutritionGoals: NutritionGoals = useMemo(() => {
    const calorieTarget = (settings.dailyCalorieTargetMin + settings.dailyCalorieTargetMax) / 2;
    const weight = currentWeight || settings.startWeight || 70; // Default 70kg

    // Check if we have enough profile data for personalized goals
    if (profile?.dateOfBirth && profile?.gender && (profile.gender === 'male' || profile.gender === 'female')) {
      const age = calculateAge(profile.dateOfBirth);
      return calculateNutritionGoals({
        age,
        gender: profile.gender,
        weightKg: weight,
        calorieTarget,
        activityLevel: 'light', // Default to light activity
      });
    }

    // Fallback to default goals
    return getDefaultNutritionGoals(calorieTarget);
  }, [profile, settings, currentWeight]);

  const hasCompleteProfile = profile?.dateOfBirth && profile?.gender && (profile.gender === 'male' || profile.gender === 'female');

  // Calculate estimated maintenance calories (informational only)
  const estimatedMaintenance = useMemo(() => {
    if (!bmr || bmr <= 0 || !profile?.activityLevel) return null;
    return Math.round(bmr * ACTIVITY_MULTIPLIERS[profile.activityLevel]);
  }, [bmr, profile?.activityLevel]);

  const handleSaveProfile = async () => {
    // Convert feet/inches to cm for storage
    const feet = parseInt(profileForm.heightFeet) || 0;
    const inches = parseInt(profileForm.heightInches) || 0;
    const heightCm = (feet > 0 || inches > 0) ? feetInchesToCm(feet, inches) : undefined;

    const success = await updateProfile({
      firstName: profileForm.firstName || undefined,
      lastName: profileForm.lastName || undefined,
      dateOfBirth: profileForm.dateOfBirth || undefined,
      gender: profileForm.gender || undefined,
      heightCm,
      activityLevel: profileForm.activityLevel || undefined,
    });
    if (success) {
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    }
  };

  const handleSave = () => {
    onUpdateSettings(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveGoal = () => {
    // Use the actual displayed value (including fallback)
    const targetValue = formData.dailyCalorieTarget || Math.round((formData.dailyCalorieTargetMin + formData.dailyCalorieTargetMax) / 2);
    onUpdateSettings({
      dailyCalorieTarget: targetValue,
    });
    setGoalSaved(true);
    setTimeout(() => setGoalSaved(false), 2000);
  };

  const handleReset = () => {
    setFormData({
      ...defaultSettings,
      openAiApiKey: settings.openAiApiKey,
      groqApiKey: settings.groqApiKey,
      groqApiKeyBackup: settings.groqApiKeyBackup,
      aiProvider: settings.aiProvider,
    });
  };

  return (
    <div className="settings">
      <div className="settings-header">
        <h2>Settings</h2>
      </div>

      <div className="card settings-card profile-card">
        <h3><User size={20} /> Profile</h3>
        <div className="form-row">
          <div className="form-group">
            <label>First Name</label>
            <input
              type="text"
              value={profileForm.firstName}
              onChange={(e) =>
                setProfileForm({ ...profileForm, firstName: e.target.value })
              }
              placeholder="Enter first name"
            />
          </div>
          <div className="form-group">
            <label>Last Name</label>
            <input
              type="text"
              value={profileForm.lastName}
              onChange={(e) =>
                setProfileForm({ ...profileForm, lastName: e.target.value })
              }
              placeholder="Enter last name"
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Date of Birth</label>
            <input
              type="date"
              value={profileForm.dateOfBirth}
              onChange={(e) =>
                setProfileForm({ ...profileForm, dateOfBirth: e.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label>Gender</label>
            <select
              value={profileForm.gender}
              onChange={(e) =>
                setProfileForm({ ...profileForm, gender: e.target.value as Gender | '' })
              }
            >
              <option value="">Select...</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Height</label>
            <div className="height-inputs">
              <input
                type="number"
                value={profileForm.heightFeet}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, heightFeet: e.target.value })
                }
                placeholder="5"
                min="3"
                max="8"
                style={{ width: '70px' }}
              />
              <span>ft</span>
              <input
                type="number"
                value={profileForm.heightInches}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, heightInches: e.target.value })
                }
                placeholder="10"
                min="0"
                max="11"
                style={{ width: '70px' }}
              />
              <span>in</span>
            </div>
            <span className="form-help">Used for BMR calculation</span>
          </div>
          <div className="form-group">
            <label>Activity Level</label>
            <select
              value={profileForm.activityLevel}
              onChange={(e) =>
                setProfileForm({ ...profileForm, activityLevel: e.target.value as ActivityLevel | '' })
              }
            >
              <option value="">Select...</option>
              {Object.entries(ACTIVITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <span className="form-help">For estimated maintenance calories (informational)</span>
          </div>
        </div>

        {/* Activity Level Recommendation */}
        {activityRec.shouldRecommend && (
          <div className="activity-recommendation-card">
            <div className="rec-header">
              <Footprints size={16} />
              <span>Activity Level Suggestion</span>
            </div>
            <p className="rec-message">
              {getRecommendationReason(activityRec)}
            </p>
            <div className="rec-suggestion">
              <strong>{ACTIVITY_LABELS[activityRec.recommendedLevel]}</strong>
            </div>
            <button
              className="btn btn-primary rec-update-btn"
              onClick={() => {
                setProfileForm({ ...profileForm, activityLevel: activityRec.recommendedLevel });
              }}
            >
              Update Activity Level
            </button>
          </div>
        )}

        {/* Show estimated maintenance if activity level is set */}
        {estimatedMaintenance && bmr && (
          <div className="maintenance-info">
            <span className="maintenance-label">Estimated maintenance:</span>
            <span className="maintenance-value">{estimatedMaintenance} cal/day</span>
            <span className="maintenance-formula">(BMR {bmr} × {profile?.activityLevel ? ACTIVITY_MULTIPLIERS[profile.activityLevel] : '?'})</span>
          </div>
        )}

        <button className="save-btn profile-save-btn" onClick={handleSaveProfile}>
          <Save size={16} />
          {profileSaved ? 'Saved!' : 'Save Profile'}
        </button>
      </div>

      {/* Weight Unit Preference */}
      <div className="card settings-card preferences-card">
        <h3><Scale size={20} /> Preferences</h3>
        <div className="form-group">
          <label>Weight Unit</label>
          <div className="unit-toggle">
            <button
              className={`unit-btn ${(formData.weightUnit || 'kg') === 'kg' ? 'active' : ''}`}
              onClick={() => {
                setFormData({ ...formData, weightUnit: 'kg' });
                onUpdateSettings({ weightUnit: 'kg' });
              }}
            >
              kg
            </button>
            <button
              className={`unit-btn ${formData.weightUnit === 'lbs' ? 'active' : ''}`}
              onClick={() => {
                setFormData({ ...formData, weightUnit: 'lbs' });
                onUpdateSettings({ weightUnit: 'lbs' });
              }}
            >
              lbs
            </button>
          </div>
          <span className="form-help">All weights will display in this unit</span>
        </div>
      </div>

      <div className="card settings-card nutrition-goals-card">
        <h3><Target size={20} /> Daily Nutrition Goals</h3>
        {!hasCompleteProfile && (
          <p className="form-help" style={{ color: '#f59e0b', marginBottom: '1rem' }}>
            Complete your profile (date of birth, gender) for personalized goals.
          </p>
        )}
        <div className="nutrition-goals-grid">
          <div className="goal-item">
            <span className="goal-label">Protein</span>
            <span className="goal-value">{nutritionGoals.protein}g</span>
            <span className="goal-note">Based on body weight</span>
          </div>
          <div className="goal-item">
            <span className="goal-label">Carbs</span>
            <span className="goal-value">{nutritionGoals.carbs}g</span>
            <span className="goal-note">~50% of calories</span>
          </div>
          <div className="goal-item">
            <span className="goal-label">Fat</span>
            <span className="goal-value">{nutritionGoals.fat}g</span>
            <span className="goal-note">~30% of calories</span>
          </div>
          <div className="goal-item fiber">
            <span className="goal-label">Fiber</span>
            <span className="goal-value">{nutritionGoals.fiber}g</span>
            <span className="goal-note">14g per 1000 cal</span>
          </div>
          <div className="goal-item sugar">
            <span className="goal-label">Sugar (max)</span>
            <span className="goal-value">{nutritionGoals.sugar}g</span>
            <span className="goal-note">AHA recommendation</span>
          </div>
        </div>
        <p className="form-help" style={{ marginTop: '1rem', fontSize: '0.8rem' }}>
          Goals are calculated based on your calorie target{hasCompleteProfile ? ', age, gender, and weight' : ''}.
          These are general guidelines - adjust based on your specific needs.
        </p>
      </div>

      <div className="card settings-card goal-card">
        <h3><Target size={20} /> Calorie Target</h3>
        <div className="form-group">
          <label>Daily Calorie Target</label>
          <input
            type="number"
            value={formData.dailyCalorieTarget || Math.round((formData.dailyCalorieTargetMin + formData.dailyCalorieTargetMax) / 2)}
            onChange={(e) =>
              setFormData({
                ...formData,
                dailyCalorieTarget: parseInt(e.target.value) || 0,
              })
            }
            placeholder="e.g., 1800"
            min="1000"
            max="5000"
          />
          <span className="form-help">Your daily calorie goal</span>
        </div>

        <button className="save-btn" onClick={handleSaveGoal} style={{ marginTop: '1rem' }}>
          <Save size={16} />
          {goalSaved ? 'Saved!' : 'Save'}
        </button>
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
              <label>Groq API Key (Primary)</label>
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
                Primary key configured
              </p>
            )}
            <div className="form-group">
              <label>Groq API Key (Backup) - Optional</label>
              <p className="form-help">
                Add a second key to use automatically if the primary hits rate limits.
              </p>
              <input
                type="password"
                value={formData.groqApiKeyBackup || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    groqApiKeyBackup: e.target.value,
                  })
                }
                placeholder="gsk_..."
              />
            </div>
            {formData.groqApiKeyBackup && formData.groqApiKeyBackup.startsWith('gsk_') && (
              <p className="form-help" style={{ color: '#10b981' }}>
                Backup key configured
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
        <p className="form-help">All your data is synced to your account.</p>
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
