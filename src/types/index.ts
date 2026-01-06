export interface Macros {
  protein: number;
  carbs: number;
  fat: number;
}

export interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  isCustom?: boolean;
}

export interface DailyLog {
  date: string; // YYYY-MM-DD format
  meals: string[]; // Array of meal IDs
  workoutCalories: number;
  notes?: string;
}

export interface InBodyScan {
  id: string;
  date: string;
  weight: number;
  bodyFatPercent: number;
  muscleMass: number;
  skeletalMuscle: number;
  imageData?: string; // base64 encoded image
}

export interface WeighIn {
  date: string;
  weight: number;
}

export interface UserSettings {
  dailyCalorieTargetMin: number;
  dailyCalorieTargetMax: number;
  startWeight: number;
  goalWeight: number;
  startDate: string;
  openAiApiKey?: string;
}

export interface AppState {
  meals: Meal[];
  dailyLogs: DailyLog[];
  inBodyScans: InBodyScan[];
  weighIns: WeighIn[];
  settings: UserSettings;
}

export type TabType = 'dashboard' | 'progress' | 'inbody' | 'summary' | 'settings';
