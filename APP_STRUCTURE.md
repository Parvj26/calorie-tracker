# CalorieTracker - App Structure & Features

## Overview

CalorieTracker is a comprehensive nutrition companion web app with cloud sync, AI-powered insights, and community features. Track daily calories and macros, import Apple Health data for accurate TDEE, monitor body composition via InBody scans, discover community-shared meals, and get personalized AI coaching.

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
| Groq API | AI (Free - Llama 4 Scout Vision, Llama 3.1 Text) |
| OpenAI GPT-4o | AI (Paid Alternative) |
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
│   │   ├── Dashboard.tsx         # Main dashboard with AI daily tips
│   │   ├── LogMeals.tsx          # Meal logging tab wrapper
│   │   ├── MealLogger.tsx        # Meal selection, editing & trash
│   │   ├── FoodScanner.tsx       # AI food scanner with added sugar
│   │   ├── RecipeModal.tsx       # Recipe viewer modal
│   │   ├── HealthScanner.tsx     # Apple Health importer
│   │   ├── InBodyUpload.tsx      # InBody scan uploader
│   │   ├── ProgressTracker.tsx   # Charts + monthly AI insights
│   │   ├── WeeklySummary.tsx     # Weekly stats + AI analysis
│   │   ├── Settings.tsx          # User settings & profile
│   │   ├── ProfileSetupModal.tsx # First-time profile setup
│   │   ├── CircularProgress.tsx  # Progress indicator component
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
│   │   ├── useMealSubmissions.ts # Submission workflow
│   │   └── useInsights.ts        # AI insights (daily/weekly/monthly)
│   │
│   ├── lib/
│   │   └── supabase.ts           # Supabase client config
│   │
│   ├── utils/
│   │   ├── openai.ts             # OpenAI API integration
│   │   ├── groq.ts               # Groq API + AI insights
│   │   └── nutritionGoals.ts     # Macro goal calculations
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
├── scripts/
│   └── add-added-sugar.sql       # Database migration for added sugar
│
├── supabase-schema.sql           # Database schema
├── APP_STRUCTURE.md              # This file
├── README.md                     # Quick start guide
├── package.json
└── vite.config.ts
```

---

## Features

### 1. User Authentication & Profile

**Files:** `src/components/Auth.tsx`, `src/components/ProfileSetupModal.tsx`, `src/hooks/useUserProfile.ts`

- Email/password signup and login (Supabase Auth)
- Session persistence
- First-time profile setup modal:
  - First name, last name
  - Date of birth
  - Gender (male/female/other/prefer-not-to-say)
- User roles: `user` | `admin`

### 2. Cloud Sync

**Files:** `src/hooks/useSupabaseSync.ts`, `src/lib/supabase.ts`

All data syncs to Supabase in real-time:
- Meals, daily logs, weigh-ins, InBody scans, settings
- Row-level security (each user sees only their data)
- Works offline with localStorage fallback
- Auto-purge of trashed meals after 30 days

### 3. Dashboard

**File:** `src/components/Dashboard.tsx`

**Core Display:**
- Date selector for navigating days
- Hero calorie ring (eaten vs target/TDEE)
- Macro pills (protein, carbs, fat, fiber, sugar with added sugar indicator)
- Clickable macros show meal-by-meal breakdown modal

**Quick Stats Grid:**
- Deficit/surplus card
- Activity/workout calories
- Goal progress percentage

**TDEE Display (when available):**
- Total Daily Energy Expenditure breakdown
- Resting + Active energy
- Steps and exercise minutes

**AI Daily Tips Card:**
- 2-3 personalized tips based on today's progress
- Remaining calories/macros summary
- Generate/refresh button
- 4-hour cache

**Actions:**
- Floating camera button for food scanning
- Health scanner for Apple Health import

### 4. Meal Management

**Files:** `src/components/MealLogger.tsx`, `src/components/LogMeals.tsx`

#### Meal Library
- Add custom meals with full macros (calories, protein, carbs, fat, fiber, sugar, added sugar)
- Edit existing meals (name, macros, recipe, serving size)
- Toggle favorite meals (starred)
- Filter: All, Favorites, Custom
- Search meals by name
- Community meals shown with badge
- **Logged meals sorted to top** of list

#### Meal Quantities
- Flexible quantity units: servings, grams (g), milliliters (ml), ounces (oz)
- Serving size configuration per meal
- Auto-calculation based on quantity × serving multiplier

#### Recipes
- Single text box for recipes/ingredients
- AI formats into structured sections (Base, Toppings, Dressing, etc.)
- Recipe modal with per-section nutrition breakdown

#### Trash / Recycle Bin
- Soft delete meals (30-day retention)
- Restore deleted meals
- Permanently delete meals
- Days until auto-deletion indicator

#### Edit Meal Modal
- Opens as modal overlay (not inline)
- Labeled input fields for all macros
- Proper mobile-friendly layout

### 5. Food Scanner (AI-Powered)

**File:** `src/components/FoodScanner.tsx`

- Photo capture or upload
- AI identifies food + estimates nutrition
- **Multi-item detection** per image
- Confidence indicator (high/medium/low)
- Portion multiplier (0.5x - 2x)
- **Added sugar tracking** (distinguishes from natural sugars)
- "Log Once" or "Save & Log" options
- Optional recipe generation

### 6. Discover (Community Meals)

**Files:** `src/components/Discover/`

Browse and share meals with the community:

#### For All Users
- Browse approved community meals
- Search master meal library
- **Add to Library** - saves community meal to personal library
- Saved meals appear in Dashboard for easy daily logging
- Remove meals from library (historical logs preserved)
- View recipe on meals with recipes
- Submit personal meals for admin review
- View submission status (pending/approved/rejected)
- Cancel pending submissions
- **Search when selecting meals to submit**

#### Community Meal Flow
1. Browse Discover tab → Click "Add to Library"
2. Meal appears in Dashboard/Log meal list (with Community badge)
3. Toggle on/off for any day, adjust quantity
4. Remove from library via X button (historical logs preserved)

#### For Admins
- Admin panel to review pending submissions
- Approve meals → adds to master library
- Reject meals with reason
- Delete meals from community library
- Usage count tracking

### 7. AI Insights

**Files:** `src/hooks/useInsights.ts`, `src/utils/groq.ts`

Three levels of AI-powered coaching:

#### Daily Insights (Dashboard)
- 2-3 quick, actionable tips based on today's progress
- Remaining calories/macros summary
- Example: "Protein is low - add chicken or Greek yogurt to dinner"
- 4-hour cache, manual refresh

#### Weekly Insights (Summary Tab)
- Week overview summary
- Pattern detection (e.g., "lighter eating on weekends")
- Wins/achievements
- Actionable suggestions
- 24-hour cache

#### Monthly Insights (Progress Tab)
- Month summary
- Goal prediction ("At this pace, reach goal by March")
- Long-term trends
- Comparison to expected progress
- 24-hour cache

**Token Usage:** ~1,600 tokens/day total (well within Groq free tier)

### 8. Apple Health Import

**File:** `src/components/HealthScanner.tsx`

Extracts from screenshots:
- Resting Energy (BMR)
- Active Energy (Move calories)
- Steps, Exercise minutes, Stand hours
- Walking/running distance
- Flights climbed
- Workout details (type, duration, calories)

Calculates:
```
TDEE = Resting Energy + Active Energy
True Deficit = TDEE - Calories Eaten
```

### 9. InBody Scan Upload

**File:** `src/components/InBodyUpload.tsx`

- Upload InBody scan photos
- AI extracts comprehensive metrics:

| Tier | Metrics |
|------|---------|
| Basic | weight, body fat %, muscle mass, skeletal muscle |
| Tier 1 (Critical) | BMR, fat mass, visceral fat grade |
| Tier 2 (Valuable) | water weight, trunk fat, body age, protein mass, bone mass |

- Visceral fat health indicator (green/yellow/red zones)
- Auto-syncs weight to weigh-in tracking
- BMR improves TDEE calculations
- View/delete scan history
- Image storage for reference

### 10. Progress Tracker

**File:** `src/components/ProgressTracker.tsx`

**Seven Chart Tabs:**
| Tab | Description |
|-----|-------------|
| Weight | Trend line with goal reference |
| Calories | Daily intake over 30 days |
| Steps | Daily steps with 10k goal line |
| Body Comp | Body fat % and skeletal muscle trends |
| Fat vs Muscle | Fat mass vs muscle mass comparison |
| BMR | Basal metabolic rate trend |
| Visceral Fat | Visceral fat grade with health risk zones |

**Steps Stats:**
- Current streak (days hitting 10k+)
- Daily average
- Personal best
- Total steps

**Also includes:**
- Goal progress card with visual bar
- Monthly AI insights card
- Manual weigh-in entry
- Weigh-in history with delete

### 11. Weekly Summary

**File:** `src/components/WeeklySummary.tsx`

**Stats Cards:**
- Average daily calories
- Average deficit
- Weight change (week)
- Projected weeks to goal

**Journey Overview:**
- Start → Current → Goal weight visualization
- Progress bar with kg lost/remaining

**Quick Insights:**
- Auto-generated based on data patterns
- Deficit status, weight trends, logging consistency

**AI Weekly Analysis:**
- Summary, patterns, wins, suggestions
- Generate/refresh button
- 24-hour cache

### 12. Settings

**File:** `src/components/Settings.tsx`

**Profile Section:**
- First name, last name
- Date of birth, gender
- Save profile button

**Calorie Targets:**
- Daily calorie range (min/max)

**Weight Goals:**
- Start weight, goal weight
- Start date

**Daily Nutrition Goals (Auto-calculated):**
- Protein (based on weight × activity level)
- Carbs (50% of calories)
- Fat (30% of calories)
- Fiber (14g per 1000 cal)
- Sugar limit (36g men / 25g women)

**AI Provider:**
- Groq (free - default)
- OpenAI (paid)
- API key management

**Data Management:**
- Export data (JSON)
- Clear all data

---

## Navigation Tabs

| Tab | Icon | Description |
|-----|------|-------------|
| Dashboard | LayoutDashboard | Daily tracking, AI tips, food scanner |
| Log | Utensils | Meal library, editing, trash |
| Discover | Globe | Community meals, submissions |
| Progress | TrendingUp | Charts, weigh-ins, monthly AI |
| InBody | ScanLine | Body composition scans |
| Summary | Calendar | Weekly stats, AI analysis |
| Settings | Settings | Profile, goals, configuration |

---

## Data Models

**File:** `src/types/index.ts`

### Core Interfaces

```typescript
// Macros (shared across meals)
interface Macros {
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  addedSugar: number;  // NEW: Added sugar tracking
}

// Quantity units for flexible meal logging
type QuantityUnit = 'serving' | 'g' | 'ml' | 'oz';

// Meal entry with quantity
interface MealLogEntry {
  mealId: string;
  quantity: number;  // 1 = 1 serving, or grams if unit='g'
  unit?: QuantityUnit;
}

// Meals
interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  addedSugar?: number;
  isCustom: boolean;
  favorite?: boolean;
  recipe?: Recipe;
  deletedAt?: string;  // Soft delete timestamp
  servingSize?: number;
  servingSizeUnit?: 'g' | 'ml' | 'oz';
}

// Daily Logs
interface DailyLog {
  date: string;  // YYYY-MM-DD
  meals: (string | MealLogEntry)[];  // Backward compatible
  masterMealIds?: (string | MasterMealLogEntry)[];
  workoutCalories: number;
  healthMetrics?: HealthMetrics;
  notes?: string;
}

// Health Metrics (from Apple Health)
interface HealthMetrics {
  restingEnergy: number;
  activeEnergy: number;
  steps: number;
  exerciseMinutes: number;
  standHours?: number;
}

// InBody Scans (enhanced metrics)
interface InBodyScan {
  id: string;
  date: string;
  weight: number;
  bodyFatPercent: number;
  muscleMass: number;
  skeletalMuscle: number;
  // Tier 1 - Critical
  bmr?: number;
  fatMass?: number;
  visceralFatGrade?: number;
  // Tier 2 - Valuable
  waterWeight?: number;
  trunkFatMass?: number;
  bodyAge?: number;
  proteinMass?: number;
  boneMass?: number;
  imageData?: string;
}

// User Settings
interface UserSettings {
  dailyCalorieTargetMin: number;
  dailyCalorieTargetMax: number;
  startWeight: number;
  goalWeight: number;
  startDate: string;
  aiProvider: 'openai' | 'groq';
  openAiApiKey?: string;
  groqApiKey?: string;
  savedMasterMealIds?: string[];
}

// User Profile
interface UserProfile {
  id: string;
  userId: string;
  email?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  role: 'user' | 'admin';
}
```

### AI Insights Interfaces

```typescript
interface DailyInsights {
  tips: string[];        // 2-3 quick tips
  remaining: string;     // Calories/macros summary
  generatedAt: string;
}

interface WeeklyInsights {
  summary: string;       // 2-3 sentence overview
  patterns: string[];    // Detected patterns
  wins: string[];        // Achievements
  suggestions: string[]; // Actionable tips
  generatedAt: string;
}

interface MonthlyInsights {
  summary: string;       // Month overview
  trends: string[];      // Long-term trends
  goalPrediction: string; // When user will reach goal
  comparison: string;    // vs expected progress
  generatedAt: string;
}
```

### Community Feature Interfaces

```typescript
interface MasterMeal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  addedSugar?: number;
  recipe?: Recipe;
  status: 'approved' | 'archived';
  submittedBy?: string;
  submittedByName?: string;
  usageCount: number;
  servingSize?: number;
  servingSizeUnit?: 'g' | 'ml' | 'oz';
}

interface MealSubmission {
  id: string;
  sourceMealId?: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  addedSugar?: number;
  recipe?: Recipe;
  submittedBy: string;
  submittedByEmail?: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  masterMealId?: string;
}
```

---

## Hooks

| Hook | Purpose |
|------|---------|
| `useCalorieTracker` | Main state, CRUD operations, calculations, sync |
| `useSupabaseSync` | Cloud sync with Supabase |
| `useLocalStorage` | Persistent local storage |
| `useUserProfile` | User profile & admin check |
| `useMasterMeals` | Load/search community meals |
| `useMealSubmissions` | Submit/approve/reject workflow |
| `useInsights` | AI insights (daily/weekly/monthly) |

### Key Functions (useCalorieTracker)

```typescript
// Meals
addMeal(meal)
updateMeal(id, updates)
deleteMeal(id)              // Soft delete → trash
restoreMeal(id)             // Restore from trash
permanentlyDeleteMeal(id)   // Hard delete
toggleFavorite(id)
logScannedMeal(meal, date)  // Log without saving
saveAndLogMeal(meal, date)  // Save to library + log

// Daily Logging
toggleMealForDate(mealId, date)
updateMealQuantity(mealId, date, quantity, unit)
addMasterMealToLog(masterMealId, date)
removeMasterMealFromLog(masterMealId, date)
updateMasterMealQuantity(masterMealId, date, quantity, unit)
updateWorkoutCalories(calories, date)
updateHealthMetrics(metrics, date)

// Quantity Helpers
getMealId(entry) / getMealQuantity(entry) / getMealUnit(entry)
getMasterMealId(entry) / getMasterMealQuantity(entry) / getMasterMealUnit(entry)
getServingMultiplier(quantity, unit, servingSize)

// Community Meal Library
saveMasterMealToLibrary(masterMealId)
removeMasterMealFromLibrary(masterMealId)

// Calculations
calculateTotals(log)   // Returns all macros, TDEE, deficit, etc.
getProgressData()      // 30-day chart data
getGoalProgress()      // Weight progress
getWeeklySummary()     // Weekly stats
```

### Key Functions (useInsights)

```typescript
// Returns object with:
{
  hasApiKey: boolean,
  daily: {
    insights: DailyInsights | null,
    loading: boolean,
    error: string | null,
    generate: (forceRefresh?) => void
  },
  weekly: { /* same structure */ },
  monthly: { /* same structure */ }
}
```

---

## API Integration

### Groq (Free - Default)

**File:** `src/utils/groq.ts`

| Model | Purpose |
|-------|---------|
| `meta-llama/llama-4-scout-17b-16e-instruct` | Vision (food, InBody, health) |
| `llama-3.1-8b-instant` | Text (recipes, insights) |

**Functions:**
- `groqAnalyzeFood()` - Food recognition + added sugar
- `groqFormatRecipeText()` - Recipe parsing
- `groqExtractInBodyData()` - InBody scan extraction
- `groqExtractHealthData()` - Apple Health extraction
- `generateDailyInsights()` - Daily AI tips
- `generateWeeklyInsights()` - Weekly analysis
- `generateMonthlyInsights()` - Monthly predictions

### OpenAI (Paid)

**File:** `src/utils/openai.ts`

Model: `gpt-4o`

Same functions as Groq with higher accuracy for image analysis.

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

**Weight projection:** 7,700 cal = 1 kg

---

## Nutrition Goal Calculations

**File:** `src/utils/nutritionGoals.ts`

| Macro | Formula |
|-------|---------|
| Protein | Weight (kg) × multiplier (0.8-1.6 based on activity) |
| Carbs | 50% of daily calories ÷ 4 |
| Fat | 30% of daily calories ÷ 9 |
| Fiber | 14g per 1,000 calories |
| Sugar | 36g (men) / 25g (women) - AHA limits |

**Activity Level Multipliers:**
- Sedentary: 0.8g/kg
- Light: 1.0g/kg
- Moderate: 1.2g/kg
- Active: 1.4g/kg
- Very Active: 1.6g/kg

---

## Database Schema

**File:** `supabase-schema.sql`

### Core Tables

| Table | Purpose |
|-------|---------|
| `meals` | User's meal library (with soft delete, added_sugar) |
| `daily_logs` | Daily logs with health metrics |
| `weigh_ins` | Weight entries |
| `inbody_scans` | Body composition scans (enhanced metrics) |
| `user_settings` | User preferences |

### Community Feature Tables

| Table | Purpose |
|-------|---------|
| `user_profiles` | User roles, personal info |
| `master_meals` | Approved community meals |
| `meal_submissions` | Pending meal submissions |

### Key Columns

```sql
-- meals table
deleted_at TIMESTAMPTZ     -- Soft delete
favorite BOOLEAN           -- Starred meals
recipe JSONB               -- Structured recipe
serving_size REAL          -- Grams per serving
added_sugar REAL           -- Added sugar (not natural)

-- daily_logs table
meal_ids JSONB             -- User meals with quantities
master_meal_ids JSONB      -- Community meals with quantities
health_metrics JSONB       -- Apple Health data

-- user_profiles table
role TEXT                  -- 'user' or 'admin'
first_name TEXT
last_name TEXT
date_of_birth DATE
gender TEXT

-- inbody_scans table (enhanced)
bmr REAL
fat_mass REAL
visceral_fat_grade INTEGER
water_weight REAL
trunk_fat_mass REAL
body_age INTEGER
protein_mass REAL
bone_mass REAL
```

All tables have Row Level Security (RLS) enabled.

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

| Color Variable | Hex | Usage |
|----------------|-----|-------|
| `--primary` | `#6366f1` | Buttons, links, active states |
| `--success` | `#10b981` | Positive values, wins |
| `--warning` | `#f59e0b` | Cautions, warnings |
| `--danger` | `#ef4444` | Errors, delete, over limits |
| `--protein-color` | `#8b5cf6` | Protein macros |
| `--carbs-color` | `#f59e0b` | Carbs macros |
| `--fat-color` | `#ec4899` | Fat macros |
| `--fiber-color` | `#10b981` | Fiber macros |
| `--sugar-color` | `#f97316` | Sugar macros |

**Responsive breakpoints:** Mobile-first design with 480px, 768px breakpoints.

---

## PWA Features

- Installable on iOS/Android
- Offline support via service worker
- Custom app icons and splash screens
- Standalone mode (no browser UI)

---

## Recent Features Added

| Feature | Description |
|---------|-------------|
| Added Sugar Tracking | Distinguishes natural vs added sugars in food scanning and display |
| AI Daily/Weekly/Monthly Insights | Personalized coaching based on user data |
| Flexible Quantity Units | Log meals in servings, grams, ml, or oz |
| Profile Setup Modal | First-time user onboarding |
| Edit Meal Modal | Improved UX with modal instead of inline editing |
| Logged Meals at Top | Recently logged meals sorted first |
| Search in Submission Modal | Find meals when submitting to community |
| Responsive Form Layouts | Fixed mobile layout issues |

---

## Caching Strategy

| Data | Storage | TTL |
|------|---------|-----|
| Daily Insights | localStorage | 4 hours |
| Weekly Insights | localStorage | 24 hours |
| Monthly Insights | localStorage | 24 hours |
| All user data | Supabase + localStorage | Real-time sync |

---

*Last Updated: January 2025*
