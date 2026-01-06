# CalorieTracker - App Structure & Features

## Overview

CalorieTracker is a personalized nutrition companion web app built with React + TypeScript. It helps users track daily calorie intake, monitor body composition through InBody scans, and visualize progress toward weight goals.

**Live URL:** https://calorie-tracker-self-five.vercel.app
**GitHub:** https://github.com/Parvj26/calorie-tracker

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| React 18 | UI Framework |
| TypeScript | Type Safety |
| Vite | Build Tool |
| Recharts | Data Visualization |
| date-fns | Date Manipulation |
| lucide-react | Icons |
| OpenAI GPT-4o | AI Image Analysis |
| localStorage | Data Persistence |
| Vercel | Hosting |

---

## Project Structure

```
calorie-tracker/
├── public/
│   ├── icons/                    # PWA icons (16px to 512px)
│   │   ├── icon-*.png           # App icons
│   │   ├── apple-touch-icon.png # iOS home screen icon
│   │   └── splash-*.png         # iOS splash screens
│   ├── manifest.json            # PWA manifest
│   └── sw.js                    # Service worker for offline caching
│
├── src/
│   ├── components/              # React components
│   │   ├── Dashboard.tsx        # Main dashboard view
│   │   ├── CircularProgress.tsx # Circular progress indicator
│   │   ├── MealLogger.tsx       # Meal selection & logging
│   │   ├── FoodScanner.tsx      # AI food photo scanner
│   │   ├── HealthScanner.tsx    # Apple Health screenshot importer
│   │   ├── InBodyUpload.tsx     # InBody scan uploader
│   │   ├── ProgressTracker.tsx  # Weight & progress charts
│   │   ├── WeeklySummary.tsx    # Weekly stats overview
│   │   └── Settings.tsx         # User settings
│   │
│   ├── hooks/
│   │   ├── useCalorieTracker.ts # Main state management hook
│   │   └── useLocalStorage.ts   # localStorage persistence hook
│   │
│   ├── utils/
│   │   └── openai.ts            # OpenAI API integration
│   │
│   ├── data/
│   │   └── defaultMeals.ts      # Pre-defined meals & default settings
│   │
│   ├── types/
│   │   └── index.ts             # TypeScript interfaces
│   │
│   ├── App.tsx                  # Main app component
│   ├── App.css                  # Global styles
│   ├── main.tsx                 # Entry point + SW registration
│   └── index.css                # Base styles
│
├── index.html                   # HTML template with PWA meta tags
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Features

### 1. Dashboard (Main View)

**File:** `src/components/Dashboard.tsx`

The central hub displaying:

- **Scan Food Button** - Primary CTA to open AI food scanner
- **Body Metrics Card** - Latest InBody data (weight, body fat %, muscle mass, SMM) with change indicators
- **Goal Progress Card** - Visual progress bar toward weight goal
- **Daily Progress** - Circular progress showing calories consumed vs target
- **Macros Card** - Protein, carbs, and fat breakdown with progress bars
- **Workout Card** - Manual calorie burn input + "Import from Health" button
- **Net Deficit Card** - Calculated calorie deficit (Target - Eaten + Burned)
- **Meal Logger** - Toggle meals on/off for the selected date

### 2. AI Food Scanner

**File:** `src/components/FoodScanner.tsx`

Powered by GPT-4 Vision:

- Take photo or upload image of food
- AI analyzes and identifies food items
- Extracts: name, calories, protein, carbs, fat, portion size
- Adjustable portion multiplier (0.5x to 3x)
- Two options:
  - **Log Once** - Add to today's log only
  - **Save & Log** - Save to meal library + log

### 3. Apple Health Import

**File:** `src/components/HealthScanner.tsx`

Import workout data from Apple Health screenshots:

- Upload screenshot of Activity rings or workout summary
- AI extracts: workout calories, steps, exercise minutes
- One-click "Add" button to import calories to workout field
- Displays extracted steps and exercise time (informational)

### 4. InBody Scan Upload

**File:** `src/components/InBodyUpload.tsx`

Process InBody composition scans:

- Upload photo of InBody scan results
- AI extracts: weight, body fat %, muscle mass, skeletal muscle mass, date
- Review and edit extracted values before saving
- **Auto-syncs weight to weigh-in tracking**
- View history of all uploaded scans

### 5. Progress Tracker

**File:** `src/components/ProgressTracker.tsx`

Visualize your journey:

- **Goal Progress** - Start weight → Current → Goal with percentage
- **Add Weigh-In** - Manual weight entry
- **Charts** (powered by Recharts):
  - Weight trend over time
  - Calorie intake vs target
  - Body composition changes (from InBody data)
- Weigh-in history list with delete option

### 6. Weekly Summary

**File:** `src/components/WeeklySummary.tsx`

At-a-glance weekly stats:

- Average daily calories
- Average daily deficit
- Weight change this week
- Estimated weeks to goal
- Progress overview with insights
- Motivational messages based on performance

### 7. Settings

**File:** `src/components/Settings.tsx`

Configurable options:

- **Calorie Target Range** - Min/max daily calories (default: 1600-1800)
- **Start Weight** - Initial weight for progress calculation
- **Goal Weight** - Target weight
- **OpenAI API Key** - Required for AI features
- **Export Data** - Download all data as JSON
- **Clear All Data** - Reset app to defaults

---

## Data Models

**File:** `src/types/index.ts`

```typescript
// Meal definition
interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  isCustom: boolean;
}

// Daily log entry
interface DailyLog {
  date: string;           // YYYY-MM-DD
  meals: string[];        // Array of meal IDs
  workoutCalories: number;
}

// InBody scan data
interface InBodyScan {
  id: string;
  date: string;
  weight: number;
  bodyFatPercent: number;
  muscleMass: number;
  skeletalMuscle: number;
}

// Weight tracking
interface WeighIn {
  date: string;
  weight: number;
}

// User preferences
interface UserSettings {
  dailyCalorieTargetMin: number;
  dailyCalorieTargetMax: number;
  startWeight: number;
  goalWeight: number;
  openAiApiKey?: string;
}
```

---

## State Management

**File:** `src/hooks/useCalorieTracker.ts`

Centralized state using custom hooks:

| State | Storage Key | Description |
|-------|-------------|-------------|
| meals | `calorie-tracker-meals` | All meal definitions |
| dailyLogs | `calorie-tracker-daily-logs` | Daily meal & workout logs |
| inBodyScans | `calorie-tracker-inbody` | InBody scan history |
| weighIns | `calorie-tracker-weighins` | Weight tracking entries |
| settings | `calorie-tracker-settings` | User preferences |

**Key Functions:**
- `getLogForDate(date)` - Get or create log for a date
- `toggleMealForDate(mealId, date)` - Add/remove meal from log
- `updateWorkoutCalories(calories, date)` - Set workout calories
- `addMeal(meal)` - Add new meal to library
- `logScannedMeal(meal, date)` - Add scanned meal + log it
- `addInBodyScan(scan)` - Save scan + auto-sync weight
- `calculateTotals(log)` - Compute calories, macros, deficit
- `getWeeklySummary()` - Aggregate weekly statistics
- `getProgressData()` - Data for charts
- `getGoalProgress()` - Progress toward weight goal

---

## PWA Features

**Files:** `public/manifest.json`, `public/sw.js`, `src/main.tsx`

Progressive Web App capabilities:

- **Installable** - Add to home screen on iOS/Android
- **Offline Support** - Service worker caches app shell
- **Custom Icons** - Branded app icon on home screen
- **Splash Screens** - Launch screens for all iOS devices
- **Standalone Mode** - Runs without browser UI

---

## Default Meals

**File:** `src/data/defaultMeals.ts`

Pre-configured meals:

| Meal | Calories | Protein | Carbs | Fat |
|------|----------|---------|-------|-----|
| Acai Bowl | 415 | 31g | 60g | 7g |
| Chicken Tikka | 400 | 60g | 8g | 14g |
| Protein Shake | 345 | 34g | 41g | 5g |

---

## API Integration

**File:** `src/utils/openai.ts`

OpenAI GPT-4 Vision API for:

1. **Food Recognition** (`analyzeFoodImage`)
   - Input: Food photo (base64)
   - Output: Food name, calories, protein, carbs, fat, portion estimate

2. **InBody Extraction** (`extractInBodyData`)
   - Input: InBody scan photo (base64)
   - Output: Weight, body fat %, muscle mass, skeletal muscle, date

3. **Health Data Extraction** (`extractHealthData`)
   - Input: Apple Health screenshot (base64)
   - Output: Steps, active calories, exercise minutes, workouts

---

## Styling

**File:** `src/App.css`

Design system:

- **Primary Color:** `#6366f1` (Indigo)
- **Success:** `#10b981` (Green)
- **Warning:** `#f59e0b` (Amber)
- **Danger:** `#ef4444` (Red)
- **Border Radius:** 12px
- **Font:** System UI stack

Mobile-first responsive design with breakpoints at 480px and 768px.

---

## Calorie Calculations

```
Target Calories = (Min + Max) / 2
Net Calories = Calories Eaten - Workout Calories
Deficit = Target Calories - Net Calories
Calories Remaining = Target - Eaten + Workout Burned
```

Weight loss projection assumes 7,700 calories = 1 kg.

---

## User Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      DASHBOARD                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Scan Food   │  │ Body Stats  │  │ Goal Progress│         │
│  │   (AI)      │  │ (InBody)    │  │             │         │
│  └──────┬──────┘  └─────────────┘  └─────────────┘         │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────────────────────────────────────────┐        │
│  │              DAILY PROGRESS                      │        │
│  │   Calories ●────────────○ 1200/1700             │        │
│  │                                                  │        │
│  │   Macros: P: 80g  C: 120g  F: 45g               │        │
│  └─────────────────────────────────────────────────┘        │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐                       │
│  │   Workout    │    │  Net Deficit │                       │
│  │  [Import]    │    │   +500 cal   │                       │
│  └──────────────┘    └──────────────┘                       │
│                                                              │
│  ┌─────────────────────────────────────────────────┐        │
│  │              MEAL LOGGER                         │        │
│  │  ☑ Acai Bowl        ☐ Chicken Tikka             │        │
│  │  ☑ Protein Shake    [+ Add Custom Meal]         │        │
│  └─────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘

Navigation: [Dashboard] [Progress] [InBody] [Summary] [Settings]
```

---

## Future Enhancement Ideas

- Barcode scanning for packaged foods
- Meal planning / scheduling
- Social sharing of progress
- Apple Watch integration (native app)
- Water intake tracking
- Micronutrient tracking
- Recipe import from URLs
- Multi-language support
