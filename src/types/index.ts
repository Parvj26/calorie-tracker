export interface Macros {
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  addedSugar: number;
}

export interface RecipeNutrition {
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  fiber?: number | null;
  sugar?: number | null;
  addedSugar?: number | null;
}

export interface RecipeIngredient {
  item: string;
  portion?: string;
  amount?: string;
  unit?: string;
}

export interface RecipeSection {
  title: string;
  ingredients: RecipeIngredient[];
  nutrition?: RecipeNutrition;
  notes?: string[];
}

export interface Recipe {
  rawText?: string;
  servings?: number;
  totalTime?: number;
  nutrition?: RecipeNutrition;
  sections?: RecipeSection[];
  ingredients?: RecipeIngredient[];
  instructions?: string[];
}

export type ServingSizeUnit = 'g' | 'ml' | 'oz';

export interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  addedSugar?: number;  // Added sugar only (not from natural sources like fruit/dairy)
  isCustom?: boolean;
  favorite?: boolean;
  recipe?: Recipe;
  deletedAt?: string; // ISO timestamp for soft delete, undefined = active
  servingSize?: number;        // e.g., 100 (grams per serving)
  servingSizeUnit?: ServingSizeUnit;  // Default: 'g'
}

export interface HealthMetrics {
  restingEnergy: number;    // BMR - calories burned at rest
  activeEnergy: number;     // Move calories - calories burned through activity
  steps: number;
  exerciseMinutes: number;
  standHours?: number;
}

export type QuantityUnit = 'serving' | 'g' | 'ml' | 'oz';

// Meal entry with quantity for daily logging
export interface MealLogEntry {
  mealId: string;
  quantity: number; // 1 = 1 serving, 2 = 2 servings, 0.5 = half serving, or grams if unit='g'
  unit?: QuantityUnit; // Default: 'serving'
}

// Master meal entry with quantity
export interface MasterMealLogEntry {
  mealId: string;
  quantity: number;
  unit?: QuantityUnit; // Default: 'serving'
}

export interface DailyLog {
  date: string; // YYYY-MM-DD format
  meals: (string | MealLogEntry)[]; // Array of meal IDs or entries with quantity (backward compatible)
  masterMealIds?: (string | MasterMealLogEntry)[]; // Array of master meal IDs or entries with quantity
  workoutCalories: number;  // Manual entry (fallback)
  healthMetrics?: HealthMetrics; // From Apple Health import
  notes?: string;
}

export interface InBodyScan {
  id: string;
  date: string;

  // Existing basic metrics
  weight: number;
  bodyFatPercent: number;
  muscleMass: number;
  skeletalMuscle: number;

  // Enhanced metrics (Tier 1 - Critical)
  bmr?: number;              // Basal Metabolic Rate in kcal - MOST IMPORTANT
  fatMass?: number;          // Total fat mass in kg
  visceralFatGrade?: number; // Internal organ fat grade (1-20)

  // Enhanced metrics (Tier 2 - Valuable)
  waterWeight?: number;      // Water weight in kg
  trunkFatMass?: number;     // Trunk/belly fat in kg
  bodyAge?: number;          // Metabolic body age in years
  proteinMass?: number;      // Protein mass in kg
  boneMass?: number;         // Bone mass in kg

  imageData?: string;        // base64 encoded image
  userId?: string;           // user_id for Supabase
}

export interface WeighIn {
  date: string;
  weight: number;
}

export type AIProvider = 'openai' | 'groq';

export interface UserSettings {
  dailyCalorieTargetMin: number;
  dailyCalorieTargetMax: number;
  startWeight: number;
  goalWeight: number;
  startDate: string;
  aiProvider: AIProvider;
  openAiApiKey?: string;
  groqApiKey?: string;
  groqApiKeyBackup?: string; // Backup Groq key (auto-used if primary hits rate limits)
  savedMasterMealIds?: string[]; // Community meals saved to user's library
}

export interface AppState {
  meals: Meal[];
  dailyLogs: DailyLog[];
  inBodyScans: InBodyScan[];
  weighIns: WeighIn[];
  settings: UserSettings;
}

export type TabType = 'dashboard' | 'log' | 'discover' | 'progress' | 'inbody' | 'summary' | 'settings';

// ============================================
// MASTER MEAL LIBRARY TYPES
// ============================================

export type UserRole = 'user' | 'admin';
export type Gender = 'male' | 'female' | 'other' | 'prefer-not-to-say';

export interface UserProfile {
  id: string;
  userId: string;
  email?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: Gender;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

export type MasterMealStatus = 'approved' | 'archived';

export interface MasterMeal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  addedSugar?: number;  // Added sugar only (not from natural sources)
  recipe?: Recipe;
  status: MasterMealStatus;
  submittedBy?: string;
  submittedByName?: string;
  approvedBy?: string;
  approvedAt?: string;
  usageCount: number;
  createdAt?: string;
  updatedAt?: string;
  servingSize?: number;
  servingSizeUnit?: ServingSizeUnit;
}

export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface MealSubmission {
  id: string;
  sourceMealId?: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  addedSugar?: number;  // Added sugar only (not from natural sources)
  recipe?: Recipe;
  submittedBy: string;
  submittedByEmail?: string;
  submittedAt: string;
  status: SubmissionStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  masterMealId?: string;
}

// ============================================
// AI INSIGHTS TYPES
// ============================================

export interface DailyInsights {
  tips: string[];              // 2-3 quick tips for today
  remaining: string;           // Calories/macros remaining summary
  generatedAt: string;         // ISO timestamp
}

export interface WeeklyInsights {
  summary: string;             // 2-3 sentence overview
  patterns: string[];          // Detected patterns
  wins: string[];              // Positive achievements
  suggestions: string[];       // Actionable tips
  generatedAt: string;         // ISO timestamp
}

export interface MonthlyInsights {
  summary: string;             // Month overview
  trends: string[];            // Long-term trends
  goalPrediction: string;      // When user will reach goal
  comparison: string;          // vs last month
  generatedAt: string;         // ISO timestamp
}
