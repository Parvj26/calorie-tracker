import type { Meal, UserSettings } from '../types';

export const defaultMeals: Meal[] = [
  {
    id: 'acai-bowl',
    name: 'Acai Bowl',
    calories: 415,
    protein: 31,
    carbs: 60,
    fat: 7,
    isCustom: false,
  },
  {
    id: 'chicken-tikka',
    name: 'Chicken Tikka with Mint Sauce',
    calories: 400,
    protein: 60,
    carbs: 8,
    fat: 14,
    isCustom: false,
  },
  {
    id: 'protein-shake',
    name: 'Protein Shake',
    calories: 345,
    protein: 34,
    carbs: 41,
    fat: 5,
    isCustom: false,
  },
];

export const defaultSettings: UserSettings = {
  dailyCalorieTargetMin: 1600,
  dailyCalorieTargetMax: 1800,
  startWeight: 81,
  goalWeight: 72,
  startDate: new Date().toISOString().split('T')[0],
  aiProvider: 'groq',
};
