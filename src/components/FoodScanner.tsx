import React, { useState, useRef } from 'react';
import { Camera, Upload, Loader2, Check, X, Plus, Save, RotateCcw, AlertCircle } from 'lucide-react';
import type { Meal, AIProvider } from '../types';
import { groqAnalyzeFood } from '../utils/groq';

interface DetectedFood {
  foodName: string;
  portionSize: string;
  portionUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  addedSugar: number;
  confidence: 'high' | 'medium' | 'low';
  portionMultiplier: number;
}

interface FoodScannerProps {
  aiProvider: AIProvider;
  openAiApiKey?: string;
  groqApiKey?: string;
  groqApiKeyBackup?: string;
  onLogMeal: (meal: Omit<Meal, 'id' | 'isCustom'>) => void;
  onSaveAndLogMeal: (meal: Omit<Meal, 'id' | 'isCustom'>) => void;
  onClose: () => void;
}

export const FoodScanner: React.FC<FoodScannerProps> = ({
  aiProvider,
  openAiApiKey,
  groqApiKey,
  groqApiKeyBackup,
  onLogMeal,
  onSaveAndLogMeal,
  onClose,
}) => {
  const apiKey = aiProvider === 'groq' ? groqApiKey : openAiApiKey;
  const [imageData, setImageData] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedFoods, setDetectedFoods] = useState<DetectedFood[]>([]);
  const [shouldGenerateRecipe, setShouldGenerateRecipe] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const resizeImage = (file: File, maxSize: number = 4 * 1024 * 1024): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          const maxDimension = 2048;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height / width) * maxDimension;
              width = maxDimension;
            } else {
              width = (width / height) * maxDimension;
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          let quality = 0.9;
          let base64 = canvas.toDataURL('image/jpeg', quality);

          while (base64.length > maxSize && quality > 0.1) {
            quality -= 0.1;
            base64 = canvas.toDataURL('image/jpeg', quality);
          }

          resolve(base64);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    try {
      const resizedImage = await resizeImage(file);
      setImageData(resizedImage);
      await analyzeFood(resizedImage);
    } catch (err) {
      setError('Failed to process image');
    }

    // Reset input
    if (e.target) e.target.value = '';
  };

  const analyzeFood = async (base64Image: string) => {
    if (!apiKey) {
      setError(`Please set your ${aiProvider === 'groq' ? 'Groq' : 'OpenAI'} API key in Settings`);
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      if (aiProvider === 'groq') {
        // Use Groq API (with automatic fallback to backup key if rate limited)
        const foods = await groqAnalyzeFood(base64Image, groqApiKey, groqApiKeyBackup);
        setDetectedFoods(
          foods.map((food) => ({
            foodName: food.name,
            portionSize: food.portionSize,
            portionUnit: '',
            calories: food.calories,
            protein: food.protein,
            carbs: food.carbs,
            fat: food.fat,
            fiber: food.fiber || 0,
            sugar: food.sugar || 0,
            addedSugar: food.addedSugar || 0,
            confidence: food.confidence,
            portionMultiplier: 1,
          }))
        );
      } else {
        // Use OpenAI API
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content:
                  'You are a nutrition analysis assistant. Analyze food images and return accurate nutritional estimates.',
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Analyze this food image. Identify all foods visible, estimate portion sizes, and provide nutritional estimates. Return ONLY valid JSON (no markdown, no code blocks) with this structure: {"foods": [{"foodName": string, "portionSize": string, "portionUnit": string, "calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number, "sugar": number, "addedSugar": number, "confidence": "high"|"medium"|"low"}]}. If multiple foods, include all in the array. fiber = dietary fiber in grams, sugar = TOTAL sugars in grams (natural + added), addedSugar = only added/processed sugars (0 for fresh fruits, dairy, vegetables).',
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: base64Image,
                    },
                  },
                ],
              },
            ],
            max_tokens: 500,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'API request failed');
        }

        const data = await response.json();
        let content = data.choices[0]?.message?.content;

        if (!content) {
          throw new Error('No response from API');
        }

        // Remove markdown code blocks if present
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        const parsed = JSON.parse(content);

        if (!parsed.foods || !Array.isArray(parsed.foods)) {
          throw new Error('Invalid response format');
        }

        setDetectedFoods(
          parsed.foods.map((food: any) => ({
            ...food,
            fiber: food.fiber || 0,
            sugar: food.sugar || 0,
            addedSugar: food.addedSugar || 0,
            portionMultiplier: 1,
          }))
        );
      }
    } catch (err: any) {
      console.error('Food analysis error:', err);
      setError(err.message || 'Failed to analyze food. Please try again or enter manually.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updatePortionMultiplier = (index: number, multiplier: number) => {
    setDetectedFoods((prev) =>
      prev.map((food, i) =>
        i === index ? { ...food, portionMultiplier: multiplier } : food
      )
    );
  };

  const getAdjustedValues = (food: DetectedFood) => ({
    calories: Math.round(food.calories * food.portionMultiplier),
    protein: Math.round(food.protein * food.portionMultiplier),
    carbs: Math.round(food.carbs * food.portionMultiplier),
    fat: Math.round(food.fat * food.portionMultiplier),
    fiber: Math.round(food.fiber * food.portionMultiplier),
    sugar: Math.round(food.sugar * food.portionMultiplier),
    addedSugar: Math.round(food.addedSugar * food.portionMultiplier),
  });

  const buildGeneratedRecipe = (food: DetectedFood) => ({
    ingredients: [
      {
        item: food.foodName,
        amount: food.portionSize.toString(),
        unit: food.portionUnit || 'serving',
      },
    ],
    instructions: [
      `Prepare ${food.foodName} as shown in the photo`,
      'Serve and enjoy',
    ],
    servings: 1,
  });

  const handleLogFood = (food: DetectedFood) => {
    const adjusted = getAdjustedValues(food);
    onLogMeal({
      name: food.foodName,
      calories: adjusted.calories,
      protein: adjusted.protein,
      carbs: adjusted.carbs,
      fat: adjusted.fat,
      fiber: adjusted.fiber,
      sugar: adjusted.sugar,
      addedSugar: adjusted.addedSugar,
      recipe: shouldGenerateRecipe ? buildGeneratedRecipe(food) : undefined,
    });
    setDetectedFoods((prev) => prev.filter((f) => f !== food));
  };

  const handleSaveAndLogFood = (food: DetectedFood) => {
    const adjusted = getAdjustedValues(food);
    onSaveAndLogMeal({
      name: food.foodName,
      calories: adjusted.calories,
      protein: adjusted.protein,
      carbs: adjusted.carbs,
      fat: adjusted.fat,
      fiber: adjusted.fiber,
      sugar: adjusted.sugar,
      addedSugar: adjusted.addedSugar,
      recipe: shouldGenerateRecipe ? buildGeneratedRecipe(food) : undefined,
    });
    setDetectedFoods((prev) => prev.filter((f) => f !== food));
  };

  const handleLogAll = () => {
    detectedFoods.forEach((food) => {
      const adjusted = getAdjustedValues(food);
      onLogMeal({
        name: food.foodName,
        calories: adjusted.calories,
        protein: adjusted.protein,
        carbs: adjusted.carbs,
        fat: adjusted.fat,
        fiber: adjusted.fiber,
        sugar: adjusted.sugar,
        addedSugar: adjusted.addedSugar,
        recipe: shouldGenerateRecipe ? buildGeneratedRecipe(food) : undefined,
      });
    });
    setDetectedFoods([]);
    setShouldGenerateRecipe(false);
    onClose();
  };

  const handleRetake = () => {
    setImageData(null);
    setDetectedFoods([]);
    setError(null);
    setShouldGenerateRecipe(false);
  };

  const getConfidenceBadge = (confidence: string) => {
    const colors = {
      high: { bg: 'rgba(16, 185, 129, 0.1)', color: '#047857' },
      medium: { bg: 'rgba(245, 158, 11, 0.1)', color: '#b45309' },
      low: { bg: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' },
    };
    const style = colors[confidence as keyof typeof colors] || colors.medium;
    return (
      <span
        className="confidence-badge"
        style={{ background: style.bg, color: style.color }}
      >
        {confidence}
      </span>
    );
  };

  return (
    <div className="food-scanner-overlay">
      <div className="food-scanner">
        <div className="scanner-header">
          <h2>Scan Your Food</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {!imageData ? (
          <div className="capture-section">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              style={{ display: 'none' }}
            />
            <input
              type="file"
              ref={cameraInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
            />

            <button
              className="capture-btn primary"
              onClick={() => cameraInputRef.current?.click()}
              disabled={!apiKey}
            >
              <Camera size={32} />
              <span>Take Photo</span>
            </button>

            <button
              className="capture-btn secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={!apiKey}
            >
              <Upload size={24} />
              <span>Upload Image</span>
            </button>

            {!apiKey && (
              <p className="api-warning">
                <AlertCircle size={16} />
                Please add your {aiProvider === 'groq' ? 'Groq' : 'OpenAI'} API key in Settings
              </p>
            )}
          </div>
        ) : (
          <div className="analysis-section">
            <div className="image-preview">
              <img src={imageData} alt="Food to analyze" />
              {isAnalyzing && (
                <div className="analyzing-overlay">
                  <Loader2 size={40} className="spin" />
                  <span>Analyzing food...</span>
                </div>
              )}
            </div>

            {error && (
              <div className="error-message">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {detectedFoods.length > 0 && (
              <div className="detected-foods">
                <h3>Detected Foods</h3>
                <div className="generate-recipe-option">
                  <label>
                    <input
                      type="checkbox"
                      checked={shouldGenerateRecipe}
                      onChange={(e) => setShouldGenerateRecipe(e.target.checked)}
                    />
                    Generate basic recipe for this meal
                  </label>
                </div>
                {detectedFoods.map((food, index) => {
                  const adjusted = getAdjustedValues(food);
                  return (
                    <div key={`${food.foodName}-${index}`} className="food-card">
                      <div className="food-header">
                        <input
                          type="text"
                          value={food.foodName}
                          onChange={(e) =>
                            setDetectedFoods((prev) =>
                              prev.map((f, i) =>
                                i === index ? { ...f, foodName: e.target.value } : f
                              )
                            )
                          }
                          className="food-name-input"
                        />
                        {getConfidenceBadge(food.confidence)}
                      </div>

                      <div className="portion-info">
                        <span className="portion-text">
                          {food.portionSize} {food.portionUnit}
                        </span>
                      </div>

                      <div className="portion-slider">
                        <span className="slider-label">Portion Size</span>
                        <div className="slider-container">
                          <input
                            type="range"
                            min="0.5"
                            max="2"
                            step="0.1"
                            value={food.portionMultiplier}
                            onChange={(e) =>
                              updatePortionMultiplier(index, parseFloat(e.target.value))
                            }
                          />
                          <span className="multiplier-value">
                            {food.portionMultiplier.toFixed(1)}x
                          </span>
                        </div>
                        <div className="preset-buttons">
                          <button onClick={() => updatePortionMultiplier(index, 0.5)}>Half</button>
                          <button onClick={() => updatePortionMultiplier(index, 1)}>Normal</button>
                          <button onClick={() => updatePortionMultiplier(index, 2)}>Double</button>
                        </div>
                      </div>

                      <div className="nutrition-grid">
                        <div className="nutrition-item">
                          <span className="nutrition-value">{adjusted.calories}</span>
                          <span className="nutrition-label">cal</span>
                        </div>
                        <div className="nutrition-item protein">
                          <span className="nutrition-value">{adjusted.protein}g</span>
                          <span className="nutrition-label">protein</span>
                        </div>
                        <div className="nutrition-item carbs">
                          <span className="nutrition-value">{adjusted.carbs}g</span>
                          <span className="nutrition-label">carbs</span>
                        </div>
                        <div className="nutrition-item fat">
                          <span className="nutrition-value">{adjusted.fat}g</span>
                          <span className="nutrition-label">fat</span>
                        </div>
                      </div>

                      <div className="food-actions">
                        <button
                          className="log-btn"
                          onClick={() => handleLogFood(food)}
                        >
                          <Plus size={16} />
                          Log Once
                        </button>
                        <button
                          className="save-log-btn"
                          onClick={() => handleSaveAndLogFood(food)}
                        >
                          <Save size={16} />
                          Save & Log
                        </button>
                      </div>
                    </div>
                  );
                })}

                {detectedFoods.length > 1 && (
                  <button className="log-all-btn" onClick={handleLogAll}>
                    <Check size={20} />
                    Log All ({detectedFoods.length} items)
                  </button>
                )}
              </div>
            )}

            <div className="scanner-actions">
              <button className="retake-btn" onClick={handleRetake}>
                <RotateCcw size={16} />
                Retake Photo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
