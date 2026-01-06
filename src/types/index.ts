export interface Macros {
  protein: number;
  carbs: number;
  fat: number;
}

export interface RecipeNutrition {
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
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

export interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  isCustom?: boolean;
  favorite?: boolean;
  recipe?: Recipe;
  deletedAt?: string; // ISO timestamp for soft delete, undefined = active
}

export interface HealthMetrics {
  restingEnergy: number;    // BMR - calories burned at rest
  activeEnergy: number;     // Move calories - calories burned through activity
  steps: number;
  exerciseMinutes: number;
  standHours?: number;
}

export interface DailyLog {
  date: string; // YYYY-MM-DD format
  meals: string[]; // Array of meal IDs
  masterMealIds?: string[]; // Array of master meal IDs (referenced/synced community meals)
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
}

export interface AppState {
  meals: Meal[];
  dailyLogs: DailyLog[];
  inBodyScans: InBodyScan[];
  weighIns: WeighIn[];
  settings: UserSettings;
}

export type TabType = 'dashboard' | 'discover' | 'progress' | 'inbody' | 'summary' | 'settings';

// ============================================
// MASTER MEAL LIBRARY TYPES
// ============================================

export type UserRole = 'user' | 'admin';

export interface UserProfile {
  id: string;
  userId: string;
  email?: string;
  displayName?: string;
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
  recipe?: Recipe;
  status: MasterMealStatus;
  submittedBy?: string;
  submittedByName?: string;
  approvedBy?: string;
  approvedAt?: string;
  usageCount: number;
  createdAt?: string;
  updatedAt?: string;
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
