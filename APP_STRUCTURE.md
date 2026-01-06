# CalorieTracker - App Structure & Features

## Overview

CalorieTracker is a multi-user nutrition companion web app with cloud sync. Track daily calories, import Apple Health data for accurate TDEE, monitor body composition via InBody scans, discover community-shared meals, and visualize progress toward weight goals.

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
│   │   ├── MealLogger.tsx        # Meal selection & trash
│   │   ├── FoodScanner.tsx       # AI food scanner
│   │   ├── RecipeModal.tsx       # Recipe viewer modal
│   │   ├── HealthScanner.tsx     # Apple Health importer
│   │   ├── InBodyUpload.tsx      # InBody scan uploader
│   │   ├── ProgressTracker.tsx   # Weight, calories & steps charts
│   │   ├── WeeklySummary.tsx     # Weekly stats
│   │   ├── Settings.tsx          # User settings
│   │   │
│   │   ├── Discover/             # Community meals feature
│   │   │   ├── DiscoverTab.tsx       # Main discover container
│   │   │   ├── MasterMealCard.tsx    # Community meal display
│   │   │   ├── SubmitMealModal.tsx   # Submit meal for review
│   │   │   └── MySubmissionsPanel.tsx # User submission history
│   │   │
│   │   └── Admin/                # Admin features
│   │       └── AdminPanel.tsx        # Approve/reject submissions
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx       # Authentication state & methods
│   │
│   ├── hooks/
│   │   ├── useCalorieTracker.ts  # Main state + Supabase sync
│   │   ├── useSupabaseSync.ts    # Cloud sync operations
│   │   ├── useLocalStorage.ts    # Local persistence
│   │   ├── useUserProfile.ts     # User profile & admin check
│   │   ├── useMasterMeals.ts     # Community meal library
│   │   └── useMealSubmissions.ts # Submission workflow
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
│   ├── App.tsx                   # Root component with tabs
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
- Works offline with localStorage fallback

### 3. Dashboard

**File:** `src/components/Dashboard.tsx`

- Date selector for navigating days
- Scan Food button (AI-powered)
- TDEE card (uses InBody BMR if available)
- Body metrics from InBody:
  - Weight, body fat %, muscle mass, SMM
  - BMR (resting metabolism)
  - Visceral fat grade with health status
  - Collapsible additional metrics
- Goal progress bar
- Circular calorie progress
- Macros breakdown (protein, carbs, fat)
- Activity calories
- True deficit calculation
- Meal logger with favorites and trash access
- Recipe indicator for meals with recipes

### 4. Meal Management

**File:** `src/components/MealLogger.tsx`

#### Meal Library
- Add custom meals with macros
- Edit existing meals (name, macros, recipe)
- Toggle favorite meals (starred)
- Filter: All, Favorites, Custom
- Search meals by name
- Community meals from library shown with badge

#### Recipes
- Single text box for recipes/ingredients
- AI formats into structured sections
- Recipe modal with nutrition breakdown

#### Trash / Recycle Bin
- Soft delete meals (30-day retention)
- Restore deleted meals
- Permanently delete meals
- Days until auto-deletion indicator

### 5. Discover (Community Meals)

**Files:** `src/components/Discover/`

Browse and share meals with the community:

#### For All Users
- Browse approved community meals
- Search master meal library
- **Add to Library** - saves community meal to personal library (synced to Supabase)
- Saved meals appear in Dashboard for easy daily logging
- Remove meals from library (keeps past day logs intact for accurate tracking)
- View recipe button on meals with recipes
- Submit personal meals for admin review
- View submission status (pending/approved/rejected)
- Cancel pending submissions

#### Community Meal Flow
1. Browse Discover tab → Click "Add to Library"
2. Meal appears in Dashboard meal list (with Community badge)
3. Toggle on/off for any day like personal meals
4. Remove from library via X button (historical logs preserved)

#### For Admins
- Admin panel to review pending submissions
- Approve meals → adds to master library
- Reject meals with reason
- Manage community meal library

### 6. AI Food Scanner

**File:** `src/components/FoodScanner.tsx`

- Photo capture or upload
- AI identifies food + estimates nutrition
- Confidence indicator
- Portion multiplier (0.5x - 2x)
- Log Once or Save & Log options
- Optional recipe generation for scanned foods

### 7. Apple Health Import

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

### 8. InBody Scan Upload

**File:** `src/components/InBodyUpload.tsx`

- Upload InBody scan photos
- AI extracts comprehensive metrics:
  - **Basic:** weight, body fat %, muscle mass, skeletal muscle
  - **Tier 1:** BMR, fat mass, visceral fat grade
  - **Tier 2:** water weight, trunk fat, body age, protein mass, bone mass
- Visceral fat health indicator (green/yellow/red)
- Auto-syncs weight to weigh-in tracking
- BMR improves TDEE calculations
- View/delete scan history

### 9. Progress Tracker

**File:** `src/components/ProgressTracker.tsx`

Seven chart tabs:
- **Weight** - Trend line with goal reference
- **Calories** - Daily intake over 30 days
- **Steps** - Daily steps with 10k goal + stats (streak, average, best, total)
- **Body Comp** - Body fat % and skeletal muscle trends
- **Fat vs Muscle** - Fat mass vs muscle mass comparison
- **BMR** - Basal metabolic rate trend
- **Visceral Fat** - Visceral fat grade with health risk zones

Also includes:
- Goal progress card
- Manual weigh-in entry
- Weigh-in history

### 10. Weekly Summary

**File:** `src/components/WeeklySummary.tsx`

- Average daily calories
- Average deficit
- Weight change
- Weeks to goal projection
- Motivational insights

### 11. Settings

**File:** `src/components/Settings.tsx`

- AI Provider (Groq free / OpenAI paid)
- Calorie target range (min/max)
- Start/goal weight
- API keys management
- Export data (JSON)
- Clear all data

---

## Navigation Tabs

| Tab | Icon | Description |
|-----|------|-------------|
| Dashboard | LayoutDashboard | Daily tracking & logging |
| Discover | Globe | Community meal library |
| Progress | TrendingUp | Charts & weigh-ins |
| InBody | ScanLine | Body composition scans |
| Summary | Calendar | Weekly statistics |
| Settings | Settings | App configuration |

---

## Database Schema

**File:** `supabase-schema.sql`

### Core Tables

| Table | Purpose |
|-------|---------|
| `meals` | User's meal library (with soft delete) |
| `daily_logs` | Daily logs with health metrics |
| `weigh_ins` | Weight entries |
| `inbody_scans` | Body composition scans |
| `user_settings` | User preferences |

### Community Feature Tables

| Table | Purpose |
|-------|---------|
| `user_profiles` | User roles (user/admin) |
| `master_meals` | Approved community meals |
| `meal_submissions` | Pending meal submissions |

### Key Columns

```sql
-- meals table
deleted_at TIMESTAMPTZ     -- Soft delete (NULL = active, timestamp = in trash)
favorite BOOLEAN           -- Starred meals
recipe JSONB              -- Structured recipe data

-- daily_logs table
meal_ids UUID[]           -- User's personal meals
master_meal_ids UUID[]    -- Referenced community meals
health_metrics JSONB      -- Apple Health data

-- user_settings table
saved_master_meal_ids TEXT[]  -- Community meals saved to user's library

-- user_profiles table
role TEXT                 -- 'user' or 'admin'

-- master_meals table
status TEXT               -- 'approved' or 'archived'
usage_count INTEGER       -- Popularity tracking
submitted_by UUID         -- Original submitter

-- meal_submissions table
status TEXT               -- 'pending', 'approved', 'rejected'
rejection_reason TEXT     -- Admin feedback
```

All tables have Row Level Security (RLS) enabled.

---

## Data Models

**File:** `src/types/index.ts`

```typescript
// User Roles
type UserRole = 'user' | 'admin';

interface UserProfile {
  id: string;
  userId: string;
  email?: string;
  displayName?: string;
  role: UserRole;
}

// Meals
interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  isCustom: boolean;
  favorite?: boolean;
  recipe?: Recipe;
  deletedAt?: string;  // Soft delete timestamp
}

// Community Meals
interface MasterMeal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  recipe?: Recipe;
  status: 'approved' | 'archived';
  submittedBy?: string;
  submittedByName?: string;
  usageCount: number;
}

// Submissions
interface MealSubmission {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  recipe?: Recipe;
  submittedBy: string;
  submittedByEmail?: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}

// Daily Logs
interface DailyLog {
  date: string;
  meals: string[];           // Personal meal IDs
  masterMealIds?: string[];  // Community meal IDs
  workoutCalories: number;
  healthMetrics?: HealthMetrics;
}

// Health Metrics
interface HealthMetrics {
  restingEnergy: number;
  activeEnergy: number;
  steps: number;
  exerciseMinutes: number;
  standHours?: number;
}

// InBody Scans
interface InBodyScan {
  id: string;
  date: string;
  weight: number;
  bodyFatPercent: number;
  muscleMass: number;
  skeletalMuscle: number;
  bmr?: number;
  fatMass?: number;
  visceralFatGrade?: number;
  waterWeight?: number;
  trunkFatMass?: number;
  bodyAge?: number;
  proteinMass?: number;
  boneMass?: number;
  imageData?: string;
}

// Recipes
interface Recipe {
  rawText?: string;
  servings?: number;
  sections?: RecipeSection[];
  ingredients?: RecipeIngredient[];
  instructions?: string[];
}

// Settings
interface UserSettings {
  dailyCalorieTargetMin: number;
  dailyCalorieTargetMax: number;
  startWeight: number;
  goalWeight: number;
  startDate: string;
  aiProvider: 'openai' | 'groq';
  openAiApiKey?: string;
  groqApiKey?: string;
  savedMasterMealIds?: string[];  // Community meals saved to library
}
```

---

## Hooks

| Hook | Purpose |
|------|---------|
| `useCalorieTracker` | Main state, CRUD operations, calculations |
| `useSupabaseSync` | Cloud sync with Supabase |
| `useLocalStorage` | Persistent local storage |
| `useUserProfile` | User profile & admin check |
| `useMasterMeals` | Load/search community meals |
| `useMealSubmissions` | Submit/approve/reject workflow |

### Key Functions (useCalorieTracker)

```typescript
// Meals
addMeal(meal)
updateMeal(id, updates)     // Edit existing meal
deleteMeal(id)              // Soft delete → trash
restoreMeal(id)             // Restore from trash
permanentlyDeleteMeal(id)   // Hard delete
toggleFavorite(id)

// Daily Logging
toggleMealForDate(mealId, date)
addMasterMealToLog(masterMealId, date)
removeMasterMealFromLog(masterMealId, date)
updateWorkoutCalories(date, calories)
updateHealthMetrics(date, metrics)

// Community Meal Library
saveMasterMealToLibrary(masterMealId)      // Add to personal library
removeMasterMealFromLibrary(masterMealId)  // Remove from library

// Calculations
calculateTotals(log)        // Returns calories, macros, TDEE, deficit
getProgressData()           // Chart data
getGoalProgress()           // Weight progress
```

---

## API Integration

### Groq (Free - Default)

**File:** `src/utils/groq.ts`

Model: `meta-llama/llama-4-scout-17b-16e-instruct`

Functions:
- `groqAnalyzeFood()` - Food recognition
- `groqFormatRecipeText()` - Format recipes
- `groqExtractInBodyData()` - InBody scan extraction
- `groqExtractHealthData()` - Apple Health extraction

### OpenAI (Paid)

**File:** `src/utils/openai.ts`

Model: `gpt-4o`

Same functions as Groq with higher accuracy.

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
1. InBody BMR (most accurate)
2. Apple Health Resting Energy
3. Falls back to target-based calculation

Weight projection: 7,700 cal = 1 kg

---

## Admin Setup

Set admin role in Supabase SQL Editor:
```sql
INSERT INTO user_profiles (user_id, email, role)
SELECT id, email, 'admin' FROM auth.users WHERE email = 'your-email@example.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
```

---

## Styling

**File:** `src/App.css`

| Color | Hex | Usage |
|-------|-----|-------|
| Primary | `#6366f1` | Buttons, links |
| Success | `#10b981` | Positive values |
| Warning | `#f59e0b` | Cautions |
| Danger | `#ef4444` | Errors, delete |
| Steps | `#8b5cf6` | Steps charts |

Mobile-first responsive design.

---

## PWA Features

- Installable on iOS/Android
- Offline support via service worker
- Custom app icons and splash screens
- Standalone mode (no browser UI)
