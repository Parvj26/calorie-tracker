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
export type WeightUnit = 'kg' | 'lbs';

export interface UserSettings {
  dailyCalorieTarget?: number; // User's daily calorie goal
  dailyCalorieTargetMin: number; // Legacy - kept for backward compatibility
  dailyCalorieTargetMax: number; // Legacy - kept for backward compatibility
  tefMultiplier?: number; // TEF multiplier for Apple Health TDEE (default: 1.10)
  startWeight: number;
  goalWeight: number;
  startDate: string;
  targetDate?: string; // When to reach goal weight (YYYY-MM-DD)
  weightUnit?: WeightUnit; // Display preference for weights (default: kg)
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

export type UserRole = 'user' | 'admin' | 'coach';
export type Gender = 'male' | 'female' | 'other' | 'prefer-not-to-say';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export interface UserProfile {
  id: string;
  userId: string;
  email?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: Gender;
  heightCm?: number;              // Height in cm for BMR calculation
  activityLevel?: ActivityLevel;  // Activity level for NEAT calculation
  role: UserRole;
  coachCode?: string;             // Unique code for coaches to share with clients
  createdAt?: string;
  updatedAt?: string;
}

// ============================================
// COACH-CLIENT TYPES
// ============================================

export type CoachClientStatus = 'pending' | 'accepted' | 'rejected' | 'terminated';

export interface CoachClient {
  id: string;
  coachId: string;
  clientId: string;
  status: CoachClientStatus;
  requestedAt: string;
  respondedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CoachClientWithProfile extends CoachClient {
  clientProfile?: UserProfile;
  coachProfile?: UserProfile;
}

export interface ClientSummary {
  clientId: string;
  profile: UserProfile;
  latestWeight?: number;
  weightChange7Days?: number;
  caloriesToday?: number;
  calorieTarget?: number;
  lastActivityDate?: string;
  daysInactive: number;           // Days since last activity
  isInactive: boolean;            // 3+ days no activity
  hasWeightPlateau: boolean;      // 14+ days no significant weight change
  missedCalorieTargets: number;   // Days missed target in last 7
}

export interface CoachAlert {
  id: string;
  type: 'inactive' | 'plateau' | 'missed_targets' | 'new_request';
  clientId?: string;
  clientName?: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  createdAt: string;
}

export interface CoachDashboardData {
  clients: ClientSummary[];
  pendingRequests: CoachClientWithProfile[];
  alerts: CoachAlert[];
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
  // New enhanced structure
  patternInsight: string;      // Key insight about their eating pattern
  actionItem: string;          // One specific actionable suggestion
  progressSummary: string;     // Progress towards goal with motivation
  wins: string[];              // Positive reinforcement (1-2 wins)
  remaining: string;           // Calories/macros remaining summary
  generatedAt: string;         // ISO timestamp
  // Legacy fields for backwards compatibility
  tips?: string[];
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
