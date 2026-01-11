# CalorieTracker - Complete Technical Documentation

> **Last Updated:** January 2026
> **Live URL:** https://calorie-tracker-self-five.vercel.app
> **Repository:** https://github.com/Parvj26/calorie-tracker

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Database Schema](#database-schema)
5. [Authentication System](#authentication-system)
6. [Components Reference](#components-reference)
7. [Hooks Reference](#hooks-reference)
8. [Context Providers](#context-providers)
9. [Type Definitions](#type-definitions)
10. [Utility Functions](#utility-functions)
11. [Features & User Flows](#features--user-flows)
12. [API Integrations](#api-integrations)
13. [Calculations & Formulas](#calculations--formulas)
14. [Testing](#testing)
15. [CI/CD Pipeline](#cicd-pipeline)
16. [Scripts & Utilities](#scripts--utilities)
17. [Deployment](#deployment)
18. [Admin & Coach Setup](#admin--coach-setup)

---

## Overview

CalorieTracker is a comprehensive nutrition and fitness tracking Progressive Web App (PWA) featuring:

- **Meal Logging** - Custom meals with flexible quantities (servings, grams, ml, oz)
- **AI Food Scanning** - Camera-based food recognition with macro extraction
- **Body Composition Tracking** - InBody scan import with advanced metrics
- **Apple Health Integration** - Screenshot-based health data import
- **Goal-Based Calorie Targeting** - BMR calculations with multiple formula support
- **Community Meal Library** - Shared meals with admin approval workflow
- **Coach-Client System** - Fitness professionals can monitor client progress
- **Progress Visualization** - Weight trends, body composition charts, step tracking

---

## Tech Stack

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| **Frontend** | React | 19.2.0 | UI Framework |
| **Language** | TypeScript | 5.9.3 | Type Safety |
| **Build Tool** | Vite | 7.2.4 | Fast Development & Bundling |
| **Backend/DB** | Supabase | 2.89.0 | Auth, PostgreSQL, RLS |
| **Charts** | Recharts | 3.6.0 | Data Visualization |
| **Icons** | Lucide React | 0.562.0 | Icon Library |
| **Dates** | date-fns | 4.1.0 | Date Manipulation |
| **IDs** | uuid | 13.0.0 | Unique ID Generation |
| **AI (Free)** | Groq API | - | Llama 4 Scout Vision |
| **AI (Paid)** | OpenAI API | - | GPT-4o Vision |
| **Unit Testing** | Vitest | 4.0.16 | Fast Unit Test Framework |
| **Component Testing** | Testing Library | 16.3.1 | React Component Testing |
| **E2E Testing** | Playwright | 1.57.0 | Browser Automation Testing |
| **Linting** | ESLint | 9.39.1 | Code Quality & Standards |
| **Hosting** | Vercel | - | Deployment Platform |
| **CI/CD** | GitHub Actions | - | Automated Testing & Deployment |

---

## Project Structure

```
calorie-tracker/
├── public/                          # Static assets
│   ├── icons/                       # PWA icons (multiple sizes)
│   ├── manifest.json                # PWA manifest
│   └── sw.js                        # Service worker
│
├── src/
│   ├── main.tsx                     # React entry point
│   ├── App.tsx                      # Root component, authentication flow
│   ├── App.css                      # Main stylesheet (~160KB)
│   ├── index.css                    # CSS variables & global styles
│   │
│   ├── components/                  # React UI Components
│   │   ├── AuthenticatedApp.tsx     # Authenticated user interface (lazy loads tabs)
│   │   ├── Auth.tsx                 # Sign in/up forms
│   │   ├── Dashboard.tsx            # Daily nutrition overview
│   │   ├── LogMeals.tsx             # Meal browsing tab wrapper
│   │   ├── MealLogger.tsx           # Meal selection & editing
│   │   ├── Settings.tsx             # User preferences
│   │   ├── ProgressTracker.tsx      # Charts & weigh-ins (lazy loaded)
│   │   ├── InBodyUpload.tsx         # Body scan import
│   │   ├── FoodScanner.tsx          # AI food recognition
│   │   ├── HealthScanner.tsx        # Apple Health import
│   │   ├── ProfileSetupModal.tsx    # First-time user onboarding
│   │   ├── RecipeModal.tsx          # Recipe detail viewer
│   │   ├── LandingPage.tsx          # Marketing/welcome page
│   │   ├── ErrorBoundary.tsx        # Error catching wrapper
│   │   ├── CircularProgress.tsx     # Macro ring visualization
│   │   ├── ResetPassword.tsx        # Password recovery flow
│   │   ├── WeeklySummary.tsx        # 7-day aggregated stats
│   │   │
│   │   ├── Coach/                   # Coach Feature Components
│   │   │   ├── CoachDashboard.tsx   # Client list & alerts
│   │   │   ├── CoachSignUp.tsx      # Coach registration
│   │   │   ├── ClientDetailView.tsx # Individual client data
│   │   │   ├── ConnectToCoach.tsx   # Client connection interface
│   │   │   └── useCoachCode.ts      # Coach code lookup hook
│   │   │
│   │   ├── Discover/                # Community Meals Feature
│   │   │   ├── DiscoverTab.tsx      # Master meal browser
│   │   │   ├── MasterMealCard.tsx   # Community meal card
│   │   │   ├── SubmitMealModal.tsx  # Meal submission form
│   │   │   └── MySubmissionsPanel.tsx # User submissions tracker
│   │   │
│   │   └── Admin/                   # Admin-Only Components
│   │       └── AdminPanel.tsx       # Submission review interface
│   │
│   ├── hooks/                       # Custom React Hooks
│   │   ├── useCalorieTracker.ts     # Core app state management (~1200 lines)
│   │   ├── useSupabaseSync.ts       # DB synchronization
│   │   ├── useUserProfile.ts        # User identity & roles
│   │   ├── useMasterMeals.ts        # Community meals
│   │   ├── useMealSubmissions.ts    # Submission workflow
│   │   ├── useCoachClients.ts       # Coach client management
│   │   ├── useCoachCode.ts          # Coach code lookup & connection
│   │   ├── useLocalStorage.ts       # Browser persistence
│   │   ├── useActivityRecommendation.ts # Activity analysis
│   │   └── useInsights.ts           # AI insights (disabled)
│   │
│   ├── contexts/                    # React Context Providers
│   │   └── AuthContext.tsx          # Authentication state
│   │
│   ├── lib/                         # Third-Party Integrations
│   │   └── supabase.ts              # Supabase client initialization
│   │
│   ├── utils/                       # Utility Functions
│   │   ├── bmrCalculation.ts        # BMR & TDEE formulas
│   │   ├── nutritionGoals.ts        # Macro goal calculations
│   │   ├── bodyIntelligence.ts      # Weight loss quality analysis
│   │   ├── encryption.ts            # AES-256 API key encryption
│   │   ├── groq.ts                  # Groq AI integration
│   │   ├── openai.ts                # OpenAI integration
│   │   ├── appleHealthTdee.ts       # TDEE from health data
│   │   ├── weightConversion.ts      # kg/lbs utilities
│   │   └── activityRecommendation.ts # Activity level analysis
│   │
│   ├── types/                       # TypeScript Definitions
│   │   └── index.ts                 # All type exports (~315 lines)
│   │
│   ├── data/                        # Seed Data
│   │   └── defaultMeals.ts          # Example meals with recipes
│   │
│   ├── test/                        # Test Infrastructure
│   │   ├── setup.ts                 # Vitest global setup (mocks)
│   │   └── testUtils.tsx            # Test utilities & factories
│   │
│   └── __tests__/                   # Unit & Integration Tests
│       ├── auth.test.ts             # Authentication tests
│       ├── calculations.test.ts     # BMR/TDEE/macro calculations
│       ├── servingMultiplier.test.ts # Quantity unit conversions
│       ├── weightTracking.test.ts   # Weigh-in management
│       ├── nutritionGoals.test.ts   # Nutrition goal calculations
│       ├── settings.test.ts         # Settings & target date tests
│       ├── mealManagement.test.ts   # CRUD, soft delete, favorites
│       ├── dailyLogging.test.ts     # Daily log operations
│       ├── inBodyScans.test.ts      # Body composition tests
│       ├── bodyIntelligence.test.ts # Response score, metabolic status
│       ├── healthDataImport.test.ts # Apple Health import tests
│       ├── foodScanner.test.ts      # AI food detection tests
│       ├── dashboard.test.ts        # Dashboard component tests
│       ├── discover.test.ts         # Community meals tests
│       ├── coach.test.ts            # Coach-client tests
│       ├── weightConversion.test.ts # kg/lbs conversion tests
│       ├── apiMocks.test.ts         # API mocking tests
│       ├── supabaseIntegration.test.ts # Database sync tests
│       └── useCalorieTracker.test.ts # Core hook tests
│
├── e2e/                             # End-to-End Tests
│   └── app.spec.ts                  # Playwright E2E tests (~500 lines)
│
├── scripts/                         # Utility Scripts
│   ├── seed-demo-user.ts            # Seed demo user data
│   └── seed-demo-coach.ts           # Seed demo coach data
│
├── supabase/                        # Supabase Configuration
│   └── config.toml                  # Local dev settings
│
├── .github/                         # GitHub Configuration
│   └── workflows/
│       └── tests.yml                # CI/CD workflow (3 jobs)
│
├── dist/                            # Build Output
├── .vercel/                         # Vercel Config
│
├── supabase-schema.sql              # Database schema
├── APP_STRUCTURE.md                 # This documentation
├── README.md                        # Quick start guide
├── package.json                     # Dependencies & scripts
├── tsconfig.json                    # TypeScript config
├── vite.config.ts                   # Vite build config
├── vitest.config.ts                 # Vitest test config
├── playwright.config.ts             # Playwright E2E config
└── eslint.config.js                 # ESLint config
```

---

## Database Schema

### Tables Overview

| Table | Purpose | RLS Policy |
|-------|---------|------------|
| `auth.users` | Supabase authentication | Managed by Supabase |
| `user_profiles` | User metadata & roles | User owns their row |
| `meals` | Custom user meals | User owns their meals |
| `daily_logs` | Daily nutrition entries | User owns their logs |
| `weigh_ins` | Weight tracking | User owns their data |
| `inbody_scans` | Body composition data | User owns their scans |
| `user_settings` | Preferences & targets | User owns their settings |
| `master_meals` | Community meal library | All users read approved |
| `meal_submissions` | Submission queue | User sees their own |
| `coach_clients` | Coach-client relationships | Coach/client access |

### Table Schemas

#### `user_profiles`
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email TEXT,
  display_name TEXT,
  first_name TEXT,
  last_name TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  height_cm NUMERIC,
  activity_level TEXT CHECK (activity_level IN (
    'sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active'
  )),
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'coach')),
  coach_code TEXT UNIQUE,  -- 6-char alphanumeric for coaches
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `meals`
```sql
CREATE TABLE meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  calories NUMERIC NOT NULL,
  protein NUMERIC DEFAULT 0,
  carbs NUMERIC DEFAULT 0,
  fat NUMERIC DEFAULT 0,
  fiber NUMERIC DEFAULT 0,
  sugar NUMERIC DEFAULT 0,
  added_sugar NUMERIC DEFAULT 0,
  serving_size TEXT,
  serving_unit TEXT,
  recipe JSONB,  -- {ingredients[], instructions[], servings, totalTime}
  is_custom BOOLEAN DEFAULT true,
  favorite BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,  -- Soft delete (30-day recovery)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `daily_logs`
```sql
CREATE TABLE daily_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_ids JSONB DEFAULT '[]',        -- [{mealId, quantity, unit}]
  master_meal_ids JSONB DEFAULT '[]', -- [{mealId, quantity, unit}]
  workout_calories INTEGER DEFAULT 0,
  health_metrics JSONB,               -- {steps, activeEnergy, restingEnergy, exerciseMinutes}
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);
```

#### `inbody_scans`
```sql
CREATE TABLE inbody_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  -- Basic metrics
  weight NUMERIC,
  body_fat_percent NUMERIC,
  muscle_mass NUMERIC,
  skeletal_muscle NUMERIC,
  -- Tier 1 - Critical
  bmr NUMERIC,
  fat_mass NUMERIC,
  visceral_fat_grade NUMERIC,
  -- Tier 2 - Valuable
  water_weight NUMERIC,
  trunk_fat_mass NUMERIC,
  body_age NUMERIC,
  protein_mass NUMERIC,
  bone_mass NUMERIC,
  -- Reference
  image_data TEXT,  -- Base64 encoded scan image
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `weigh_ins`
```sql
CREATE TABLE weigh_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);
```

#### `user_settings`
```sql
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  daily_calorie_target INTEGER,
  daily_calorie_target_min INTEGER,
  daily_calorie_target_max INTEGER,
  tef_multiplier NUMERIC DEFAULT 1.10,  -- Thermic Effect of Food multiplier
  start_weight NUMERIC,
  goal_weight NUMERIC,
  start_date DATE,
  target_date DATE,
  weight_unit TEXT DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'lbs')),
  ai_provider TEXT DEFAULT 'groq' CHECK (ai_provider IN ('groq', 'openai')),
  groq_api_key TEXT,           -- AES-256 encrypted
  groq_api_key_backup TEXT,    -- AES-256 encrypted backup key
  openai_api_key TEXT,         -- AES-256 encrypted
  saved_master_meal_ids JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `master_meals`
```sql
CREATE TABLE master_meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  calories NUMERIC NOT NULL,
  protein NUMERIC DEFAULT 0,
  carbs NUMERIC DEFAULT 0,
  fat NUMERIC DEFAULT 0,
  fiber NUMERIC DEFAULT 0,
  sugar NUMERIC DEFAULT 0,
  added_sugar NUMERIC DEFAULT 0,
  serving_size TEXT,
  serving_unit TEXT,
  recipe JSONB,
  status TEXT DEFAULT 'approved' CHECK (status IN ('approved', 'archived')),
  submitted_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `meal_submissions`
```sql
CREATE TABLE meal_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  calories NUMERIC NOT NULL,
  protein NUMERIC DEFAULT 0,
  carbs NUMERIC DEFAULT 0,
  fat NUMERIC DEFAULT 0,
  fiber NUMERIC DEFAULT 0,
  sugar NUMERIC DEFAULT 0,
  recipe JSONB,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  master_meal_id UUID REFERENCES master_meals(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `coach_clients`
```sql
CREATE TABLE coach_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'terminated')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(coach_id, client_id)
);
```

### Row Level Security (RLS) Policies

```sql
-- Users can only access their own data
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Master meals: all authenticated users can read approved meals
ALTER TABLE master_meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view approved master meals" ON master_meals
  FOR SELECT USING (status = 'approved');

-- Admins can manage all master meals
CREATE POLICY "Admins can manage master meals" ON master_meals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Coach-client: both parties can view their relationships
ALTER TABLE coach_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches and clients can view relationships" ON coach_clients
  FOR SELECT USING (auth.uid() = coach_id OR auth.uid() = client_id);

-- Coach code lookup function
CREATE OR REPLACE FUNCTION lookup_coach_by_code(code TEXT)
RETURNS TABLE (user_id UUID, first_name TEXT, last_name TEXT, email TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT up.user_id, up.first_name, up.last_name, up.email
  FROM user_profiles up
  WHERE up.coach_code = code AND up.role = 'coach';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Authentication System

### AuthContext Provider

**Location:** `src/contexts/AuthContext.tsx`

```typescript
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isPasswordRecovery: boolean;
  signUp: (email: string, password: string) => Promise<AuthResponse>;
  signUpAsCoach: (email: string, password: string) => Promise<AuthResponse>;
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}
```

### Authentication Flows

#### Standard Sign Up
```
1. User enters email/password → Auth.tsx
2. signUp() calls Supabase auth.signUp()
3. Confirmation email sent automatically
4. User clicks email link → session created
5. App detects new user (no first_name in profile)
6. ProfileSetupModal shown for onboarding
7. User enters: first name, last name, height, DOB, gender, activity level
8. Profile saved to user_profiles table
```

#### Coach Sign Up
```
1. User navigates to /coach-signup → CoachSignUp.tsx
2. signUpAsCoach() calls signUp with metadata { is_coach: true }
3. After email confirmation + profile setup
4. coach_code generated (unique 6-char alphanumeric)
5. role set to 'coach' in user_profiles
```

#### Sign In
```
1. User enters credentials → Auth.tsx
2. signIn() calls Supabase auth.signInWithPassword()
3. Session stored in localStorage by Supabase
4. onAuthStateChange fires → user state updated
5. useSupabaseSync loads all user data from DB
6. App renders authenticated view
```

#### Password Recovery
```
1. User clicks "Forgot Password" → Auth.tsx
2. resetPasswordForEmail() sends recovery link
3. User clicks link → Supabase detects PASSWORD_RECOVERY event
4. AuthContext sets isPasswordRecovery = true
5. App shows ResetPassword component
6. User enters new password
7. updatePassword() updates Supabase auth
8. User redirected to normal app
```

---

## Components Reference

### Core Components

| Component | File | Purpose | Lazy Loaded |
|-----------|------|---------|-------------|
| **App** | `App.tsx` | Main orchestrator, routing, authentication flow | ❌ No |
| **AuthenticatedApp** | `AuthenticatedApp.tsx` | Authenticated user interface, tab navigation | ❌ No |
| **Dashboard** | `Dashboard.tsx` | Daily nutrition overview, macro rings | ✅ Yes |
| **LogMeals** | `LogMeals.tsx` | Meal browsing tab wrapper | ✅ Yes |
| **MealLogger** | `MealLogger.tsx` | Meal selection, editing, trash | ❌ No (used by LogMeals) |
| **Settings** | `Settings.tsx` | User preferences, API keys, goals | ✅ Yes |
| **ProgressTracker** | `ProgressTracker.tsx` | Weight charts, body comp (includes Recharts ~370KB) | ✅ Yes |
| **InBodyUpload** | `InBodyUpload.tsx` | Body scan photo import | ✅ Yes |
| **FoodScanner** | `FoodScanner.tsx` | AI food recognition | ❌ No (modal component) |
| **HealthScanner** | `HealthScanner.tsx` | Apple Health screenshot import | ❌ No (modal component) |
| **ProfileSetupModal** | `ProfileSetupModal.tsx` | First-time user onboarding | ❌ No (modal component) |
| **RecipeModal** | `RecipeModal.tsx` | Recipe detail viewer | ❌ No (modal component) |
| **WeeklySummary** | `WeeklySummary.tsx` | 7-day aggregated stats | ❌ No (used by Dashboard) |

### Coach Components (`src/components/Coach/`)

| Component | Purpose | Lazy Loaded |
|-----------|---------|-------------|
| **CoachDashboard** | Lists connected clients, pending requests, alerts, overview stats | ✅ Yes |
| **CoachSignUp** | Coach account registration with coach-specific metadata | ❌ No (route component) |
| **ClientDetailView** | Individual client data view (weight, goals, weigh-ins) | ✅ Yes |
| **ConnectToCoach** | Client-side coach connection interface | ❌ No (modal component) |
| **useCoachCode** | Hook for coach code lookup and connection | N/A |

### Discover Components (`src/components/Discover/`)

| Component | Purpose |
|-----------|---------|
| **DiscoverTab** | Community meal library browser |
| **MasterMealCard** | Individual community meal display card |
| **SubmitMealModal** | User meal submission form |
| **MySubmissionsPanel** | User's submission history and status |

### Admin Components (`src/components/Admin/`)

| Component | Purpose |
|-----------|---------|
| **AdminPanel** | Meal submission review and approval interface |

---

## Hooks Reference

### `useCalorieTracker` (Core State)

**Location:** `src/hooks/useCalorieTracker.ts`

```typescript
interface UseCalorieTrackerReturn {
  // Data
  meals: Meal[];
  deletedMeals: Meal[];
  dailyLogs: DailyLog[];
  inBodyScans: InBodyScan[];
  weighIns: WeighIn[];
  settings: UserSettings;

  // Loading states
  loading: boolean;
  syncing: boolean;

  // Queries
  getLogForDate: (date: string) => DailyLog | undefined;
  calculateTotals: (log: DailyLog) => NutritionTotals;
  getProgressData: () => WeightProgressData;
  getGoalProgress: () => GoalProgressData;
  getWeeklySummary: () => WeeklySummaryData;

  // Meal mutations
  addMeal: (meal: Omit<Meal, 'id'>) => Promise<Meal>;
  updateMeal: (id: string, updates: Partial<Meal>) => Promise<void>;
  deleteMeal: (id: string) => Promise<void>;  // Soft delete
  restoreMeal: (id: string) => Promise<void>;
  permanentlyDeleteMeal: (id: string) => Promise<void>;

  // Daily log mutations
  toggleMealForDate: (mealId: string, date: string, isMaster?: boolean) => Promise<void>;
  updateMealQuantity: (mealId: string, date: string, quantity: number, unit: string, isMaster?: boolean) => Promise<void>;
  updateWorkoutCalories: (date: string, calories: number) => Promise<void>;
  updateHealthMetrics: (date: string, metrics: HealthMetrics) => Promise<void>;

  // Body data mutations
  addInBodyScan: (scan: Omit<InBodyScan, 'id'>) => Promise<void>;
  deleteInBodyScan: (id: string) => Promise<void>;
  addWeighIn: (date: string, weight: number) => Promise<void>;
  deleteWeighIn: (date: string) => Promise<void>;

  // Settings mutations
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;

  // Master meal library
  saveMasterMealToLibrary: (mealId: string) => Promise<void>;
  removeMasterMealFromLibrary: (mealId: string) => Promise<void>;
}
```

### `useUserProfile`

**Location:** `src/hooks/useUserProfile.ts`

```typescript
interface UseUserProfileReturn {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;

  // Role checks
  isAdmin: boolean;
  isCoach: boolean;

  // Coach-specific
  coachCode: string | null;

  // Mutations
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  generateCoachCode: () => Promise<string>;
}
```

### `useCoachClients`

**Location:** `src/hooks/useCoachClients.ts`

```typescript
interface UseCoachClientsReturn {
  // Data
  clients: ClientSummary[];
  pendingRequests: CoachClientWithProfile[];
  alerts: CoachAlert[];
  loading: boolean;
  error: string | null;

  // Actions
  acceptRequest: (requestId: string) => Promise<boolean>;
  rejectRequest: (requestId: string) => Promise<boolean>;
  terminateClient: (clientId: string) => Promise<boolean>;
  refreshClients: () => Promise<void>;
  getClientData: (clientId: string) => Promise<ClientFullData | null>;
}

interface ClientFullData {
  profile: UserProfile;
  dailyLogs: DailyLog[];
  weighIns: WeighIn[];
  settings: { dailyCalorieTarget?: number; goalWeight?: number };
}
```

### `useMasterMeals`

**Location:** `src/hooks/useMasterMeals.ts`

**Performance Optimization**: Accepts a `shouldLoad` parameter (default: `false`) to conditionally load master meals only when needed. This prevents loading all master meals on app initialization.

```typescript
interface UseMasterMealsReturn {
  masterMeals: MasterMeal[];
  allMasterMeals: MasterMeal[];
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  loadMasterMeals: () => Promise<void>;
  searchMasterMeals: (query: string) => Promise<void>;
  incrementUsageCount: (id: string) => Promise<void>;
  getMasterMealById: (id: string) => MasterMeal | undefined;
  deleteMasterMeal: (id: string) => Promise<boolean>;
  checkDuplicateName: (name: string) => boolean;
}

// Usage
useMasterMeals(shouldLoad: boolean = false)
```

**Note**: Master meals are only loaded when `shouldLoad` is `true`, typically when the user navigates to the Discover or Dashboard tab.

### `useMealSubmissions`

**Location:** `src/hooks/useMealSubmissions.ts`

```typescript
interface UseMealSubmissionsReturn {
  submissions: MealSubmission[];
  pendingCount: number;
  pendingSubmissions: MealSubmission[];  // Admin only
  submitMeal: (meal: MealSubmissionInput) => Promise<void>;
  approveSubmission: (id: string) => Promise<void>;
  rejectSubmission: (id: string, reason: string) => Promise<void>;
}
```

### `useActivityRecommendation`

**Location:** `src/hooks/useActivityRecommendation.ts`

```typescript
interface ActivityAnalysis {
  recommendedLevel: ActivityLevel;
  confidence: 'low' | 'medium' | 'high';
  reasoning: string;
  dataPoints: number;
  averageSteps: number;
  exerciseDaysPerWeek: number;
}
```

---

## Context Providers

### AuthContext

**Location:** `src/contexts/AuthContext.tsx`

Wraps the entire application and provides:
- Current user and session state
- Authentication methods (sign up, sign in, sign out)
- Password recovery flow detection
- Loading state during auth checks

```typescript
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
```

---

## Type Definitions

**Location:** `src/types/index.ts`

### Nutrition Types

```typescript
interface Macros {
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  addedSugar?: number;
}

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
  servingSize?: string;
  servingUnit?: string;
  recipe?: Recipe;
  isCustom?: boolean;
  favorite?: boolean;
  deletedAt?: string;
}

interface Recipe {
  ingredients: string[];
  instructions: string[];
  servings: number;
  totalTime: string;
  nutrition?: RecipeNutrition;
}

type QuantityUnit = 'serving' | 'g' | 'ml' | 'oz';

interface MealLogEntry {
  mealId: string;
  quantity: number;
  unit: QuantityUnit;
}
```

### Daily Log Types

```typescript
interface DailyLog {
  date: string;  // YYYY-MM-DD
  meals: (string | MealLogEntry)[];  // Backward compatible
  masterMealIds?: (string | MasterMealLogEntry)[];
  workoutCalories: number;
  healthMetrics?: HealthMetrics;
  notes?: string;
}

interface HealthMetrics {
  restingEnergy: number;   // BMR from Apple Health
  activeEnergy: number;    // Move calories
  steps: number;
  exerciseMinutes: number;
  standHours?: number;
}
```

### Body Composition Types

```typescript
interface InBodyScan {
  id: string;
  date: string;
  weight: number;
  bodyFatPercent?: number;
  muscleMass?: number;
  skeletalMuscle?: number;
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

interface WeighIn {
  date: string;
  weight: number;
}
```

### User Types

```typescript
interface UserProfile {
  id: string;
  userId: string;
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  heightCm?: number;
  activityLevel?: ActivityLevel;
  role: 'user' | 'admin' | 'coach';
  coachCode?: string;
}

type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'extra_active';

interface UserSettings {
  dailyCalorieTarget?: number;
  startWeight?: number;
  goalWeight?: number;
  targetDate?: string;
  weightUnit?: 'kg' | 'lbs';
  aiProvider?: 'groq' | 'openai';
  groqApiKey?: string;
  openaiApiKey?: string;
  savedMasterMealIds?: string[];
}
```

### Coach Types

```typescript
interface CoachClient {
  id: string;
  coachId: string;
  clientId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'terminated';
  requestedAt: string;
  respondedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface ClientSummary {
  clientId: string;
  profile: UserProfile;
  latestWeight?: number;
  weightChange7Days?: number;
  caloriesToday?: number;
  calorieTarget?: number;
  lastActivityDate?: string;
  daysInactive: number;
  isInactive: boolean;
  hasWeightPlateau: boolean;
  missedCalorieTargets: number;
}

interface CoachAlert {
  id: string;
  type: 'inactive' | 'plateau' | 'missed_targets' | 'new_request';
  clientId?: string;
  clientName: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  createdAt: string;
}
```

### Community Types

```typescript
interface MasterMeal extends Meal {
  status: 'approved' | 'archived';
  submittedBy?: string;
  approvedBy?: string;
  usageCount: number;
}

interface MealSubmission {
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

### Recipe Types

```typescript
interface RecipeNutrition {
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  fiber?: number | null;
  sugar?: number | null;
  addedSugar?: number | null;
}

interface RecipeIngredient {
  item: string;
  portion?: string;
  amount?: string;
  unit?: string;
}

interface RecipeSection {
  title: string;
  ingredients: RecipeIngredient[];
  nutrition?: RecipeNutrition;
  notes?: string[];
}

interface Recipe {
  rawText?: string;
  servings?: number;
  totalTime?: number;
  nutrition?: RecipeNutrition;
  sections?: RecipeSection[];
  ingredients?: RecipeIngredient[];
  instructions?: string[];
}
```

### AI Insights Types

```typescript
interface DailyInsights {
  patternInsight: string;      // Key insight about their eating pattern
  actionItem: string;          // One specific actionable suggestion
  progressSummary: string;     // Progress towards goal with motivation
  wins: string[];              // Positive reinforcement (1-2 wins)
  remaining: string;           // Calories/macros remaining summary
  generatedAt: string;         // ISO timestamp
  tips?: string[];             // Legacy field for backwards compatibility
}

interface WeeklyInsights {
  summary: string;             // 2-3 sentence overview
  patterns: string[];          // Detected patterns
  wins: string[];              // Positive achievements
  suggestions: string[];       // Actionable tips
  generatedAt: string;         // ISO timestamp
}

interface MonthlyInsights {
  summary: string;             // Month overview
  trends: string[];            // Long-term trends
  goalPrediction: string;      // When user will reach goal
  comparison: string;          // vs last month
  generatedAt: string;         // ISO timestamp
}
```

### App State Types

```typescript
interface AppState {
  meals: Meal[];
  dailyLogs: DailyLog[];
  inBodyScans: InBodyScan[];
  weighIns: WeighIn[];
  settings: UserSettings;
}

type TabType = 'dashboard' | 'log' | 'discover' | 'progress' | 'inbody' | 'summary' | 'settings';
type AIProvider = 'openai' | 'groq';
type WeightUnit = 'kg' | 'lbs';
type QuantityUnit = 'serving' | 'g' | 'ml' | 'oz';
type ServingSizeUnit = 'g' | 'ml' | 'oz';
type UserRole = 'user' | 'admin' | 'coach';
type Gender = 'male' | 'female' | 'other' | 'prefer-not-to-say';
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
```

---

## Utility Functions

### BMR Calculation (`utils/bmrCalculation.ts`)

**Formulas Supported:**

1. **Katch-McArdle** (requires body composition):
   ```
   BMR = 370 + (21.6 × lean mass in kg)
   Lean mass = weight × (1 - body fat %)
   ```

2. **Mifflin-St Jeor** (requires basic metrics):
   ```
   Male:   BMR = (10 × weight) + (6.25 × height) - (5 × age) + 5
   Female: BMR = (10 × weight) + (6.25 × height) - (5 × age) - 161
   ```

**Activity Multipliers:**

| Level | Multiplier | Description |
|-------|------------|-------------|
| Sedentary | 1.2 | Little/no exercise |
| Lightly Active | 1.375 | Light exercise 1-3 days/week |
| Moderately Active | 1.55 | Moderate exercise 3-5 days/week |
| Very Active | 1.725 | Hard exercise 6-7 days/week |
| Extra Active | 1.9 | Very hard exercise, physical job |

**Key Functions:**
```typescript
getBMRWithPriority(inBodyScans, weighIns, profile): { bmr, source, confidence }
calculateDailyTarget(bmr, activityLevel, weeklyGoalKg): number
calculateGoalBasedTarget(currentWeight, goalWeight, targetDate, bmr, activityLevel): number
```

### Body Intelligence (`utils/bodyIntelligence.ts`)

Analyzes weight loss quality and metabolic health:

```typescript
interface BodyIntelligence {
  responseScore: number;         // 0-150+ (actual vs expected loss)
  responseStatus: 'normal' | 'slow' | 'fast' | 'insufficient-data';
  fatLossEfficiency: number;     // % of loss that was fat
  muscleRetention: number;       // % of muscle retained
  metabolicStatus: 'healthy' | 'adapting' | 'insufficient-data';
  bmrChange: number;             // Change in BMR over time
  recommendations: string[];
}
```

### Nutrition Goals (`utils/nutritionGoals.ts`)

| Macro | Formula |
|-------|---------|
| Protein | Weight (kg) × multiplier (0.8-1.6 based on activity) |
| Carbs | 50% of daily calories ÷ 4 |
| Fat | 30% of daily calories ÷ 9 |
| Fiber | 14g per 1,000 calories |
| Sugar | 36g (men) / 25g (women) - AHA limits |

### Encryption (`utils/encryption.ts`)

**Algorithm:** AES-256-GCM
**Key Derivation:** PBKDF2 with user ID + static salt

```typescript
encryptValue(value: string, userId: string): Promise<string>
decryptValue(encrypted: string, userId: string): Promise<string>
isEncrypted(value: string): boolean
```

### AI Integration (`utils/groq.ts`, `utils/openai.ts`)

| Provider | Vision Model | Text Model |
|----------|--------------|------------|
| Groq (Free) | meta-llama/llama-4-scout-17b-16e-instruct | llama-3.1-8b-instant |
| OpenAI (Paid) | gpt-4o | gpt-4o |

**Functions:**
```typescript
analyzeFoodImage(base64, apiKey): Promise<FoodAnalysis>
analyzeInBodyImage(base64, apiKey): Promise<InBodyScan>
analyzeHealthImage(base64, apiKey): Promise<HealthMetrics>
```

---

## Features & User Flows

### 1. Daily Meal Logging
```
Dashboard → View calories/macros
    ↓
Log Tab → Browse meals (personal or community)
    ↓
Select meal → Choose quantity & unit
    ↓
Add to log → Updates dashboard totals
    ↓
Edit/Remove → Adjust or delete entry
```

### 2. AI Food Scanning
```
Dashboard → Tap camera icon
    ↓
FoodScanner → Take/upload photo
    ↓
AI Analysis → Extracts name, calories, macros
    ↓
Review/Edit → Correct values if needed
    ↓
Save → Creates meal OR logs directly
```

### 3. Weight & Body Tracking
```
Progress Tab → View weight chart
    ↓
Add Weigh-in → Enter today's weight
    ↓
Upload InBody → Photo of scan
    ↓
AI Extraction → All metrics parsed
    ↓
Body Intelligence → Analyzes quality
```

### 4. Apple Health Integration
```
Dashboard → Tap health import
    ↓
HealthScanner → Screenshot Apple Health
    ↓
AI Extraction → Steps, calories, exercise
    ↓
Save → Updates daily log
    ↓
TDEE Calculation → Uses real data
```

### 5. Coach-Client System

**Coach Flow:**
```
Sign up as coach → Get unique code
    ↓
Share code → Clients enter to connect
    ↓
Dashboard → See pending requests
    ↓
Accept → Client connected
    ↓
View Client → See their data
```

**Client Flow:**
```
Settings → Connect to Coach
    ↓
Enter code → System validates
    ↓
Request sent → Awaiting acceptance
    ↓
Connected → Coach monitors progress
```

### 6. Community Meals
```
Discover Tab → Browse master meals
    ↓
Search → Find specific meals
    ↓
Save to Library → Personal list
    ↓
Submit Meal → Propose new meal
    ↓
Admin Review → Approve/Reject
    ↓
Approved → Available to all
```

---

## API Integrations

### Supabase

**Services:**
- **Auth:** Email/password, password recovery, session management
- **Database:** PostgreSQL with Row Level Security
- **Functions:** Server-side RPC for coach code lookup

**Environment Variables:**
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

### Groq API

**Endpoint:** `https://api.groq.com/openai/v1/chat/completions`
**Authentication:** Bearer token (user's API key)
**Free Tier:** Available with rate limits
**Timeout:** 30 seconds

### OpenAI API

**Endpoint:** `https://api.openai.com/v1/chat/completions`
**Model:** gpt-4o (vision-capable)
**Authentication:** Bearer token
**Cost:** Pay-per-use

---

## Calculations & Formulas

### Calorie Calculations

**Without Health Data:**
```
Target = Daily Calorie Target (from settings)
Net = Food Eaten - Workout Calories
Remaining = Target - Net
```

**With Health Data (TDEE):**
```
TDEE = Resting Energy + Active Energy
Deficit = TDEE - Food Eaten
Remaining = TDEE - Food Eaten
```

**BMR Priority:**
1. InBody measured BMR (most accurate)
2. Katch-McArdle from body composition
3. Mifflin-St Jeor from basic metrics
4. Settings target (fallback)

**Weight Projection:**
```
7,700 calories = 1 kg weight change
Weekly deficit × 52 / 7,700 = Annual kg loss
```

---

## Testing

### Test Infrastructure

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Test Runner** | Vitest 4.0.16 | Fast, Vite-native test execution |
| **DOM Environment** | jsdom 27.4.0 | Browser environment simulation |
| **Component Testing** | Testing Library 16.3.1 | React component rendering & queries |
| **Assertions** | @testing-library/jest-dom | Extended DOM matchers |
| **E2E Testing** | Playwright 1.57.0 | Cross-browser automation |
| **Mocking** | Vitest vi | Spies, mocks, and timers |

### Test Configuration

**Vitest Configuration (`vitest.config.ts`):**
```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/'],
    },
  },
})
```

**Playwright Configuration (`playwright.config.ts`):**
```typescript
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Test Setup (`src/test/setup.ts`)

```typescript
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(global, 'localStorage', { value: localStorageMock })

// Mock crypto.randomUUID if not available
if (typeof crypto !== 'undefined' && !crypto.randomUUID) {
  Object.defineProperty(crypto, 'randomUUID', {
    value: () => 'test-uuid-' + Math.random().toString(36).substring(7),
  })
}
```

### Test Utilities (`src/test/testUtils.tsx`)

**Test Data Factories:**
```typescript
// Create mock meal
createTestMeal(overrides = {}) → Meal

// Create mock daily log
createTestDailyLog(date: string, overrides = {}) → DailyLog

// Create mock weigh-in
createTestWeighIn(date: string, weight: number) → WeighIn

// Create mock InBody scan
createTestInBodyScan(date: string, overrides = {}) → InBodyScan

// Create mock settings
createTestSettings(overrides = {}) → UserSettings

// Create mock user profile
createTestUserProfile(overrides = {}) → UserProfile

// Date helpers
daysAgo(days: number) → string  // YYYY-MM-DD
today() → string                 // YYYY-MM-DD
```

### Unit Test Files (19 files, 548+ tests)

| Test File | Coverage Area | Key Tests |
|-----------|---------------|-----------|
| `auth.test.ts` | Authentication | Sign in, sign up, password reset, session |
| `calculations.test.ts` | BMR/TDEE | Mifflin-St Jeor, Katch-McArdle, activity multipliers |
| `servingMultiplier.test.ts` | Unit Conversion | Serving, grams, ml, oz calculations |
| `weightTracking.test.ts` | Weight Management | Add, edit, delete weigh-ins |
| `nutritionGoals.test.ts` | Macro Goals | Protein, carbs, fat, fiber targets |
| `settings.test.ts` | User Settings | Target date, weight goals, preferences |
| `mealManagement.test.ts` | Meal CRUD | Create, edit, soft delete, restore, favorites |
| `dailyLogging.test.ts` | Daily Logs | Add/remove meals, quantity, workout calories |
| `inBodyScans.test.ts` | Body Composition | Scan import, metric extraction |
| `bodyIntelligence.test.ts` | Intelligence | Response score, fat loss efficiency, metabolic status |
| `healthDataImport.test.ts` | Health Import | Apple Health extraction, TDEE calculation |
| `foodScanner.test.ts` | AI Scanner | Food detection, API fallback |
| `dashboard.test.ts` | Dashboard | Calorie ring, macro pills, quick stats |
| `discover.test.ts` | Community | Master meals, submissions, library |
| `coach.test.ts` | Coach Feature | Client management, alerts, connections |
| `weightConversion.test.ts` | Unit Conversion | kg to lbs, lbs to kg |
| `apiMocks.test.ts` | API Mocking | Groq, OpenAI mock responses |
| `supabaseIntegration.test.ts` | Database | Sync, RLS, CRUD operations |
| `useCalorieTracker.test.ts` | Core Hook | State management, mutations |

### E2E Test Categories (64+ tests)

| Category | Tests | Purpose |
|----------|-------|---------|
| **Authentication** | 3 | Landing page, sign up, sign in forms |
| **Navigation** | 1 | Tab switching (skip in CI) |
| **UI Elements** | 3 | No critical errors, viewport, styles |
| **Responsive Design** | 3 | Mobile, tablet, desktop viewports |
| **Accessibility** | 3 | Alt text, button names, form labels |
| **Performance** | 2 | Load time <10s, console warnings |
| **Local Storage** | 1 | Storage access verification |
| **Error Handling** | 2 | 404 routes, network errors |
| **Landing Page** | 2 | Content display, interactivity |
| **Form Validation** | 2 | Email validation, password masking |
| **Visual Styling** | 3 | Font family, text color, button cursor |
| **User Interactions** | 2 | Keyboard navigation, escape key |
| **SEO and Meta** | 3 | Title, description, favicon |
| **Security** | 3 | Password obscured, HTTPS, no URL secrets |

### Running Tests

```bash
# Unit tests (watch mode)
npm run test

# Unit tests (single run)
npm run test:run

# Unit tests with coverage
npm run test:coverage

# E2E tests (headless)
npm run test:e2e

# E2E tests (with UI)
npm run test:e2e:ui
```

---

## CI/CD Pipeline

### GitHub Actions Workflow (`.github/workflows/tests.yml`)

The CI/CD pipeline consists of 3 parallel jobs that run on every push and pull request to main/master:

```yaml
name: Tests

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]
```

### Job 1: Unit & Integration Tests

```yaml
unit-tests:
  name: Unit & Integration Tests
  runs-on: ubuntu-latest
  steps:
    - Checkout code
    - Setup Node.js 20
    - npm ci
    - npm run test:run        # Run all unit tests
    - npm run test:coverage   # Generate coverage report
```

### Job 2: E2E Tests

```yaml
e2e-tests:
  name: E2E Tests
  runs-on: ubuntu-latest
  steps:
    - Checkout code
    - Setup Node.js 20
    - npm ci
    - npx playwright install --with-deps chromium
    - npm run test:e2e
      env:
        VITE_SUPABASE_URL: https://placeholder.supabase.co
        VITE_SUPABASE_ANON_KEY: placeholder-key-for-ci-testing
    - Upload playwright-report (on failure)
```

### Job 3: Build Verification

```yaml
build:
  name: Build Verification
  runs-on: ubuntu-latest
  steps:
    - Checkout code
    - Setup Node.js 20
    - npm ci
    - npm run lint
    - npm run build
    - Upload dist/ artifact
```

### CI/CD Status Indicators

| Job | Badge | Purpose |
|-----|-------|---------|
| Unit Tests | ✅ | Validates business logic & calculations |
| E2E Tests | ✅ | Validates UI rendering & interactions |
| Build | ✅ | Verifies production build succeeds |

### Artifact Uploads

- **playwright-report**: Uploaded on E2E failure (7 days retention)
- **dist**: Production build artifacts (7 days retention)

---

## Scripts & Utilities

### NPM Scripts (`package.json`)

```json
{
  "scripts": {
    "dev": "vite",                    // Start dev server (port 5173)
    "build": "tsc -b && vite build",  // Type-check & build for production
    "lint": "eslint .",               // Run ESLint on all files
    "preview": "vite preview",        // Preview production build
    "test": "vitest",                 // Run tests in watch mode
    "test:run": "vitest run",         // Run tests once
    "test:coverage": "vitest run --coverage",  // Generate coverage
    "test:e2e": "playwright test",    // Run E2E tests
    "test:e2e:ui": "playwright test --ui"      // E2E with Playwright UI
  }
}
```

### Seed Scripts (`scripts/`)

#### `seed-demo-user.ts`

Seeds a complete demo user account with realistic data for testing:

```bash
SUPABASE_SERVICE_KEY=your_key npx tsx scripts/seed-demo-user.ts
```

**Generated Data:**
- 10 meals (breakfast, lunch, dinner, snacks)
- 45 days of daily logs with meal selections
- 23 weigh-ins (every 2 days, trending 82kg → 78kg)
- 7 weekly InBody scans with body composition
- User settings (1700 cal target, 72kg goal)
- User profile (Demo User, 175cm, moderate activity)

#### `seed-demo-coach.ts`

Seeds a demo coach account with connected clients:

```bash
SUPABASE_SERVICE_KEY=your_key npx tsx scripts/seed-demo-coach.ts
```

**Generated Data:**
- Coach account with coach_code
- Multiple connected clients
- Pending connection requests
- Client activity data for alerts

### Development Workflow

```bash
# 1. Clone and install
git clone <repo>
cd calorie-tracker
npm install

# 2. Set up environment
cp .env.example .env.local
# Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 3. Start development
npm run dev

# 4. Run tests before committing
npm run test:run
npm run lint

# 5. Build for production
npm run build
npm run preview
```

---

## Deployment

### Vercel Configuration

**Build Command:** `npm run build`
**Output Directory:** `dist`
**Node Version:** 18.x

**Environment Variables (Vercel Dashboard):**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Type check & build
npm run build

# Lint
npm run lint
```

### PWA Support

- Installable on iOS/Android
- Offline support via service worker
- Custom app icons and splash screens
- Standalone mode (no browser UI)

---

## Admin & Coach Setup

### Create Admin User

In Supabase SQL Editor:
```sql
UPDATE user_profiles
SET role = 'admin'
WHERE email = 'your-admin@email.com';
```

### Create Coach User

1. Sign up via `/coach-signup` route
2. Complete profile setup
3. Coach code auto-generated
4. Role automatically set to 'coach'

Or manually in SQL:
```sql
UPDATE user_profiles
SET role = 'coach',
    coach_code = 'ABC123'
WHERE email = 'your-coach@email.com';
```

---

## Performance Optimizations

### Current Optimizations

| Optimization | Description | Status |
|--------------|-------------|--------|
| **Code Splitting** | All heavy components lazy-loaded (Dashboard, LogMeals, DiscoverTab, Settings, InBodyUpload, ProgressTracker, CoachDashboard, ClientDetailView) | ✅ Implemented |
| **Conditional Hook Execution** | Data hooks only execute after authentication confirmed | ✅ Implemented |
| **Conditional Master Meals Loading** | Master meals only load when Discover or Dashboard tab is active | ✅ Implemented |
| **Data Caching** | All data cached in localStorage, synced to Supabase | ✅ Implemented |
| **Memoization** | useMemo/useCallback for expensive calculations | ✅ Implemented |
| **Soft Deletes** | Meals recoverable for 30 days | ✅ Implemented |
| **API Key Encryption** | AES-256-GCM before storage | ✅ Implemented |
| **Optimistic Updates** | UI updates immediately, background sync | ✅ Implemented |

### Performance Improvements Applied (January 2026)

1. **Separated Authenticated Logic**: Created `AuthenticatedApp` component to prevent hooks from executing before authentication
2. **Lazy Loading**: All tab components are now lazy-loaded to reduce initial bundle size
3. **Conditional Data Loading**: Master meals only load when needed (Discover/Dashboard tabs)
4. **Faster Initial Load**: Unauthenticated users see landing page immediately without loading any data hooks

### Expected Performance Impact

- **Initial Load Time**: 60-80% faster for unauthenticated users
- **Time to Interactive**: 40-60% faster due to code splitting
- **Bundle Size**: Reduced initial bundle size by lazy-loading heavy components
- **Memory Usage**: Lower memory footprint by loading components on-demand

---

## Navigation Tabs

| Tab | Icon | Description |
|-----|------|-------------|
| Dashboard | LayoutDashboard | Daily tracking, food scanner |
| Log | Utensils | Meal library, editing, trash |
| Discover | Globe | Community meals, submissions |
| Progress | TrendingUp | Charts, weigh-ins |
| InBody | ScanLine | Body composition scans |
| Settings | Settings | Profile, goals, configuration |

**Note**: All tab components are lazy-loaded for optimal performance. The Settings tab is accessible via the header icon.

---

## CSS Variables

**Location:** `src/App.css`

| Variable | Hex | Usage |
|----------|-----|-------|
| `--primary` | `#6366f1` | Buttons, links, active states |
| `--success` | `#10b981` | Positive values, on track |
| `--warning` | `#f59e0b` | Cautions, warnings |
| `--danger` | `#ef4444` | Errors, delete, over limits |
| `--protein-color` | `#8b5cf6` | Protein macros |
| `--carbs-color` | `#f59e0b` | Carbs macros |
| `--fat-color` | `#ec4899` | Fat macros |
| `--fiber-color` | `#10b981` | Fiber macros |
| `--sugar-color` | `#f97316` | Sugar macros |

**Breakpoints:** Mobile-first with 480px, 768px breakpoints

---

## Quick Reference

### Key File Locations

| Purpose | Location |
|---------|----------|
| Main entry point | `src/main.tsx` |
| Root component | `src/App.tsx` |
| Core state hook | `src/hooks/useCalorieTracker.ts` |
| Type definitions | `src/types/index.ts` |
| Database schema | `supabase-schema.sql` |
| Test configuration | `vitest.config.ts`, `playwright.config.ts` |
| CI/CD workflow | `.github/workflows/tests.yml` |

### Common Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run test:run     # Run unit tests
npm run test:e2e     # Run E2E tests
npm run lint         # Run ESLint
```

### Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_KEY` | Service key for scripts | Scripts only |

---

*Documentation generated January 2026*
*Last updated: January 11, 2026 - Added Testing, CI/CD, and Scripts documentation*
