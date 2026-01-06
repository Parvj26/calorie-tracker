# CalorieTracker - App Structure & Features

## Overview

CalorieTracker is a personalized nutrition companion web app built with React + TypeScript. It helps users track daily calorie intake, monitor body composition through InBody scans, import Apple Health data for accurate TDEE calculations, and visualize progress toward weight goals.

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
| Groq API | AI Image Analysis (Free - Default) |
| OpenAI GPT-4o | AI Image Analysis (Paid - Optional) |
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
│   │   ├── openai.ts            # OpenAI API integration
│   │   └── groq.ts              # Groq API integration (Llama 3.2 Vision)
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

- **Date Selector** - Navigate between days with left/right arrows (at top)
- **Scan Food Button** - Primary CTA to open AI food scanner
- **TDEE Card** - Shows Total Daily Energy Expenditure when health data imported:
  - Total burn (Resting + Active calories)
  - Steps count
  - Exercise minutes
- **Body Metrics Card** - Latest InBody data (weight, body fat %, muscle mass, SMM) with change indicators
- **Goal Progress Card** - Visual progress bar toward weight goal
- **Daily Progress** - Circular progress showing calories consumed vs TDEE (or target)
- **Macros Card** - Protein, carbs, and fat breakdown with progress bars
- **Activity Card** - Shows active calories when health data imported, or manual workout input
- **True Deficit Card** - Calculated deficit based on actual TDEE (or estimated if no health data)
- **Meal Logger** - Toggle meals on/off for the selected date

### 2. AI Food Scanner

**File:** `src/components/FoodScanner.tsx`

Powered by Groq (Llama 3.2 Vision) or OpenAI GPT-4o:

- Take photo or upload image of food
- AI analyzes and identifies food items
- Extracts: name, calories, protein, carbs, fat, portion size
- Confidence indicator (high/medium/low)
- Adjustable portion multiplier (0.5x to 2x)
- Two options:
  - **Log Once** - Add to today's log only
  - **Save & Log** - Save to meal library + log

### 3. Apple Health Import (TDEE Tracking)

**File:** `src/components/HealthScanner.tsx`

Import comprehensive health data from Apple Health screenshots:

- **Data Extracted:**
  - Resting Energy (BMR) - calories burned at rest
  - Active Energy (Move calories) - calories burned through activity
  - Steps count
  - Exercise minutes
  - Stand hours

- **TDEE Calculation:**
  ```
  TDEE = Resting Energy + Active Energy
  Example: 1,761 + 622 = 2,383 calories
  ```

- **True Deficit:**
  ```
  True Deficit = TDEE - Calories Eaten
  Example: 2,383 - 1,700 = 683 calorie deficit
  ```

- One-click "Import All Data" button
- Shows TDEE summary card with breakdown
- Data saved per day for historical tracking

### 4. InBody Scan Upload

**File:** `src/components/InBodyUpload.tsx`

Process InBody composition scans:

- Upload photo of InBody scan results
- AI extracts: weight, body fat %, muscle mass, skeletal muscle mass, date
- Supports both Groq (free) and OpenAI providers
- Review and edit extracted values before saving
- **Auto-syncs weight to weigh-in tracking**
- View history of all uploaded scans
- Delete scans with trash icon

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

- **AI Provider Selection:**
  - **Groq** (Free) - Default, uses Llama 4 Scout Vision
  - **OpenAI** (Paid) - Uses GPT-4o
- **Calorie Target Range** - Min/max daily calories (default: 1600-1800)
- **Start Weight** - Initial weight for progress calculation
- **Goal Weight** - Target weight
- **Start Date** - When you began tracking
- **API Keys** - Groq or OpenAI key based on selected provider
- **Export Data** - Download all data as JSON
- **Clear All Data** - Reset app to defaults

---

## Data Models

**File:** `src/types/index.ts`

```typescript
// AI Provider type
type AIProvider = 'openai' | 'groq';

// Health metrics from Apple Health
interface HealthMetrics {
  restingEnergy: number;    // BMR - calories burned at rest
  activeEnergy: number;     // Move calories - calories burned through activity
  steps: number;
  exerciseMinutes: number;
  standHours?: number;
}

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
  date: string;              // YYYY-MM-DD
  meals: string[];           // Array of meal IDs
  workoutCalories: number;   // Manual entry (fallback)
  healthMetrics?: HealthMetrics; // From Apple Health import
}

// InBody scan data
interface InBodyScan {
  id: string;
  date: string;
  weight: number;
  bodyFatPercent: number;
  muscleMass: number;
  skeletalMuscle: number;
  imageData?: string;        // base64 encoded image
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
  startDate: string;
  aiProvider: AIProvider;
  openAiApiKey?: string;
  groqApiKey?: string;
}
```

---

## State Management

**File:** `src/hooks/useCalorieTracker.ts`

Centralized state using custom hooks:

| State | Storage Key | Description |
|-------|-------------|-------------|
| meals | `calorie-tracker-meals` | All meal definitions |
| dailyLogs | `calorie-tracker-daily-logs` | Daily meal, workout & health logs |
| inBodyScans | `calorie-tracker-inbody` | InBody scan history |
| weighIns | `calorie-tracker-weighins` | Weight tracking entries |
| settings | `calorie-tracker-settings` | User preferences |

**Key Functions:**
- `getLogForDate(date)` - Get or create log for a date
- `toggleMealForDate(mealId, date)` - Add/remove meal from log
- `updateWorkoutCalories(calories, date)` - Set workout calories
- `updateHealthMetrics(metrics, date)` - Save Apple Health data for a date
- `addMeal(meal)` - Add new meal to library
- `logScannedMeal(meal, date)` - Add scanned meal + log it
- `addInBodyScan(scan)` - Save scan + auto-sync weight
- `calculateTotals(log)` - Compute calories, macros, TDEE, deficit
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

### Groq API (Free - Default)

**File:** `src/utils/groq.ts`

Uses Llama 4 Scout Vision model (`meta-llama/llama-4-scout-17b-16e-instruct`):

1. **Food Recognition** (`groqAnalyzeFood`)
   - Input: Food photo (base64)
   - Output: Food name, calories, protein, carbs, fat, portion estimate, confidence

2. **InBody Extraction** (`groqExtractInBodyData`)
   - Input: InBody scan photo (base64)
   - Output: Weight, body fat %, muscle mass, skeletal muscle, date

3. **Health Data Extraction** (`groqExtractHealthData`)
   - Input: Apple Health screenshot (base64)
   - Output: Resting energy, active energy, steps, exercise minutes, stand hours

### OpenAI API (Paid - Optional)

**File:** `src/utils/openai.ts`

Uses GPT-4o Vision model:

1. **Food Recognition** - Same as Groq
2. **InBody Extraction** (`extractInBodyData`) - Same as Groq
3. **Health Data Extraction** (`extractHealthData`) - Same as Groq

---

## Styling

**File:** `src/App.css`

Design system:

- **Primary Color:** `#6366f1` (Indigo)
- **Success:** `#10b981` (Green)
- **Warning:** `#f59e0b` (Amber)
- **Danger:** `#ef4444` (Red)
- **TDEE Gradient:** `#667eea → #764ba2` (Purple)
- **Border Radius:** 12px
- **Font:** System UI stack

Mobile-first responsive design with breakpoints at 480px and 768px.

---

## Calorie Calculations

### Without Health Data (Estimated)
```
Target Calories = (Min + Max) / 2
Net Calories = Calories Eaten - Workout Calories
Deficit = Target Calories - Net Calories
Calories Remaining = Target - Eaten + Workout Burned
```

### With Health Data (Accurate TDEE)
```
TDEE = Resting Energy + Active Energy
True Deficit = TDEE - Calories Eaten
Calories Remaining = TDEE - Calories Eaten
```

Weight loss projection assumes 7,700 calories = 1 kg.

---

## User Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      DASHBOARD                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  ◀  Today - January 5, 2026                      ▶  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  📷  Scan Your Food - AI-powered calorie detection  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  ⚡ TODAY'S ENERGY (TDEE)          2,383 cal        │    │
│  │     Resting: 1,761  +  Active: 622                  │    │
│  │     🚶 6,948 steps   ⏱️ 66 min exercise             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Body Stats  │  │ Goal        │  │ Daily       │         │
│  │ 78kg  22%   │  │ 78→72 kg   │  │ Progress    │         │
│  │ (InBody)    │  │ 67% done    │  │ ○ 1200/2383 │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐                       │
│  │   Activity   │    │ True Deficit │                       │
│  │   622 cal    │    │  +1,183 cal  │                       │
│  │ [Update]     │    │ TDEE - Eaten │                       │
│  └──────────────┘    └──────────────┘                       │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              MEAL LOGGER                             │    │
│  │  ☑ Acai Bowl        ☐ Chicken Tikka                 │    │
│  │  ☑ Protein Shake    [+ Add Custom Meal]             │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘

Navigation: [Dashboard] [Progress] [InBody] [Summary] [Settings]
```

---

## Getting Started

1. **Set up API Key:**
   - Go to Settings
   - Select AI Provider (Groq recommended - it's free)
   - Get your free Groq API key from https://console.groq.com/keys
   - Paste the key and save

2. **Import Health Data:**
   - Take a screenshot of your Apple Health summary
   - On Dashboard, click "Import from Health"
   - Upload the screenshot
   - Click "Import All Data"

3. **Scan Food:**
   - Click "Scan Your Food"
   - Take a photo or upload an image
   - Adjust portion if needed
   - Click "Log Once" or "Save & Log"

4. **Track Progress:**
   - Add InBody scans for body composition tracking
   - Weight auto-syncs to Progress tab
   - View weekly summaries for insights

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
- Activity trends over time (steps, exercise)
- Weekly/monthly TDEE averages
