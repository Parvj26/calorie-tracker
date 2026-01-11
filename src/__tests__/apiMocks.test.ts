import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================
// API RESPONSE MOCK TESTS
// ============================================

/**
 * These tests verify the handling of API responses
 * without making actual API calls.
 */

describe('Food Scanner API Responses', () => {
  describe('Response Parsing', () => {
    interface DetectedFood {
      name: string;
      portion: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      confidence: number;
    }

    const parseAIResponse = (response: string): DetectedFood[] => {
      try {
        // Try to parse as JSON first
        const parsed = JSON.parse(response);
        if (Array.isArray(parsed)) {
          return parsed.filter((item) =>
            item.name && typeof item.calories === 'number'
          );
        }
        if (parsed.foods && Array.isArray(parsed.foods)) {
          return parsed.foods;
        }
        return [];
      } catch {
        return [];
      }
    };

    it('parses valid JSON array response', () => {
      const response = JSON.stringify([
        { name: 'Chicken Breast', portion: '150g', calories: 248, protein: 46, carbs: 0, fat: 5, confidence: 0.9 },
        { name: 'Brown Rice', portion: '1 cup', calories: 216, protein: 5, carbs: 45, fat: 2, confidence: 0.85 },
      ]);

      const foods = parseAIResponse(response);
      expect(foods).toHaveLength(2);
      expect(foods[0].name).toBe('Chicken Breast');
      expect(foods[1].calories).toBe(216);
    });

    it('parses response with foods property', () => {
      const response = JSON.stringify({
        foods: [
          { name: 'Apple', portion: '1 medium', calories: 95, protein: 0.5, carbs: 25, fat: 0.3, confidence: 0.95 },
        ],
      });

      const foods = parseAIResponse(response);
      expect(foods).toHaveLength(1);
      expect(foods[0].name).toBe('Apple');
    });

    it('returns empty array for invalid JSON', () => {
      const response = 'This is not JSON';
      const foods = parseAIResponse(response);
      expect(foods).toHaveLength(0);
    });

    it('filters out incomplete food items', () => {
      const response = JSON.stringify([
        { name: 'Valid Food', calories: 100, protein: 10, carbs: 10, fat: 5, confidence: 0.9 },
        { portion: '1 cup' }, // Missing name
        { name: 'Missing Calories' }, // Missing calories
      ]);

      const foods = parseAIResponse(response);
      expect(foods).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    const handleAPIError = (error: Error): { message: string; retryable: boolean } => {
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        return { message: 'Rate limit exceeded. Please try again in a moment.', retryable: true };
      }
      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        return { message: 'Request timed out. Please try again.', retryable: true };
      }
      if (error.message.includes('401') || error.message.includes('unauthorized')) {
        return { message: 'Invalid API key. Please check your settings.', retryable: false };
      }
      return { message: 'An error occurred. Please try again.', retryable: true };
    };

    it('handles rate limit errors', () => {
      const error = new Error('rate limit exceeded');
      const result = handleAPIError(error);
      expect(result.message).toContain('Rate limit');
      expect(result.retryable).toBe(true);
    });

    it('handles timeout errors', () => {
      const error = new Error('Request timeout');
      const result = handleAPIError(error);
      expect(result.message).toContain('timed out');
      expect(result.retryable).toBe(true);
    });

    it('handles auth errors', () => {
      const error = new Error('401 unauthorized');
      const result = handleAPIError(error);
      expect(result.message).toContain('API key');
      expect(result.retryable).toBe(false);
    });
  });

  describe('API Fallback Logic', () => {
    interface APIConfig {
      primary: string;
      backup?: string;
      fallback?: string;
    }

    const getNextAPIKey = (
      config: APIConfig,
      failedKeys: string[]
    ): string | null => {
      if (!failedKeys.includes(config.primary)) {
        return config.primary;
      }
      if (config.backup && !failedKeys.includes(config.backup)) {
        return config.backup;
      }
      if (config.fallback && !failedKeys.includes(config.fallback)) {
        return config.fallback;
      }
      return null;
    };

    it('returns primary key first', () => {
      const config = { primary: 'key1', backup: 'key2' };
      const key = getNextAPIKey(config, []);
      expect(key).toBe('key1');
    });

    it('falls back to backup after primary fails', () => {
      const config = { primary: 'key1', backup: 'key2' };
      const key = getNextAPIKey(config, ['key1']);
      expect(key).toBe('key2');
    });

    it('falls back to fallback after all groq keys fail', () => {
      const config = { primary: 'groq1', backup: 'groq2', fallback: 'openai' };
      const key = getNextAPIKey(config, ['groq1', 'groq2']);
      expect(key).toBe('openai');
    });

    it('returns null when all keys exhausted', () => {
      const config = { primary: 'key1', backup: 'key2' };
      const key = getNextAPIKey(config, ['key1', 'key2']);
      expect(key).toBeNull();
    });
  });
});

describe('InBody Extraction API Responses', () => {
  interface InBodyData {
    weight?: number;
    bodyFatPercent?: number;
    muscleMass?: number;
    skeletalMuscle?: number;
    bmr?: number;
    fatMass?: number;
    visceralFatGrade?: number;
    waterWeight?: number;
    bodyAge?: number;
  }

  const parseInBodyResponse = (response: string): InBodyData | null => {
    try {
      const parsed = JSON.parse(response);
      if (parsed.weight || parsed.bodyFatPercent) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  };

  it('parses complete InBody response', () => {
    const response = JSON.stringify({
      weight: 80.5,
      bodyFatPercent: 20.3,
      muscleMass: 40.2,
      skeletalMuscle: 30.5,
      bmr: 1720,
      fatMass: 16.3,
      visceralFatGrade: 8,
      waterWeight: 45.2,
      bodyAge: 28,
    });

    const data = parseInBodyResponse(response);
    expect(data).not.toBeNull();
    expect(data?.weight).toBe(80.5);
    expect(data?.bmr).toBe(1720);
  });

  it('parses partial InBody response', () => {
    const response = JSON.stringify({
      weight: 79.8,
      bodyFatPercent: 19.5,
    });

    const data = parseInBodyResponse(response);
    expect(data).not.toBeNull();
    expect(data?.muscleMass).toBeUndefined();
  });

  it('returns null for empty response', () => {
    const data = parseInBodyResponse('{}');
    expect(data).toBeNull();
  });
});

describe('Health Data Extraction API Responses', () => {
  interface HealthData {
    restingEnergy?: number;
    activeEnergy?: number;
    steps?: number;
    exerciseMinutes?: number;
    weight?: number;
    walkingDistance?: number;
  }

  const parseHealthResponse = (response: string): HealthData | null => {
    try {
      const parsed = JSON.parse(response);
      if (parsed.steps || parsed.activeEnergy || parsed.restingEnergy) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  };

  it('parses complete health data response', () => {
    const response = JSON.stringify({
      restingEnergy: 1620,
      activeEnergy: 450,
      steps: 8542,
      exerciseMinutes: 45,
      walkingDistance: 5.2,
    });

    const data = parseHealthResponse(response);
    expect(data).not.toBeNull();
    expect(data?.steps).toBe(8542);
    expect(data?.activeEnergy).toBe(450);
  });

  it('handles missing optional fields', () => {
    const response = JSON.stringify({
      steps: 6000,
      activeEnergy: 300,
    });

    const data = parseHealthResponse(response);
    expect(data).not.toBeNull();
    expect(data?.restingEnergy).toBeUndefined();
  });
});

describe('API Request Configuration', () => {
  const DEFAULT_TIMEOUT = 30000;

  interface RequestConfig {
    model: string;
    temperature: number;
    maxTokens: number;
    timeout: number;
  }

  const getGroqConfig = (): RequestConfig => ({
    model: 'llama-3.3-70b-versatile',
    temperature: 0.1,
    maxTokens: 2000,
    timeout: DEFAULT_TIMEOUT,
  });

  const getOpenAIConfig = (): RequestConfig => ({
    model: 'gpt-4o',
    temperature: 0.1,
    maxTokens: 2000,
    timeout: DEFAULT_TIMEOUT,
  });

  it('has correct Groq configuration', () => {
    const config = getGroqConfig();
    expect(config.model).toBe('llama-3.3-70b-versatile');
    expect(config.temperature).toBe(0.1);
    expect(config.timeout).toBe(30000);
  });

  it('has correct OpenAI configuration', () => {
    const config = getOpenAIConfig();
    expect(config.model).toBe('gpt-4o');
    expect(config.temperature).toBe(0.1);
  });
});

describe('Rate Limit Handling', () => {
  interface RateLimitState {
    retryAfter: number;
    failedAt: number;
    attempts: number;
  }

  const shouldRetry = (state: RateLimitState | null, maxAttempts: number = 3): boolean => {
    if (!state) return true;
    if (state.attempts >= maxAttempts) return false;
    if (Date.now() < state.failedAt + state.retryAfter) return false;
    return true;
  };

  it('allows retry when no previous failures', () => {
    expect(shouldRetry(null)).toBe(true);
  });

  it('prevents retry when max attempts reached', () => {
    const state: RateLimitState = {
      retryAfter: 1000,
      failedAt: Date.now() - 2000,
      attempts: 3,
    };
    expect(shouldRetry(state)).toBe(false);
  });

  it('prevents retry when cooldown not expired', () => {
    const state: RateLimitState = {
      retryAfter: 5000,
      failedAt: Date.now(),
      attempts: 1,
    };
    expect(shouldRetry(state)).toBe(false);
  });

  it('allows retry after cooldown expires', () => {
    const state: RateLimitState = {
      retryAfter: 1000,
      failedAt: Date.now() - 2000, // 2 seconds ago, cooldown was 1 second
      attempts: 1,
    };
    expect(shouldRetry(state)).toBe(true);
  });
});
