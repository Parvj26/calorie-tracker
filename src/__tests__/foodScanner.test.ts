import { describe, it, expect } from 'vitest';

// ============================================
// FOOD SCANNER TESTS
// ============================================

interface DetectedFood {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
}

describe('Food Scanner', () => {
  describe('AI Response Parsing', () => {
    const parseFoodAIResponse = (response: string): DetectedFood[] => {
      try {
        const parsed = JSON.parse(response);

        // Handle array response
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (item) =>
              item.name &&
              typeof item.calories === 'number' &&
              item.calories >= 0
          );
        }

        // Handle object with foods property
        if (parsed.foods && Array.isArray(parsed.foods)) {
          return parsed.foods.filter(
            (item: DetectedFood) =>
              item.name &&
              typeof item.calories === 'number' &&
              item.calories >= 0
          );
        }

        return [];
      } catch {
        return [];
      }
    };

    it('parses array response', () => {
      const response = JSON.stringify([
        { name: 'Chicken Breast', portion: '150g', calories: 248, protein: 46, carbs: 0, fat: 5, confidence: 0.9 },
        { name: 'Brown Rice', portion: '1 cup', calories: 216, protein: 5, carbs: 45, fat: 2, confidence: 0.85 },
      ]);

      const foods = parseFoodAIResponse(response);

      expect(foods).toHaveLength(2);
      expect(foods[0].name).toBe('Chicken Breast');
      expect(foods[1].calories).toBe(216);
    });

    it('parses object with foods property', () => {
      const response = JSON.stringify({
        foods: [
          { name: 'Apple', portion: '1 medium', calories: 95, protein: 0.5, carbs: 25, fat: 0.3, confidence: 0.95 },
        ],
      });

      const foods = parseFoodAIResponse(response);

      expect(foods).toHaveLength(1);
      expect(foods[0].name).toBe('Apple');
    });

    it('filters incomplete items', () => {
      const response = JSON.stringify([
        { name: 'Valid', calories: 100, protein: 10, carbs: 10, fat: 5, confidence: 0.9 },
        { portion: '1 cup' }, // Missing name
        { name: 'Missing Calories' }, // Missing calories
        { name: 'Negative', calories: -50, protein: 0, carbs: 0, fat: 0, confidence: 0 }, // Negative calories
      ]);

      const foods = parseFoodAIResponse(response);

      expect(foods).toHaveLength(1);
      expect(foods[0].name).toBe('Valid');
    });

    it('returns empty array for invalid JSON', () => {
      expect(parseFoodAIResponse('not json')).toEqual([]);
      expect(parseFoodAIResponse('')).toEqual([]);
    });

    it('returns empty array for empty response', () => {
      expect(parseFoodAIResponse('[]')).toEqual([]);
      expect(parseFoodAIResponse('{}')).toEqual([]);
    });
  });

  describe('Confidence Filtering', () => {
    const filterByConfidence = (foods: DetectedFood[], minConfidence: number = 0.5): DetectedFood[] => {
      return foods.filter((f) => f.confidence >= minConfidence);
    };

    const sampleFoods: DetectedFood[] = [
      { name: 'High Confidence', portion: '100g', calories: 100, protein: 10, carbs: 10, fat: 5, confidence: 0.95 },
      { name: 'Medium Confidence', portion: '100g', calories: 100, protein: 10, carbs: 10, fat: 5, confidence: 0.7 },
      { name: 'Low Confidence', portion: '100g', calories: 100, protein: 10, carbs: 10, fat: 5, confidence: 0.3 },
    ];

    it('filters foods by minimum confidence', () => {
      const filtered = filterByConfidence(sampleFoods, 0.7);

      expect(filtered).toHaveLength(2);
      expect(filtered.every((f) => f.confidence >= 0.7)).toBe(true);
    });

    it('uses default confidence threshold', () => {
      const filtered = filterByConfidence(sampleFoods);

      expect(filtered).toHaveLength(2);
    });
  });

  describe('Portion Parsing', () => {
    interface ParsedPortion {
      quantity: number;
      unit: string;
    }

    const parsePortion = (portion: string): ParsedPortion => {
      const match = portion.match(/^([\d.]+)\s*(.+)$/);

      if (match) {
        return {
          quantity: parseFloat(match[1]),
          unit: match[2].trim().toLowerCase(),
        };
      }

      // Default to 1 serving if can't parse
      return { quantity: 1, unit: 'serving' };
    };

    it('parses numeric portions', () => {
      expect(parsePortion('150g')).toEqual({ quantity: 150, unit: 'g' });
      expect(parsePortion('2 cups')).toEqual({ quantity: 2, unit: 'cups' });
      expect(parsePortion('1.5 oz')).toEqual({ quantity: 1.5, unit: 'oz' });
    });

    it('handles text portions', () => {
      expect(parsePortion('1 medium apple')).toEqual({ quantity: 1, unit: 'medium apple' });
      expect(parsePortion('2 slices')).toEqual({ quantity: 2, unit: 'slices' });
    });

    it('defaults to 1 serving for unparseable portions', () => {
      expect(parsePortion('some food')).toEqual({ quantity: 1, unit: 'serving' });
    });
  });

  describe('Food to Meal Conversion', () => {
    interface Meal {
      name: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      servingSize?: number;
      servingSizeUnit?: string;
    }

    const convertToMeal = (food: DetectedFood): Meal => {
      // Extract serving size from portion if possible
      const portionMatch = food.portion.match(/^([\d.]+)\s*(g|ml|oz)$/i);

      return {
        name: food.name,
        calories: Math.round(food.calories),
        protein: Math.round(food.protein * 10) / 10,
        carbs: Math.round(food.carbs * 10) / 10,
        fat: Math.round(food.fat * 10) / 10,
        servingSize: portionMatch ? parseFloat(portionMatch[1]) : undefined,
        servingSizeUnit: portionMatch ? portionMatch[2].toLowerCase() : undefined,
      };
    };

    it('converts food with gram portion', () => {
      const food: DetectedFood = {
        name: 'Chicken',
        portion: '150g',
        calories: 248,
        protein: 46.2,
        carbs: 0,
        fat: 5.4,
        confidence: 0.9,
      };

      const meal = convertToMeal(food);

      expect(meal.name).toBe('Chicken');
      expect(meal.calories).toBe(248);
      expect(meal.protein).toBe(46.2);
      expect(meal.servingSize).toBe(150);
      expect(meal.servingSizeUnit).toBe('g');
    });

    it('handles portions without size', () => {
      const food: DetectedFood = {
        name: 'Apple',
        portion: '1 medium',
        calories: 95,
        protein: 0.5,
        carbs: 25,
        fat: 0.3,
        confidence: 0.95,
      };

      const meal = convertToMeal(food);

      expect(meal.servingSize).toBeUndefined();
      expect(meal.servingSizeUnit).toBeUndefined();
    });
  });

  describe('Image Validation', () => {
    interface ValidationResult {
      valid: boolean;
      error?: string;
    }

    const validateImage = (file: { type: string; size: number }): ValidationResult => {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (!validTypes.includes(file.type)) {
        return { valid: false, error: 'Invalid image type. Use JPEG, PNG, or WebP.' };
      }

      if (file.size > maxSize) {
        return { valid: false, error: 'Image too large. Maximum size is 10MB.' };
      }

      return { valid: true };
    };

    it('accepts valid image types', () => {
      expect(validateImage({ type: 'image/jpeg', size: 1024 })).toEqual({ valid: true });
      expect(validateImage({ type: 'image/png', size: 1024 })).toEqual({ valid: true });
      expect(validateImage({ type: 'image/webp', size: 1024 })).toEqual({ valid: true });
    });

    it('rejects invalid image types', () => {
      const result = validateImage({ type: 'image/gif', size: 1024 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid image type');
    });

    it('rejects oversized images', () => {
      const result = validateImage({ type: 'image/jpeg', size: 20 * 1024 * 1024 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too large');
    });
  });

  describe('API Fallback Logic', () => {
    interface APIConfig {
      primary: string;
      backup?: string;
      fallback?: string;
    }

    const getNextAPIKey = (config: APIConfig, failedKeys: string[]): string | null => {
      if (!failedKeys.includes(config.primary)) return config.primary;
      if (config.backup && !failedKeys.includes(config.backup)) return config.backup;
      if (config.fallback && !failedKeys.includes(config.fallback)) return config.fallback;
      return null;
    };

    it('returns primary key first', () => {
      const config = { primary: 'groq1', backup: 'groq2', fallback: 'openai' };
      expect(getNextAPIKey(config, [])).toBe('groq1');
    });

    it('falls back to backup after primary fails', () => {
      const config = { primary: 'groq1', backup: 'groq2', fallback: 'openai' };
      expect(getNextAPIKey(config, ['groq1'])).toBe('groq2');
    });

    it('falls back to fallback after groq keys fail', () => {
      const config = { primary: 'groq1', backup: 'groq2', fallback: 'openai' };
      expect(getNextAPIKey(config, ['groq1', 'groq2'])).toBe('openai');
    });

    it('returns null when all keys fail', () => {
      const config = { primary: 'groq1', backup: 'groq2', fallback: 'openai' };
      expect(getNextAPIKey(config, ['groq1', 'groq2', 'openai'])).toBeNull();
    });
  });

  describe('Error Handling', () => {
    const handleAPIError = (error: Error): { message: string; retryable: boolean } => {
      const errorMessage = error.message.toLowerCase();

      if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        return { message: 'Rate limit exceeded. Please wait a moment.', retryable: true };
      }
      if (errorMessage.includes('timeout')) {
        return { message: 'Request timed out. Please try again.', retryable: true };
      }
      if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
        return { message: 'Invalid API key. Check settings.', retryable: false };
      }
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        return { message: 'Network error. Check your connection.', retryable: true };
      }

      return { message: 'Analysis failed. Please try again.', retryable: true };
    };

    it('handles rate limit errors', () => {
      const result = handleAPIError(new Error('Rate limit exceeded'));
      expect(result.retryable).toBe(true);
      expect(result.message).toContain('Rate limit');
    });

    it('handles auth errors as non-retryable', () => {
      const result = handleAPIError(new Error('401 Unauthorized'));
      expect(result.retryable).toBe(false);
    });

    it('handles network errors as retryable', () => {
      const result = handleAPIError(new Error('Network error'));
      expect(result.retryable).toBe(true);
    });
  });

  describe('Macro Editing', () => {
    it('allows editing detected food values', () => {
      const original: DetectedFood = {
        name: 'Salad',
        portion: '200g',
        calories: 100,
        protein: 5,
        carbs: 10,
        fat: 5,
        confidence: 0.8,
      };

      const edited = { ...original, calories: 120, protein: 6 };

      expect(edited.calories).toBe(120);
      expect(edited.protein).toBe(6);
      expect(edited.name).toBe('Salad');
    });
  });

  describe('Multiple Food Detection', () => {
    it('handles multiple detected foods', () => {
      const foods: DetectedFood[] = [
        { name: 'Rice', portion: '200g', calories: 260, protein: 5, carbs: 56, fat: 1, confidence: 0.9 },
        { name: 'Chicken', portion: '150g', calories: 248, protein: 46, carbs: 0, fat: 5, confidence: 0.85 },
        { name: 'Broccoli', portion: '100g', calories: 34, protein: 3, carbs: 7, fat: 0, confidence: 0.88 },
      ];

      const totalCalories = foods.reduce((sum, f) => sum + f.calories, 0);
      const totalProtein = foods.reduce((sum, f) => sum + f.protein, 0);

      expect(totalCalories).toBe(542);
      expect(totalProtein).toBe(54);
    });
  });

  describe('Log Actions', () => {
    interface LogAction {
      type: 'log' | 'save_and_log' | 'save_only';
      food: DetectedFood;
    }

    const processLogAction = (action: LogAction): { savedToLibrary: boolean; loggedToday: boolean } => {
      switch (action.type) {
        case 'log':
          return { savedToLibrary: false, loggedToday: true };
        case 'save_and_log':
          return { savedToLibrary: true, loggedToday: true };
        case 'save_only':
          return { savedToLibrary: true, loggedToday: false };
        default:
          return { savedToLibrary: false, loggedToday: false };
      }
    };

    it('processes log action correctly', () => {
      const food: DetectedFood = {
        name: 'Test',
        portion: '100g',
        calories: 100,
        protein: 10,
        carbs: 10,
        fat: 5,
        confidence: 0.9,
      };

      expect(processLogAction({ type: 'log', food })).toEqual({ savedToLibrary: false, loggedToday: true });
      expect(processLogAction({ type: 'save_and_log', food })).toEqual({ savedToLibrary: true, loggedToday: true });
      expect(processLogAction({ type: 'save_only', food })).toEqual({ savedToLibrary: true, loggedToday: false });
    });
  });

  describe('Base64 Image Encoding', () => {
    const isValidBase64 = (str: string): boolean => {
      try {
        // Check if starts with data URL prefix
        if (str.startsWith('data:image/')) {
          const base64Part = str.split(',')[1];
          return base64Part !== undefined && base64Part.length > 0;
        }
        return false;
      } catch {
        return false;
      }
    };

    it('validates base64 data URLs', () => {
      expect(isValidBase64('data:image/jpeg;base64,/9j/4AAQSkZJRg==')).toBe(true);
      expect(isValidBase64('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
    });

    it('rejects invalid base64', () => {
      expect(isValidBase64('not-base64')).toBe(false);
      expect(isValidBase64('')).toBe(false);
      expect(isValidBase64('data:image/jpeg;base64,')).toBe(false);
    });
  });

  describe('Quantity Adjustment', () => {
    const adjustMacros = (food: DetectedFood, multiplier: number): DetectedFood => {
      return {
        ...food,
        calories: Math.round(food.calories * multiplier),
        protein: Math.round(food.protein * multiplier * 10) / 10,
        carbs: Math.round(food.carbs * multiplier * 10) / 10,
        fat: Math.round(food.fat * multiplier * 10) / 10,
      };
    };

    it('doubles macros correctly', () => {
      const food: DetectedFood = {
        name: 'Rice',
        portion: '100g',
        calories: 130,
        protein: 2.7,
        carbs: 28,
        fat: 0.3,
        confidence: 0.9,
      };

      const doubled = adjustMacros(food, 2);

      expect(doubled.calories).toBe(260);
      expect(doubled.protein).toBe(5.4);
      expect(doubled.carbs).toBe(56);
    });

    it('halves macros correctly', () => {
      const food: DetectedFood = {
        name: 'Rice',
        portion: '100g',
        calories: 130,
        protein: 2.7,
        carbs: 28,
        fat: 0.3,
        confidence: 0.9,
      };

      const halved = adjustMacros(food, 0.5);

      expect(halved.calories).toBe(65);
      expect(halved.protein).toBeCloseTo(1.4, 1);
    });
  });
});
