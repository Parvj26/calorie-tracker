import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';

// Mock AuthContext - exported for use in tests that need to access mock functions
export const mockAuthContext = {
  user: null,
  loading: false,
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  resetPassword: vi.fn(),
};

// Create a mock AuthProvider
const MockAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

// Custom render function that wraps components with providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <MockAuthProvider>{children}</MockAuthProvider>
  );

  return render(ui, { wrapper: Wrapper, ...options });
};

// Re-export everything from testing-library
export * from '@testing-library/react';
export { customRender as render };

// Test data factories
export const createTestMeal = (overrides = {}) => ({
  id: `test-meal-${Math.random().toString(36).substring(7)}`,
  name: 'Test Meal',
  calories: 500,
  protein: 25,
  carbs: 50,
  fat: 20,
  fiber: 5,
  sugar: 10,
  addedSugar: 5,
  isCustom: true,
  servingSize: 100,
  servingSizeUnit: 'g' as const,
  ...overrides,
});

export const createTestDailyLog = (date: string, overrides = {}) => ({
  date,
  meals: [],
  workoutCalories: 0,
  ...overrides,
});

export const createTestWeighIn = (date: string, weight: number) => ({
  date,
  weight,
});

export const createTestInBodyScan = (date: string, overrides = {}) => ({
  id: `test-scan-${Math.random().toString(36).substring(7)}`,
  date,
  weight: 80,
  bodyFatPercent: 20,
  muscleMass: 40,
  skeletalMuscle: 30,
  bmr: 1700,
  fatMass: 16,
  ...overrides,
});

export const createTestSettings = (overrides = {}) => ({
  dailyCalorieTarget: 2000,
  dailyCalorieTargetMin: 1800,
  dailyCalorieTargetMax: 2200,
  startWeight: 85,
  goalWeight: 75,
  startDate: '2024-01-01',
  aiProvider: 'groq' as const,
  ...overrides,
});

export const createTestUserProfile = (overrides = {}) => ({
  id: 'test-user-id',
  userId: 'test-user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  dateOfBirth: '1990-01-15',
  gender: 'male' as const,
  heightCm: 180,
  activityLevel: 'moderate' as const,
  role: 'user' as const,
  ...overrides,
});

// Date helpers for tests
export const daysAgo = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
};

export const today = (): string => {
  return new Date().toISOString().split('T')[0];
};
