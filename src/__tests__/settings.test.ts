import { describe, it, expect, beforeEach } from 'vitest';

// ============================================
// SETTINGS TESTS
// ============================================

interface UserProfile {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  heightCm: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
}

interface NutritionSettings {
  startWeight: number;
  goalWeight: number;
  startDate: string;
  targetDate?: string;
  weightUnit: 'kg' | 'lbs';
  dailyCalorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
}

interface AISettings {
  provider: 'groq' | 'openai';
  groqApiKey?: string;
  groqBackupKey?: string;
  openaiApiKey?: string;
}

describe('Settings', () => {
  describe('Profile Settings', () => {
    let profile: UserProfile;

    beforeEach(() => {
      profile = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-15',
        gender: 'male',
        heightCm: 180,
        activityLevel: 'moderate',
      };
    });

    it('updates first name', () => {
      profile.firstName = 'Jane';
      expect(profile.firstName).toBe('Jane');
    });

    it('updates last name', () => {
      profile.lastName = 'Smith';
      expect(profile.lastName).toBe('Smith');
    });

    it('updates date of birth', () => {
      profile.dateOfBirth = '1985-06-20';
      expect(profile.dateOfBirth).toBe('1985-06-20');
    });

    it('updates gender', () => {
      profile.gender = 'female';
      expect(profile.gender).toBe('female');
    });

    it('updates activity level', () => {
      profile.activityLevel = 'active';
      expect(profile.activityLevel).toBe('active');
    });

    describe('Height Conversion', () => {
      const feetInchesToCm = (feet: number, inches: number): number => {
        return Math.round((feet * 30.48) + (inches * 2.54));
      };

      const cmToFeetInches = (cm: number): { feet: number; inches: number } => {
        const totalInches = cm / 2.54;
        const feet = Math.floor(totalInches / 12);
        const inches = Math.round(totalInches % 12);
        return { feet, inches };
      };

      it('converts feet/inches to cm', () => {
        expect(feetInchesToCm(5, 10)).toBe(178);
        expect(feetInchesToCm(6, 0)).toBe(183);
        expect(feetInchesToCm(5, 5)).toBe(165);
      });

      it('converts cm to feet/inches', () => {
        expect(cmToFeetInches(180)).toEqual({ feet: 5, inches: 11 });
        expect(cmToFeetInches(165)).toEqual({ feet: 5, inches: 5 });
      });
    });

    describe('Age Calculation', () => {
      const calculateAge = (dateOfBirth: string): number => {
        const dob = new Date(dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
        return age;
      };

      it('calculates age correctly', () => {
        const age = calculateAge('1990-01-15');
        expect(age).toBeGreaterThanOrEqual(34);
        expect(age).toBeLessThanOrEqual(36);
      });
    });

    describe('Profile Validation', () => {
      const validateProfile = (p: Partial<UserProfile>): { valid: boolean; errors: string[] } => {
        const errors: string[] = [];

        if (!p.firstName || p.firstName.trim().length < 1) {
          errors.push('First name is required');
        }

        if (!p.lastName || p.lastName.trim().length < 1) {
          errors.push('Last name is required');
        }

        if (!p.dateOfBirth) {
          errors.push('Date of birth is required');
        }

        if (p.heightCm !== undefined && (p.heightCm < 50 || p.heightCm > 300)) {
          errors.push('Height must be between 50 and 300 cm');
        }

        return { valid: errors.length === 0, errors };
      };

      it('validates complete profile', () => {
        const result = validateProfile(profile);
        expect(result.valid).toBe(true);
      });

      it('rejects missing first name', () => {
        const result = validateProfile({ ...profile, firstName: '' });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('First name is required');
      });

      it('rejects invalid height', () => {
        const result = validateProfile({ ...profile, heightCm: 400 });
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('Nutrition Goals', () => {
    let settings: NutritionSettings;

    beforeEach(() => {
      settings = {
        startWeight: 85,
        goalWeight: 75,
        startDate: '2024-01-01',
        weightUnit: 'kg',
        dailyCalorieTarget: 2000,
        proteinTarget: 150,
        carbsTarget: 200,
        fatTarget: 70,
      };
    });

    it('calculates weight to lose', () => {
      const toLose = settings.startWeight - settings.goalWeight;
      expect(toLose).toBe(10);
    });

    it('calculates daily deficit for goal', () => {
      const weightToLose = settings.startWeight - settings.goalWeight;
      const weeksToGoal = 20; // Assume 20 weeks
      const weeklyLoss = weightToLose / weeksToGoal;
      const dailyDeficit = Math.round((weeklyLoss * 7700) / 7); // 7700 cal per kg

      expect(dailyDeficit).toBeCloseTo(550, -1);
    });

    describe('Weight Unit Conversion', () => {
      const convertWeight = (weight: number, from: 'kg' | 'lbs', to: 'kg' | 'lbs'): number => {
        if (from === to) return weight;
        if (from === 'kg' && to === 'lbs') return Math.round(weight * 2.20462 * 10) / 10;
        return Math.round((weight / 2.20462) * 10) / 10;
      };

      it('converts kg to lbs', () => {
        expect(convertWeight(85, 'kg', 'lbs')).toBeCloseTo(187.4, 0);
      });

      it('converts lbs to kg', () => {
        expect(convertWeight(187, 'lbs', 'kg')).toBeCloseTo(84.8, 0);
      });

      it('returns same value for same unit', () => {
        expect(convertWeight(85, 'kg', 'kg')).toBe(85);
      });
    });

    describe('Target Date Calculation', () => {
      const calculateTargetDate = (
        startDate: string,
        startWeight: number,
        goalWeight: number,
        weeklyLossRate: number = 0.5
      ): string => {
        const weightToLose = startWeight - goalWeight;
        const weeksNeeded = Math.ceil(weightToLose / weeklyLossRate);
        const target = new Date(startDate);
        target.setDate(target.getDate() + weeksNeeded * 7);
        return target.toISOString().split('T')[0];
      };

      it('calculates target date for weight loss', () => {
        const targetDate = calculateTargetDate('2024-01-01', 85, 75, 0.5);
        // 10kg at 0.5kg/week = 20 weeks = 140 days from Jan 1
        // Jan 1 + 140 days = May 19 (2024 is a leap year)
        expect(targetDate).toBe('2024-05-19');
      });
    });

    describe('Personalized Macros', () => {
      const calculateMacros = (
        targetCalories: number,
        weightKg: number
      ): { protein: number; carbs: number; fat: number } => {
        // Protein: 2g per kg of body weight
        const protein = Math.round(weightKg * 2);

        // Fat: 25% of calories
        const fatCalories = targetCalories * 0.25;
        const fat = Math.round(fatCalories / 9);

        // Carbs: remaining calories
        const proteinCalories = protein * 4;
        const carbCalories = targetCalories - proteinCalories - fatCalories;
        const carbs = Math.round(carbCalories / 4);

        return { protein, carbs, fat };
      };

      it('calculates macros based on target calories', () => {
        const macros = calculateMacros(2000, 80);

        expect(macros.protein).toBe(160);
        expect(macros.fat).toBe(56);
        expect(macros.carbs).toBeGreaterThan(0);

        // Verify calories add up
        const totalCal = macros.protein * 4 + macros.carbs * 4 + macros.fat * 9;
        expect(totalCal).toBeCloseTo(2000, -1);
      });
    });
  });

  describe('AI Configuration', () => {
    let aiSettings: AISettings;

    beforeEach(() => {
      aiSettings = {
        provider: 'groq',
        groqApiKey: 'gsk_test_key_123',
      };
    });

    it('sets provider to groq', () => {
      expect(aiSettings.provider).toBe('groq');
    });

    it('sets provider to openai', () => {
      aiSettings.provider = 'openai';
      aiSettings.openaiApiKey = 'sk-test-key';
      expect(aiSettings.provider).toBe('openai');
    });

    describe('API Key Validation', () => {
      const validateGroqKey = (key: string): boolean => {
        return key.startsWith('gsk_') && key.length > 10;
      };

      const validateOpenAIKey = (key: string): boolean => {
        return key.startsWith('sk-') && key.length > 10;
      };

      it('validates groq key format', () => {
        expect(validateGroqKey('gsk_test_key_123')).toBe(true);
        expect(validateGroqKey('invalid_key')).toBe(false);
        expect(validateGroqKey('gsk_')).toBe(false);
      });

      it('validates openai key format', () => {
        expect(validateOpenAIKey('sk-test-key-123456')).toBe(true);
        expect(validateOpenAIKey('invalid')).toBe(false);
      });
    });

    describe('API Key Encryption', () => {
      // Simple mock encryption for testing
      const encryptKey = (key: string): string => {
        return Buffer.from(key).toString('base64');
      };

      const decryptKey = (encrypted: string): string => {
        return Buffer.from(encrypted, 'base64').toString('utf-8');
      };

      it('encrypts and decrypts API key', () => {
        const original = 'gsk_test_key_123';
        const encrypted = encryptKey(original);
        const decrypted = decryptKey(encrypted);

        expect(encrypted).not.toBe(original);
        expect(decrypted).toBe(original);
      });
    });

    describe('Test Connection', () => {
      const testAPIConnection = async (
        provider: 'groq' | 'openai',
        apiKey: string
      ): Promise<{ success: boolean; error?: string }> => {
        // Mock implementation
        if (!apiKey || apiKey.length < 10) {
          return { success: false, error: 'Invalid API key' };
        }

        if (provider === 'groq' && !apiKey.startsWith('gsk_')) {
          return { success: false, error: 'Invalid Groq API key format' };
        }

        if (provider === 'openai' && !apiKey.startsWith('sk-')) {
          return { success: false, error: 'Invalid OpenAI API key format' };
        }

        return { success: true };
      };

      it('validates groq connection', async () => {
        const result = await testAPIConnection('groq', 'gsk_valid_key_123');
        expect(result.success).toBe(true);
      });

      it('rejects invalid groq key', async () => {
        const result = await testAPIConnection('groq', 'invalid');
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Activity Level Recommendations', () => {
    type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

    const getActivityMultiplier = (level: ActivityLevel): number => {
      const multipliers: Record<ActivityLevel, number> = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725,
        very_active: 1.9,
      };
      return multipliers[level];
    };

    const getActivityDescription = (level: ActivityLevel): string => {
      const descriptions: Record<ActivityLevel, string> = {
        sedentary: 'Little or no exercise',
        light: 'Light exercise 1-3 days/week',
        moderate: 'Moderate exercise 3-5 days/week',
        active: 'Hard exercise 6-7 days/week',
        very_active: 'Very hard exercise or physical job',
      };
      return descriptions[level];
    };

    it('returns correct multipliers', () => {
      expect(getActivityMultiplier('sedentary')).toBe(1.2);
      expect(getActivityMultiplier('moderate')).toBe(1.55);
      expect(getActivityMultiplier('very_active')).toBe(1.9);
    });

    it('returns correct descriptions', () => {
      expect(getActivityDescription('sedentary')).toContain('no exercise');
      expect(getActivityDescription('moderate')).toContain('3-5 days');
    });
  });

  describe('Settings Persistence', () => {
    interface Settings {
      profile: UserProfile;
      nutrition: NutritionSettings;
      ai: AISettings;
    }

    const saveSettings = (settings: Settings): string => {
      return JSON.stringify(settings);
    };

    const loadSettings = (json: string): Settings | null => {
      try {
        return JSON.parse(json);
      } catch {
        return null;
      }
    };

    it('serializes settings to JSON', () => {
      const settings: Settings = {
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: '1990-01-15',
          gender: 'male',
          heightCm: 180,
          activityLevel: 'moderate',
        },
        nutrition: {
          startWeight: 85,
          goalWeight: 75,
          startDate: '2024-01-01',
          weightUnit: 'kg',
          dailyCalorieTarget: 2000,
          proteinTarget: 150,
          carbsTarget: 200,
          fatTarget: 70,
        },
        ai: {
          provider: 'groq',
          groqApiKey: 'gsk_test',
        },
      };

      const json = saveSettings(settings);
      const loaded = loadSettings(json);

      expect(loaded?.profile.firstName).toBe('John');
      expect(loaded?.nutrition.goalWeight).toBe(75);
    });

    it('handles invalid JSON', () => {
      expect(loadSettings('not json')).toBeNull();
    });
  });

  describe('Coach Connection Settings', () => {
    interface CoachConnection {
      isCoach: boolean;
      coachCode?: string;
      connectedCoachId?: string;
      connectionStatus?: 'pending' | 'connected' | 'none';
    }

    it('shows coach code for coaches', () => {
      const connection: CoachConnection = {
        isCoach: true,
        coachCode: 'ABC123',
      };

      expect(connection.isCoach).toBe(true);
      expect(connection.coachCode).toBe('ABC123');
    });

    it('shows connection status for clients', () => {
      const connection: CoachConnection = {
        isCoach: false,
        connectedCoachId: 'coach-1',
        connectionStatus: 'connected',
      };

      expect(connection.isCoach).toBe(false);
      expect(connection.connectionStatus).toBe('connected');
    });
  });
});
