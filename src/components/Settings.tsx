import React, { useState, useEffect, useMemo } from 'react';
import { Save, RotateCcw, User, Target, BookOpen, Check } from 'lucide-react';
import type { UserSettings, Gender, Meal } from '../types';
import { defaultSettings } from '../data/defaultMeals';
import { mealRecipes, getMealRecipeNames } from '../data/mealRecipes';
import { useUserProfile } from '../hooks/useUserProfile';
import { calculateNutritionGoals, calculateAge, getDefaultNutritionGoals, type NutritionGoals } from '../utils/nutritionGoals';

interface SettingsProps {
  settings: UserSettings;
  onUpdateSettings: (settings: Partial<UserSettings>) => void;
  currentWeight?: number; // From weighIns or inBodyScans
  meals?: Meal[];
  onUpdateMeal?: (id: string, updates: Partial<Meal>) => void;
}

export const Settings: React.FC<SettingsProps> = ({
  settings,
  onUpdateSettings,
  currentWeight,
  meals,
  onUpdateMeal,
}) => {
  const { profile, updateProfile } = useUserProfile();
  const [formData, setFormData] = useState(settings);
  const [saved, setSaved] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [recipeImportStatus, setRecipeImportStatus] = useState<{ updated: number; total: number } | null>(null);
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '' as Gender | '',
  });

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  useEffect(() => {
    if (profile) {
      setProfileForm({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        dateOfBirth: profile.dateOfBirth || '',
        gender: profile.gender || '',
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

  const handleSaveProfile = async () => {
    const success = await updateProfile({
      firstName: profileForm.firstName || undefined,
      lastName: profileForm.lastName || undefined,
      dateOfBirth: profileForm.dateOfBirth || undefined,
      gender: profileForm.gender || undefined,
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

  const handleReset = () => {
    setFormData({
      ...defaultSettings,
      openAiApiKey: settings.openAiApiKey,
      groqApiKey: settings.groqApiKey,
      aiProvider: settings.aiProvider,
    });
  };

  // Import recipes for matching meals
  const handleImportRecipes = () => {
    if (!meals || !onUpdateMeal) return;

    const recipeNames = getMealRecipeNames();
    let updatedCount = 0;

    meals.forEach((meal) => {
      // Find matching recipe by name (case-insensitive)
      const matchingRecipe = mealRecipes.find((recipe) => {
        const mealNameLower = meal.name.toLowerCase().trim();
        const recipeNameLower = recipe.name.toLowerCase().trim();
        return (
          mealNameLower === recipeNameLower ||
          mealNameLower.includes(recipeNameLower) ||
          recipeNameLower.includes(mealNameLower)
        );
      });

      if (matchingRecipe) {
        // Update meal with recipe data (nutrition + recipe details)
        onUpdateMeal(meal.id, {
          calories: matchingRecipe.calories,
          protein: matchingRecipe.protein,
          carbs: matchingRecipe.carbs,
          fat: matchingRecipe.fat,
          fiber: matchingRecipe.fiber,
          sugar: matchingRecipe.sugar,
          recipe: matchingRecipe.recipe,
          servingSize: matchingRecipe.servingSize,
        });
        updatedCount++;
      }
    });

    setRecipeImportStatus({ updated: updatedCount, total: recipeNames.length });
    setTimeout(() => setRecipeImportStatus(null), 5000);
  };

  // Count how many meals can be updated
  const matchingMealsCount = useMemo(() => {
    if (!meals) return 0;
    return meals.filter((meal) =>
      mealRecipes.some((recipe) => {
        const mealNameLower = meal.name.toLowerCase().trim();
        const recipeNameLower = recipe.name.toLowerCase().trim();
        return (
          mealNameLower === recipeNameLower ||
          mealNameLower.includes(recipeNameLower) ||
          recipeNameLower.includes(mealNameLower)
        );
      })
    ).length;
  }, [meals]);

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
        <button className="save-btn profile-save-btn" onClick={handleSaveProfile}>
          <Save size={16} />
          {profileSaved ? 'Saved!' : 'Save Profile'}
        </button>
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
        <p className="form-help">All your data is synced to your account.</p>

        {/* Recipe Import Section */}
        {meals && onUpdateMeal && (
          <div className="recipe-import-section">
            <h4><BookOpen size={16} /> Import Detailed Recipes</h4>
            <p className="form-help">
              Update your meals with detailed recipes, ingredient portions, and accurate nutrition data.
              Available recipes: {getMealRecipeNames().join(', ')}
            </p>
            {matchingMealsCount > 0 ? (
              <p className="form-help" style={{ color: '#10b981' }}>
                {matchingMealsCount} meal(s) in your library match available recipes.
              </p>
            ) : (
              <p className="form-help" style={{ color: '#f59e0b' }}>
                No matching meals found. Add meals with these names to import recipes.
              </p>
            )}
            <button
              className="import-recipe-btn"
              onClick={handleImportRecipes}
              disabled={matchingMealsCount === 0}
            >
              <BookOpen size={16} />
              Import Recipes
            </button>
            {recipeImportStatus && (
              <p className="form-help" style={{ color: '#10b981', marginTop: '0.5rem' }}>
                <Check size={14} style={{ verticalAlign: 'middle' }} />
                {' '}Updated {recipeImportStatus.updated} meal(s) with detailed recipes!
              </p>
            )}
          </div>
        )}

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
