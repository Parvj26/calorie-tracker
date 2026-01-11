import { describe, it, expect, beforeEach } from 'vitest';

// ============================================
// COMMUNITY/DISCOVER TESTS
// ============================================

interface MasterMeal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  usageCount: number;
  status: 'approved' | 'pending' | 'rejected';
  submittedBy: string;
  recipe?: {
    ingredients: string[];
    instructions: string;
  };
}

interface Submission {
  id: string;
  mealId: string;
  mealName: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

describe('Community/Discover', () => {
  let masterMeals: MasterMeal[];
  let submissions: Submission[];

  beforeEach(() => {
    masterMeals = [
      {
        id: 'mm-1',
        name: 'Chicken Breast',
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
        usageCount: 150,
        status: 'approved',
        submittedBy: 'user-1',
      },
      {
        id: 'mm-2',
        name: 'Brown Rice',
        calories: 216,
        protein: 5,
        carbs: 45,
        fat: 1.8,
        usageCount: 120,
        status: 'approved',
        submittedBy: 'user-2',
      },
      {
        id: 'mm-3',
        name: 'Greek Salad',
        calories: 150,
        protein: 5,
        carbs: 10,
        fat: 10,
        usageCount: 80,
        status: 'approved',
        submittedBy: 'user-1',
        recipe: {
          ingredients: ['Tomatoes', 'Cucumber', 'Feta cheese', 'Olives', 'Olive oil'],
          instructions: 'Chop vegetables, add feta and olives, drizzle with olive oil.',
        },
      },
    ];

    submissions = [
      {
        id: 'sub-1',
        mealId: 'meal-1',
        mealName: 'Protein Shake',
        status: 'pending',
        submittedAt: '2024-01-15T10:00:00Z',
      },
      {
        id: 'sub-2',
        mealId: 'meal-2',
        mealName: 'Oatmeal Bowl',
        status: 'approved',
        submittedAt: '2024-01-10T10:00:00Z',
        reviewedAt: '2024-01-11T15:00:00Z',
      },
      {
        id: 'sub-3',
        mealId: 'meal-3',
        mealName: 'Pizza Slice',
        status: 'rejected',
        submittedAt: '2024-01-08T10:00:00Z',
        reviewedAt: '2024-01-09T12:00:00Z',
        rejectionReason: 'Nutritional values seem inaccurate',
      },
    ];
  });

  describe('Browse Master Meals', () => {
    it('returns all approved meals', () => {
      const approved = masterMeals.filter((m) => m.status === 'approved');
      expect(approved).toHaveLength(3);
    });

    it('sorts by usage count descending', () => {
      const sorted = [...masterMeals].sort((a, b) => b.usageCount - a.usageCount);

      expect(sorted[0].name).toBe('Chicken Breast');
      expect(sorted[0].usageCount).toBe(150);
    });
  });

  describe('Search Master Meals', () => {
    const searchMeals = (meals: MasterMeal[], query: string): MasterMeal[] => {
      if (!query.trim()) return meals;
      const lowerQuery = query.toLowerCase();
      return meals.filter((m) => m.name.toLowerCase().includes(lowerQuery));
    };

    it('filters by name (case-insensitive)', () => {
      const results = searchMeals(masterMeals, 'chicken');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Chicken Breast');
    });

    it('returns all for empty query', () => {
      expect(searchMeals(masterMeals, '')).toHaveLength(3);
      expect(searchMeals(masterMeals, '   ')).toHaveLength(3);
    });

    it('returns empty for no matches', () => {
      expect(searchMeals(masterMeals, 'pizza')).toHaveLength(0);
    });

    it('is case insensitive', () => {
      expect(searchMeals(masterMeals, 'RICE')).toHaveLength(1);
      expect(searchMeals(masterMeals, 'ChIcKeN')).toHaveLength(1);
    });
  });

  describe('Save to Library', () => {
    interface UserMeal {
      id: string;
      name: string;
      calories: number;
      masterMealId?: string;
    }

    it('adds master meal to user library', () => {
      const userMeals: UserMeal[] = [];
      const masterMeal = masterMeals[0];

      const savedMeal: UserMeal = {
        id: `user-${Date.now()}`,
        name: masterMeal.name,
        calories: masterMeal.calories,
        masterMealId: masterMeal.id,
      };

      userMeals.push(savedMeal);

      expect(userMeals).toHaveLength(1);
      expect(userMeals[0].masterMealId).toBe('mm-1');
    });

    it('checks if meal already in library', () => {
      const userMeals: UserMeal[] = [
        { id: 'u-1', name: 'Chicken Breast', calories: 165, masterMealId: 'mm-1' },
      ];

      const isInLibrary = (masterMealId: string): boolean => {
        return userMeals.some((m) => m.masterMealId === masterMealId);
      };

      expect(isInLibrary('mm-1')).toBe(true);
      expect(isInLibrary('mm-2')).toBe(false);
    });
  });

  describe('Log Community Meal', () => {
    it('increments usage count when logged', () => {
      const meal = { ...masterMeals[0] };
      const originalCount = meal.usageCount;

      meal.usageCount += 1;

      expect(meal.usageCount).toBe(originalCount + 1);
    });
  });

  describe('View Recipe', () => {
    it('returns recipe for meal with recipe', () => {
      const meal = masterMeals.find((m) => m.id === 'mm-3');

      expect(meal?.recipe).toBeDefined();
      expect(meal?.recipe?.ingredients).toContain('Tomatoes');
    });

    it('returns undefined for meal without recipe', () => {
      const meal = masterMeals.find((m) => m.id === 'mm-1');

      expect(meal?.recipe).toBeUndefined();
    });
  });

  describe('Submit Meal for Review', () => {
    it('creates pending submission', () => {
      const newSubmission: Submission = {
        id: `sub-${Date.now()}`,
        mealId: 'meal-new',
        mealName: 'New Recipe',
        status: 'pending',
        submittedAt: new Date().toISOString(),
      };

      submissions.push(newSubmission);

      expect(submissions.some((s) => s.mealName === 'New Recipe')).toBe(true);
      expect(submissions.find((s) => s.mealName === 'New Recipe')?.status).toBe('pending');
    });

    it('detects duplicate name', () => {
      const checkDuplicate = (name: string): boolean => {
        return masterMeals.some((m) => m.name.toLowerCase() === name.toLowerCase());
      };

      expect(checkDuplicate('Chicken Breast')).toBe(true);
      expect(checkDuplicate('chicken breast')).toBe(true);
      expect(checkDuplicate('New Unique Meal')).toBe(false);
    });
  });

  describe('My Submissions', () => {
    it('filters by status', () => {
      const filterByStatus = (status: Submission['status']): Submission[] => {
        return submissions.filter((s) => s.status === status);
      };

      expect(filterByStatus('pending')).toHaveLength(1);
      expect(filterByStatus('approved')).toHaveLength(1);
      expect(filterByStatus('rejected')).toHaveLength(1);
    });

    it('shows rejection reason for rejected submissions', () => {
      const rejected = submissions.find((s) => s.status === 'rejected');

      expect(rejected?.rejectionReason).toBe('Nutritional values seem inaccurate');
    });

    it('cancels pending submission', () => {
      const pendingId = 'sub-1';

      submissions = submissions.filter((s) => s.id !== pendingId);

      expect(submissions.find((s) => s.id === pendingId)).toBeUndefined();
    });
  });

  describe('Admin Review', () => {
    it('approves submission and creates master meal', () => {
      const submission = submissions[0];

      // Approve
      submission.status = 'approved';
      submission.reviewedAt = new Date().toISOString();

      // Create master meal
      const newMasterMeal: MasterMeal = {
        id: `mm-${Date.now()}`,
        name: submission.mealName,
        calories: 200,
        protein: 30,
        carbs: 5,
        fat: 8,
        usageCount: 0,
        status: 'approved',
        submittedBy: 'user-submitter',
      };

      masterMeals.push(newMasterMeal);

      expect(submission.status).toBe('approved');
      expect(masterMeals.some((m) => m.name === submission.mealName)).toBe(true);
    });

    it('rejects submission with reason', () => {
      const submission = submissions[0];

      submission.status = 'rejected';
      submission.reviewedAt = new Date().toISOString();
      submission.rejectionReason = 'Duplicate of existing meal';

      expect(submission.status).toBe('rejected');
      expect(submission.rejectionReason).toBeDefined();
    });

    it('archives (soft deletes) master meal', () => {
      interface ArchivableMeal extends MasterMeal {
        archivedAt?: string;
      }

      const meal: ArchivableMeal = masterMeals[0] as ArchivableMeal;
      meal.archivedAt = new Date().toISOString();

      const activeMeals = (masterMeals as ArchivableMeal[]).filter((m) => !m.archivedAt);

      expect(meal.archivedAt).toBeDefined();
      expect(activeMeals.length).toBeLessThan(masterMeals.length);
    });
  });

  describe('Usage Statistics', () => {
    it('calculates total usage across all meals', () => {
      const totalUsage = masterMeals.reduce((sum, m) => sum + m.usageCount, 0);

      expect(totalUsage).toBe(350);
    });

    it('finds most popular meal', () => {
      const mostPopular = masterMeals.reduce((max, m) =>
        m.usageCount > max.usageCount ? m : max
      );

      expect(mostPopular.name).toBe('Chicken Breast');
    });
  });

  describe('Recipe Validation', () => {
    interface RecipeValidation {
      valid: boolean;
      errors: string[];
    }

    const validateRecipe = (recipe: { ingredients?: string[]; instructions?: string }): RecipeValidation => {
      const errors: string[] = [];

      if (!recipe.ingredients || recipe.ingredients.length === 0) {
        errors.push('At least one ingredient is required');
      }

      if (!recipe.instructions || recipe.instructions.trim().length < 10) {
        errors.push('Instructions must be at least 10 characters');
      }

      return { valid: errors.length === 0, errors };
    };

    it('validates complete recipe', () => {
      const result = validateRecipe({
        ingredients: ['Chicken', 'Salt', 'Pepper'],
        instructions: 'Season chicken and grill for 10 minutes each side.',
      });

      expect(result.valid).toBe(true);
    });

    it('rejects recipe without ingredients', () => {
      const result = validateRecipe({
        ingredients: [],
        instructions: 'Some instructions here.',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one ingredient is required');
    });

    it('rejects recipe with short instructions', () => {
      const result = validateRecipe({
        ingredients: ['Chicken'],
        instructions: 'Cook it.',
      });

      expect(result.valid).toBe(false);
    });
  });

  describe('Meal Categories', () => {
    type Category = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other';

    const categorizeMeal = (name: string): Category => {
      const lowerName = name.toLowerCase();

      const breakfastKeywords = ['oatmeal', 'eggs', 'pancake', 'cereal', 'toast'];
      const snackKeywords = ['bar', 'shake', 'fruit', 'nuts', 'yogurt'];

      if (breakfastKeywords.some((k) => lowerName.includes(k))) return 'breakfast';
      if (snackKeywords.some((k) => lowerName.includes(k))) return 'snack';

      return 'other';
    };

    it('categorizes breakfast items', () => {
      expect(categorizeMeal('Oatmeal Bowl')).toBe('breakfast');
      expect(categorizeMeal('Scrambled Eggs')).toBe('breakfast');
    });

    it('categorizes snacks', () => {
      expect(categorizeMeal('Protein Shake')).toBe('snack');
      expect(categorizeMeal('Mixed Nuts')).toBe('snack');
    });

    it('defaults to other', () => {
      expect(categorizeMeal('Chicken Breast')).toBe('other');
    });
  });
});
