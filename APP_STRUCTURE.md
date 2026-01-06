# CalorieTracker - App Structure & Features

## Overview

CalorieTracker is a multi-user nutrition companion web app with cloud sync. Track daily calories, import Apple Health data for accurate TDEE, monitor body composition via InBody scans, and visualize progress toward weight goals.

**Live URL:** https://calorie-tracker-self-five.vercel.app
**GitHub:** https://github.com/Parvj26/calorie-tracker

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| React 18 | UI Framework |
| TypeScript | Type Safety |
| Vite | Build Tool |
| Supabase | Auth & Database |
| Recharts | Data Visualization |
| date-fns | Date Manipulation |
| lucide-react | Icons |
| Groq API | AI Image Analysis (Free) |
| OpenAI GPT-4o | AI Image Analysis (Paid) |
| Vercel | Hosting |

---

## Project Structure

```
calorie-tracker/
├── public/
│   ├── icons/                    # PWA icons
│   ├── manifest.json             # PWA manifest
│   └── sw.js                     # Service worker
│
├── src/
│   ├── components/
│   │   ├── Auth.tsx              # Login/Signup screens
│   │   ├── Dashboard.tsx         # Main dashboard view
│   │   ├── CircularProgress.tsx  # Progress indicator
│   │   ├── MealLogger.tsx        # Meal selection
│   │   ├── FoodScanner.tsx       # AI food scanner
│   │   ├── HealthScanner.tsx     # Apple Health importer
│   │   ├── InBodyUpload.tsx      # InBody scan uploader
│   │   ├── ProgressTracker.tsx   # Weight, calories & steps charts
│   │   ├── WeeklySummary.tsx     # Weekly stats
│   │   └── Settings.tsx          # User settings
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx       # Authentication state & methods
│   │
│   ├── hooks/
│   │   ├── useCalorieTracker.ts  # Main state + Supabase sync
│   │   ├── useSupabaseSync.ts    # Cloud sync operations
│   │   └── useLocalStorage.ts    # Local persistence
│   │
│   ├── lib/
│   │   └── supabase.ts           # Supabase client config
│   │
│   ├── utils/
│   │   ├── openai.ts             # OpenAI API
│   │   └── groq.ts               # Groq API
│   │
│   ├── data/
│   │   └── defaultMeals.ts       # Default meals & settings
│   │
│   ├── types/
│   │   └── index.ts              # TypeScript interfaces
│   │
│   ├── App.tsx                   # Root component with AuthProvider
│   ├── App.css                   # Global styles
│   └── main.tsx                  # Entry point
│
├── supabase-schema.sql           # Database schema
├── package.json
└── vite.config.ts
```

---

## Features

### 1. User Authentication

**File:** `src/components/Auth.tsx`

- Email/password signup and login
- Session persistence
- Logout functionality
- Powered by Supabase Auth

### 2. Cloud Sync

**Files:** `src/hooks/useSupabaseSync.ts`, `src/lib/supabase.ts`

All data syncs to Supabase in real-time:
- Meals, daily logs, weigh-ins, InBody scans, settings
- Row-level security (each user sees only their data)
- Sync status indicator in header (cloud icon)
- Works offline with localStorage fallback

### 3. Dashboard

**File:** `src/components/Dashboard.tsx`

- Date selector for navigating days
- Scan Food button (AI-powered)
- TDEE card (when health data imported, uses InBody BMR if available)
- Body metrics from InBody:
  - Basic: weight, body fat %, muscle mass, SMM
  - BMR highlight (resting metabolism)
  - Visceral fat grade with health status indicator
  - Collapsible additional metrics (water, trunk fat, body age, protein, bone)
- Goal progress bar
- Circular calorie progress
- Macros breakdown
- Activity calories
- True deficit calculation
- Meal logger

### 4. AI Food Scanner

**File:** `src/components/FoodScanner.tsx`

- Photo capture or upload
- AI identifies food + estimates nutrition
- Confidence indicator
- Portion multiplier (0.5x - 2x)
- Log Once or Save & Log options

### 5. Apple Health Import

**File:** `src/components/HealthScanner.tsx`

Extracts from screenshots:
- Resting Energy (BMR)
- Active Energy
- Steps, Exercise minutes, Stand hours

Calculates:
```
TDEE = Resting + Active Energy
True Deficit = TDEE - Calories Eaten
```

### 6. InBody Scan Upload

**File:** `src/components/InBodyUpload.tsx`

- Upload InBody scan photos
- AI extracts comprehensive metrics:
  - **Basic:** weight, body fat %, muscle mass, skeletal muscle
  - **Tier 1 (Critical):** BMR, fat mass, visceral fat grade
  - **Tier 2 (Valuable):** water weight, trunk fat, body age, protein mass, bone mass
- Collapsible enhanced metrics section with validation
- Visceral fat grade health indicator (green/yellow/red)
- Auto-syncs weight to weigh-in tracking
- BMR automatically improves TDEE calculations
- View/delete scan history with BMR column

### 7. Progress Tracker

**File:** `src/components/ProgressTracker.tsx`

Seven chart tabs:
- **Weight** - Trend line with goal reference
- **Calories** - Daily intake over 30 days
- **Steps** - Daily steps with 10k goal line + motivational stats:
  - Day streak (10k+ days)
  - Daily average
  - Personal best
  - Total steps
- **Body Comp** - Body fat % and skeletal muscle trends
- **Fat vs Muscle** - Fat mass vs muscle mass comparison (requires enhanced InBody data)
- **BMR** - Basal metabolic rate trend over time
- **Visceral Fat** - Visceral fat grade with health risk zones (10 elevated, 15 high risk)

Also includes:
- Goal progress card
- Manual weigh-in entry
- Weigh-in history

### 8. Weekly Summary

**File:** `src/components/WeeklySummary.tsx`

- Average daily calories
- Average deficit
- Weight change
- Weeks to goal projection
- Motivational insights

### 9. Settings

**File:** `src/components/Settings.tsx`

- AI Provider (Groq free / OpenAI paid)
- Calorie target range
- Start/goal weight
- API keys
- Export data (JSON)
- Clear all data

---

## Database Schema

**File:** `supabase-schema.sql`

Tables with row-level security:

| Table | Purpose |
|-------|---------|
| `meals` | User's meal library |
| `daily_logs` | Daily logs with health metrics (JSONB) |
| `weigh_ins` | Weight entries |
| `inbody_scans` | Body composition scans (12 metrics) |
| `user_settings` | User preferences |

All tables have `user_id` foreign key to `auth.users`.

**InBody Scans Enhanced Columns:**
```sql
-- Basic columns: id, user_id, date, weight, body_fat_percent, muscle_mass, skeletal_muscle, image_data

-- Enhanced metrics (added):
bmr INTEGER,                    -- Basal Metabolic Rate in kcal
fat_mass DECIMAL(5,2),          -- Total fat mass in kg
visceral_fat_grade INTEGER,     -- 1-20 scale
water_weight DECIMAL(5,2),      -- Water weight in kg
trunk_fat_mass DECIMAL(5,2),    -- Belly/trunk fat in kg
body_age INTEGER,               -- Body age in years
protein_mass DECIMAL(5,2),      -- Protein mass in kg
bone_mass DECIMAL(5,2)          -- Bone mass in kg
```

---

## Data Models

**File:** `src/types/index.ts`

```typescript
interface HealthMetrics {
  restingEnergy: number;
  activeEnergy: number;
  steps: number;
  exerciseMinutes: number;
  standHours?: number;
}

interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  isCustom: boolean;
}

interface DailyLog {
  date: string;
  meals: string[];
  workoutCalories: number;
  healthMetrics?: HealthMetrics;
}

interface InBodyScan {
  id: string;
  date: string;

  // Basic metrics
  weight: number;
  bodyFatPercent: number;
  muscleMass: number;
  skeletalMuscle: number;

  // Enhanced metrics (Tier 1 - Critical)
  bmr?: number;              // Basal Metabolic Rate in kcal
  fatMass?: number;          // Total fat mass in kg
  visceralFatGrade?: number; // Internal organ fat grade (1-20)

  // Enhanced metrics (Tier 2 - Valuable)
  waterWeight?: number;      // Water weight in kg
  trunkFatMass?: number;     // Trunk/belly fat in kg
  bodyAge?: number;          // Metabolic body age in years
  proteinMass?: number;      // Protein mass in kg
  boneMass?: number;         // Bone mass in kg

  imageData?: string;
  userId?: string;
}

interface WeighIn {
  date: string;
  weight: number;
}

interface UserSettings {
  dailyCalorieTargetMin: number;
  dailyCalorieTargetMax: number;
  startWeight: number;
  goalWeight: number;
  startDate: string;
  aiProvider: 'openai' | 'groq';
  openAiApiKey?: string;
  groqApiKey?: string;
}
```

---

## State Management

**File:** `src/hooks/useCalorieTracker.ts`

Hybrid storage: localStorage + Supabase sync

| Data | Local Key | Supabase Table |
|------|-----------|----------------|
| meals | `calorie-tracker-meals` | `meals` |
| dailyLogs | `calorie-tracker-daily-logs` | `daily_logs` |
| weighIns | `calorie-tracker-weighins` | `weigh_ins` |
| inBodyScans | `calorie-tracker-inbody` | `inbody_scans` |
| settings | `calorie-tracker-settings` | `user_settings` |

Key functions:
- `toggleMealForDate()` - Add/remove meal
- `updateHealthMetrics()` - Save Apple Health data
- `addMeal()` / `deleteMeal()` - Manage meal library
- `addWeighIn()` / `deleteWeighIn()` - Track weight
- `addInBodyScan()` - Save scan + auto-sync weight
- `calculateTotals()` - Compute TDEE, deficit, macros
- `getProgressData()` - Chart data including steps stats

---

## API Integration

### Groq (Free - Default)

**File:** `src/utils/groq.ts`

Model: `meta-llama/llama-4-scout-17b-16e-instruct`

Functions:
- `groqAnalyzeFood()` - Food recognition
- `groqExtractInBodyData()` - InBody scan extraction (12 metrics)
- `groqExtractHealthData()` - Apple Health extraction

### OpenAI (Paid)

**File:** `src/utils/openai.ts`

Model: `gpt-4o` (temperature: 0.1 for precision)

Same functions as Groq.

**InBody Extraction Fields:**
- Basic: date, weight, bodyFatPercent, muscleMass, skeletalMuscle
- Enhanced: bmr, fatMass, visceralFatGrade, waterWeight, trunkFatMass, bodyAge, proteinMass, boneMass

---

## Getting Started

### 1. Set Up Supabase Database

Run `supabase-schema.sql` in Supabase SQL Editor:
https://supabase.com/dashboard/project/jjbozzkghpmvxpnoazwu/sql

### 2. Configure Supabase Auth

In Supabase Dashboard > Authentication > URL Configuration:

| Setting | Value |
|---------|-------|
| Site URL | `https://calorie-tracker-self-five.vercel.app` |
| Redirect URLs | `https://calorie-tracker-self-five.vercel.app/**` |

### 3. Create Account

- Open the app
- Click "Sign Up"
- Enter email + password
- Check email for confirmation link

### 4. Configure AI Provider

- Go to Settings
- Select Groq (free) or OpenAI
- Get API key from https://console.groq.com/keys
- Save key

### 5. Start Tracking

- Import Apple Health screenshot for TDEE
- Scan food with camera
- Track progress in charts

---

## Calorie Calculations

**Without Health Data:**
```
Target = (Min + Max) / 2
Net = Eaten - Workout
Deficit = Target - Net
```

**With Health Data (TDEE):**
```
TDEE = Resting Energy + Active Energy
Deficit = TDEE - Eaten
```

**Resting Energy Priority:**
1. InBody BMR (most accurate - from body composition scan)
2. Apple Health Resting Energy (estimated)
3. Falls back to target-based calculation

Weight projection: 7,700 cal = 1 kg

---

## Styling

**File:** `src/App.css`

- Primary: `#6366f1` (Indigo)
- Success: `#10b981` (Green)
- Warning: `#f59e0b` (Amber)
- Danger: `#ef4444` (Red)
- Steps: `#8b5cf6` (Purple)

Mobile-first responsive design.

---

## PWA Features

- Installable on iOS/Android
- Offline support via service worker
- Custom app icons and splash screens
- Standalone mode (no browser UI)
