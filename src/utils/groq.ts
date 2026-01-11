// Groq API integration for vision tasks
// Uses Llama 3.2 Vision model (free tier available)

import type { Recipe, DailyLog, UserSettings, UserProfile, WeighIn, InBodyScan, DailyInsights, WeeklyInsights, MonthlyInsights, Meal, MasterMeal } from '../types';

export interface GroqFoodAnalysis {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  addedSugar: number;  // Added sugar only (not from natural sources like fruit/dairy)
  confidence: 'high' | 'medium' | 'low';
  portionSize: string;
}

export interface GroqInBodyData {
  weight: number | null;
  bodyFatPercent: number | null;
  muscleMass: number | null;
  skeletalMuscle: number | null;
  scanDate: string | null;
  // Enhanced metrics (Tier 1 - Critical)
  bmr: number | null;              // Basal Metabolic Rate in kcal
  fatMass: number | null;          // Total fat mass in kg
  visceralFatGrade: number | null; // Internal organ fat grade (1-20)
  // Enhanced metrics (Tier 2 - Valuable)
  waterWeight: number | null;      // Water weight in kg
  trunkFatMass: number | null;     // Trunk/belly fat in kg
  bodyAge: number | null;          // Metabolic body age in years
  proteinMass: number | null;      // Protein mass in kg
  boneMass: number | null;         // Bone mass in kg
}

export interface GroqHealthData {
  steps: number | null;
  activeCalories: number | null;      // Active Energy / Move calories
  restingCalories: number | null;     // Resting Energy / BMR
  exerciseMinutes: number | null;
  standHours: number | null;
  weight: number | null;
  walkingDistance: number | null;
  flightsClimbed: number | null;
  date: string | null;
  workouts: Array<{
    type: string;
    duration: number;
    calories: number;
  }>;
}

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const TEXT_MODEL = 'llama-3.1-8b-instant';
const REQUEST_TIMEOUT_MS = 30000; // 30 second timeout

// Helper to fetch with timeout
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================
// RATE LIMIT DETECTION & FALLBACK
// ============================================

function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('rate limit') ||
      msg.includes('rate_limit') ||
      msg.includes('quota') ||
      msg.includes('exceeded') ||
      msg.includes('429') ||
      msg.includes('too many requests')
    );
  }
  return false;
}

async function callWithFallback<T>(
  primaryKey: string | undefined,
  backupKey: string | undefined,
  apiCall: (key: string) => Promise<T>
): Promise<T> {
  const keys = [primaryKey, backupKey].filter(Boolean) as string[];

  if (keys.length === 0) {
    throw new Error('No API key configured');
  }

  let lastError: Error | null = null;
  let allKeysRateLimited = true;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    try {
      return await apiCall(key);
    } catch (error) {
      lastError = error as Error;
      // Only try next key on rate limit errors
      if (!isRateLimitError(error)) {
        allKeysRateLimited = false;
        throw error;
      }
      if (i < keys.length - 1) {
        console.log('Rate limit hit on primary key, trying backup key...');
      }
    }
  }

  // Provide clearer error message when all keys are exhausted
  if (allKeysRateLimited && keys.length > 1) {
    throw new Error('Both API keys exhausted. Try again later or add another key in Settings.');
  } else if (allKeysRateLimited) {
    throw new Error('API key rate limit exceeded. Add a backup key in Settings or try again later.');
  }

  throw lastError || new Error('All API keys exhausted');
}

async function callGroqVision(
  imageBase64: string,
  prompt: string,
  apiKey: string
): Promise<string> {
  const response = await fetchWithTimeout(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageBase64.startsWith('data:')
                  ? imageBase64
                  : `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to analyze image with Groq');
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error('No response from Groq API');
  }

  return content;
}

async function callGroqText(
  prompt: string,
  apiKey: string
): Promise<string> {
  const response = await fetchWithTimeout(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: TEXT_MODEL,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 1000,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to analyze text with Groq');
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error('No response from Groq API');
  }

  return content;
}

function parseJsonResponse<T>(content: string): T {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    return JSON.parse(jsonMatch[0]);
  } catch {
    console.error('Failed to parse Groq response:', content);
    throw new Error('Failed to parse response from Groq');
  }
}

export async function groqAnalyzeFood(
  imageBase64: string,
  primaryKey: string | undefined,
  backupKey?: string
): Promise<GroqFoodAnalysis[]> {
  const prompt = `Analyze this food image and identify all food items visible. For each item, estimate the nutritional information.

Return ONLY a JSON array with this format (no other text):
[
  {
    "name": "Food item name",
    "calories": <number>,
    "protein": <number in grams>,
    "carbs": <number in grams>,
    "fat": <number in grams>,
    "fiber": <number in grams>,
    "sugar": <number in grams - TOTAL sugars>,
    "addedSugar": <number in grams - ADDED sugars only>,
    "confidence": "high" | "medium" | "low",
    "portionSize": "estimated portion description"
  }
]

Important:
- Be specific with food names
- Estimate based on visible portion size
- Use reasonable nutritional values
- Return an array even for single items
- confidence should reflect how certain you are about the identification
- fiber: dietary fiber content (vegetables, whole grains have higher fiber)
- sugar: TOTAL sugars including both natural (from fruits, dairy, vegetables) AND added sugars
- addedSugar: ONLY added/processed sugars (sweeteners, syrups, refined sugar, honey, etc.)
  * Fresh fruits, plain dairy, vegetables = 0g added sugar (all sugar is natural)
  * Sweetened drinks, candy, pastries, flavored yogurt = most or all of sugar is added
  * If unsure, estimate conservatively (lower added sugar for whole foods)`;

  return callWithFallback(primaryKey, backupKey, async (apiKey) => {
    const content = await callGroqVision(imageBase64, prompt, apiKey);

    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found');
      }
      const parsed = JSON.parse(jsonMatch[0]);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      console.error('Failed to parse food response:', content);
      throw new Error('Failed to parse food analysis from Groq');
    }
  });
}

export async function groqFormatRecipeText(
  rawText: string,
  primaryKey: string | undefined,
  backupKey?: string
): Promise<Recipe> {
  const prompt = `You are a recipe formatter. Convert the user text into structured JSON that matches this schema:

{
  "servings": number | null,
  "totalTime": number | null,
  "nutrition": { "calories": number | null, "protein": number | null, "carbs": number | null, "fat": number | null, "fiber": number | null, "sugar": number | null, "addedSugar": number | null } | null,
  "sections": [
    {
      "title": string,
      "ingredients": [ { "item": string, "portion": string } ],
      "nutrition": { "calories": number | null, "protein": number | null, "carbs": number | null, "fat": number | null, "fiber": number | null, "sugar": number | null, "addedSugar": number | null } | null,
      "notes": [string]
    }
  ],
  "instructions": [string]
}

Guidelines:
- Follow the "Meal Portions & Nutrition" structure: overall nutrition summary plus sectioned ingredients (e.g., Base, Toppings, Dressing, Sauce) with portions.
- Use short, clean section titles. If the text has no sections, create a single section titled "Ingredients".
- Portion should keep units (e.g., "1 pack (100g)", "1/4 cup (35g)", "to taste").
- Nutrition values should be numbers when present; otherwise null.
- fiber: dietary fiber content in grams
- sugar: TOTAL sugars in grams (including natural + added)
- addedSugar: ONLY added/processed sugars (sweeteners, syrups, refined sugar). Natural sugars from fruits/dairy = 0g added sugar.
- Return ONLY JSON, no markdown.

User text:
${rawText}`;

  return callWithFallback(primaryKey, backupKey, async (apiKey) => {
    const content = await callGroqText(prompt, apiKey);
    const parsed = parseJsonResponse<Recipe>(content);
    return {
      ...parsed,
      rawText: rawText.trim(),
    };
  });
}

export async function groqExtractInBodyData(
  imageBase64: string,
  primaryKey: string | undefined,
  backupKey?: string
): Promise<GroqInBodyData> {
  const prompt = `Analyze this InBody body composition scan report. Extract ALL available metrics with high precision. Return ONLY valid JSON (no markdown) with this structure:

{
  "scanDate": "YYYY-MM-DD format from the scan",
  "weight": number in kg,
  "bodyFatPercent": number (percentage, not decimal),
  "muscleMass": number in kg (TOTAL Muscle Mass - the larger value, typically 40-60kg),
  "skeletalMuscle": number in kg (Skeletal Muscle Mass/SMM - the smaller value, typically 25-40kg),
  "bmr": number (Basal Metabolic Rate in kcal - look for "Basal metabolic rate" or "BMR"),
  "fatMass": number in kg (look in body composition analysis),
  "visceralFatGrade": number 1-20 (look for "Visceral fat grade" or "Visceral fat level"),
  "waterWeight": number in kg (look for "Water weight" or "Total body water"),
  "trunkFatMass": number in kg (look in "Segmental fat analysis" for trunk/torso fat),
  "bodyAge": number in years (look for "Body age"),
  "proteinMass": number in kg (look for "Protein mass"),
  "boneMass": number in kg (look for "Bone mass" or "Bone mineral content")
}

CRITICAL INSTRUCTIONS:
1. BMR (Basal Metabolic Rate) is one of the MOST IMPORTANT values - look carefully for it
2. For any field not visible or readable in the image, use null
3. Be extremely precise with numbers - double-check all values
4. Date format must be YYYY-MM-DD
5. Visceral fat grade is typically 1-20, with <10 being healthy
6. IMPORTANT: muscleMass should be TOTAL muscle (larger ~40-60kg), skeletalMuscle should be SMM (smaller ~25-40kg)
7. IGNORE any "History" section, trend graphs, or historical data - extract ONLY the CURRENT scan's values
8. Extract data from the main "Body composition analysis" section, NOT from any charts/graphs showing past measurements
9. Return ONLY ONE scan (the current one) - never multiple records
10. Return ONLY the JSON object, no explanations or markdown formatting`;

  return callWithFallback(primaryKey, backupKey, async (apiKey) => {
    const content = await callGroqVision(imageBase64, prompt, apiKey);
    return parseJsonResponse<GroqInBodyData>(content);
  });
}

export async function groqExtractHealthData(
  imageBase64: string,
  primaryKey: string | undefined,
  backupKey?: string
): Promise<GroqHealthData> {
  const prompt = `Analyze this Apple Health app screenshot and extract health metrics. Return ONLY a JSON object with these keys (use null if not visible):

{
  "steps": <number of steps>,
  "activeCalories": <Active Energy or Move calories - calories burned through activity>,
  "restingCalories": <Resting Energy - BMR/basal metabolic rate, calories burned at rest>,
  "exerciseMinutes": <exercise minutes as number>,
  "standHours": <stand hours as number>,
  "weight": <weight in kg as number>,
  "walkingDistance": <walking/running distance in km as number>,
  "flightsClimbed": <flights of stairs climbed as number>,
  "date": "<date shown in YYYY-MM-DD format, or null if not visible>",
  "workouts": [
    {"type": "<workout type like Running, Cycling, Strength>", "duration": <minutes>, "calories": <calories burned>}
  ]
}

Important:
- Extract numerical values only (no units in JSON values)
- "Active Energy" in Apple Health = activeCalories (calories burned through movement/exercise)
- "Resting Energy" in Apple Health = restingCalories (BMR, typically 1500-2000 cal)
- Activity rings: Move = activeCalories, Exercise = exerciseMinutes, Stand = standHours
- Convert miles to km if needed (multiply by 1.60934)
- Convert lbs to kg if needed (multiply by 0.453592)
- For workouts array, include each workout shown. Empty array if none visible
- Return ONLY the JSON object, no other text`;

  return callWithFallback(primaryKey, backupKey, async (apiKey) => {
    const content = await callGroqVision(imageBase64, prompt, apiKey);
    const parsed = parseJsonResponse<GroqHealthData>(content);

    // Ensure workouts is always an array
    if (!parsed.workouts) {
      parsed.workouts = [];
    }

    return parsed;
  });
}

// ============================================
// AI INSIGHTS FUNCTIONS
// ============================================

interface DailyTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
}

// Extended data for comprehensive insights
export interface EnhancedInsightData {
  todayLog: DailyLog | undefined;
  todayTotals: DailyTotals;
  todayMeals: Array<{ name: string; calories: number; protein: number }>;
  allDailyLogs: DailyLog[];
  weighIns: WeighIn[];
  inBodyScans: InBodyScan[];
  meals: Meal[];
  masterMeals: MasterMeal[];
  settings: UserSettings;
  profile: UserProfile | null;
}

// Helper: Compute weekly stats
function computeWeeklyStats(
  dailyLogs: DailyLog[],
  meals: Meal[],
  masterMeals: MasterMeal[],
  settings: UserSettings
) {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const weekLogs = dailyLogs.filter(log => {
    const logDate = new Date(log.date);
    return logDate >= weekAgo && logDate <= today;
  });

  const targetCals = Math.round((settings.dailyCalorieTargetMin + settings.dailyCalorieTargetMax) / 2);

  // Calculate daily totals for each day
  const dailyCalories: number[] = [];
  const dailyProtein: number[] = [];
  let daysOnTarget = 0;

  weekLogs.forEach(log => {
    let cals = 0;
    let protein = 0;

    // Sum up meals
    log.meals.forEach(entry => {
      const mealId = typeof entry === 'string' ? entry : entry.mealId;
      const quantity = typeof entry === 'string' ? 1 : entry.quantity;
      const meal = meals.find(m => m.id === mealId);
      if (meal) {
        cals += meal.calories * quantity;
        protein += meal.protein * quantity;
      }
    });

    // Sum up master meals
    (log.masterMealIds || []).forEach(entry => {
      const mealId = typeof entry === 'string' ? entry : entry.mealId;
      const quantity = typeof entry === 'string' ? 1 : entry.quantity;
      const meal = masterMeals.find(m => m.id === mealId);
      if (meal) {
        cals += meal.calories * quantity;
        protein += meal.protein * quantity;
      }
    });

    dailyCalories.push(cals);
    dailyProtein.push(protein);

    if (cals >= settings.dailyCalorieTargetMin && cals <= settings.dailyCalorieTargetMax) {
      daysOnTarget++;
    }
  });

  const avgCalories = dailyCalories.length > 0
    ? Math.round(dailyCalories.reduce((a, b) => a + b, 0) / dailyCalories.length)
    : 0;
  const avgProtein = dailyProtein.length > 0
    ? Math.round(dailyProtein.reduce((a, b) => a + b, 0) / dailyProtein.length)
    : 0;

  return {
    daysLogged: weekLogs.length,
    daysOnTarget,
    avgCalories,
    avgProtein,
    targetCals,
    caloriesTrend: dailyCalories.length >= 2
      ? dailyCalories[dailyCalories.length - 1] - dailyCalories[0]
      : 0,
    proteinTrend: dailyProtein.length >= 2
      ? dailyProtein[dailyProtein.length - 1] - dailyProtein[0]
      : 0,
  };
}

// Helper: Compute weight progress
function computeWeightProgress(
  weighIns: WeighIn[],
  settings: UserSettings
) {
  if (weighIns.length === 0) {
    return {
      currentWeight: settings.startWeight,
      weekChange: 0,
      monthChange: 0,
      totalLost: 0,
      percentToGoal: 0,
      weeksToGoal: null as number | null,
    };
  }

  const sorted = [...weighIns].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const currentWeight = sorted[sorted.length - 1].weight;
  const today = new Date();

  // Week change
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoWeighIn = sorted.find(w => new Date(w.date) >= weekAgo) || sorted[sorted.length - 1];
  const weekChange = currentWeight - weekAgoWeighIn.weight;

  // Month change
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);
  const monthAgoWeighIn = sorted.find(w => new Date(w.date) >= monthAgo) || sorted[0];
  const monthChange = currentWeight - monthAgoWeighIn.weight;

  // Total progress
  const totalToLose = settings.startWeight - settings.goalWeight;
  const totalLost = settings.startWeight - currentWeight;
  const percentToGoal = totalToLose !== 0 ? Math.round((totalLost / Math.abs(totalToLose)) * 100) : 0;

  // Weeks to goal estimate
  let weeksToGoal: number | null = null;
  if (monthChange !== 0 && totalToLose !== 0) {
    const weeklyRate = monthChange / 4;
    const remaining = currentWeight - settings.goalWeight;
    if ((weeklyRate < 0 && remaining > 0) || (weeklyRate > 0 && remaining < 0)) {
      weeksToGoal = Math.round(Math.abs(remaining / weeklyRate));
    }
  }

  return {
    currentWeight,
    weekChange,
    monthChange,
    totalLost,
    percentToGoal,
    weeksToGoal,
  };
}

// Helper: Get latest InBody comparison
function getInBodyProgress(inBodyScans: InBodyScan[]) {
  if (inBodyScans.length === 0) return null;

  const sorted = [...inBodyScans].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const latest = sorted[sorted.length - 1];
  const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null;

  return {
    latest,
    bodyFatChange: previous ? latest.bodyFatPercent - previous.bodyFatPercent : null,
    muscleChange: previous ? latest.muscleMass - previous.muscleMass : null,
  };
}

// Helper: Get today's meal names
function getTodayMealNames(
  todayLog: DailyLog | undefined,
  meals: Meal[],
  masterMeals: MasterMeal[]
): Array<{ name: string; calories: number; protein: number }> {
  if (!todayLog) return [];

  const mealList: Array<{ name: string; calories: number; protein: number }> = [];

  todayLog.meals.forEach(entry => {
    const mealId = typeof entry === 'string' ? entry : entry.mealId;
    const quantity = typeof entry === 'string' ? 1 : entry.quantity;
    const meal = meals.find(m => m.id === mealId);
    if (meal) {
      mealList.push({
        name: meal.name + (quantity !== 1 ? ` (x${quantity})` : ''),
        calories: Math.round(meal.calories * quantity),
        protein: Math.round(meal.protein * quantity),
      });
    }
  });

  (todayLog.masterMealIds || []).forEach(entry => {
    const mealId = typeof entry === 'string' ? entry : entry.mealId;
    const quantity = typeof entry === 'string' ? 1 : entry.quantity;
    const meal = masterMeals.find(m => m.id === mealId);
    if (meal) {
      mealList.push({
        name: meal.name + (quantity !== 1 ? ` (x${quantity})` : ''),
        calories: Math.round(meal.calories * quantity),
        protein: Math.round(meal.protein * quantity),
      });
    }
  });

  return mealList;
}

export async function generateDailyInsights(
  data: EnhancedInsightData,
  primaryKey: string | undefined,
  backupKey?: string
): Promise<DailyInsights> {
  const { todayLog, todayTotals, settings, profile, allDailyLogs, weighIns, inBodyScans, meals, masterMeals } = data;

  const targetCals = Math.round((settings.dailyCalorieTargetMin + settings.dailyCalorieTargetMax) / 2);
  const remaining = targetCals - todayTotals.calories;

  // Compute comprehensive stats
  const weeklyStats = computeWeeklyStats(allDailyLogs, meals, masterMeals, settings);
  const weightProgress = computeWeightProgress(weighIns, settings);
  const inBodyProgress = getInBodyProgress(inBodyScans);
  const todayMeals = getTodayMealNames(todayLog, meals, masterMeals);

  // Build goal context
  const goalDirection = settings.goalWeight < settings.startWeight ? 'lose' :
                        settings.goalWeight > settings.startWeight ? 'gain' : 'maintain';

  // Detect common patterns
  const patterns: string[] = [];
  if (weeklyStats.avgProtein < 100) patterns.push('protein tends to be low');
  if (weeklyStats.daysOnTarget < 3) patterns.push('often over/under calorie target');
  if (weeklyStats.daysLogged < 5) patterns.push('inconsistent logging');

  const prompt = `You are an encouraging, world-class nutrition coach who KNOWS this user personally. Analyze their data and provide life-changing insights.

=== USER PROFILE ===
Gender: ${profile?.gender || 'not specified'}
Goal: ${goalDirection} weight (${settings.startWeight}kg → ${settings.goalWeight}kg)
Daily target: ${settings.dailyCalorieTargetMin}-${settings.dailyCalorieTargetMax} cal

=== TODAY'S MEALS ===
${todayMeals.length > 0 ? todayMeals.map(m => `• ${m.name}: ${m.calories} cal, ${m.protein}g protein`).join('\n') : 'No meals logged yet'}

=== TODAY'S TOTALS ===
Calories: ${todayTotals.calories}/${targetCals} (${remaining > 0 ? remaining + ' remaining' : Math.abs(remaining) + ' over'})
Protein: ${todayTotals.protein}g | Carbs: ${todayTotals.carbs}g | Fat: ${todayTotals.fat}g | Fiber: ${todayTotals.fiber}g

=== WEEKLY PATTERNS (Last 7 days) ===
Days logged: ${weeklyStats.daysLogged}/7
Days on target: ${weeklyStats.daysOnTarget}/7
Avg calories: ${weeklyStats.avgCalories}/day (target: ${targetCals})
Avg protein: ${weeklyStats.avgProtein}g/day
${patterns.length > 0 ? 'Patterns noticed: ' + patterns.join(', ') : ''}

=== WEIGHT PROGRESS ===
Current: ${weightProgress.currentWeight}kg
This week: ${weightProgress.weekChange >= 0 ? '+' : ''}${weightProgress.weekChange.toFixed(1)}kg
This month: ${weightProgress.monthChange >= 0 ? '+' : ''}${weightProgress.monthChange.toFixed(1)}kg
Total progress: ${weightProgress.totalLost >= 0 ? '' : '+'}${weightProgress.totalLost.toFixed(1)}kg (${weightProgress.percentToGoal}% to goal)
${weightProgress.weeksToGoal ? `Estimated weeks to goal: ${weightProgress.weeksToGoal}` : ''}

${inBodyProgress ? `=== BODY COMPOSITION ===
Body fat: ${inBodyProgress.latest.bodyFatPercent}%${inBodyProgress.bodyFatChange !== null ? ` (${inBodyProgress.bodyFatChange >= 0 ? '+' : ''}${inBodyProgress.bodyFatChange.toFixed(1)}% change)` : ''}
Muscle mass: ${inBodyProgress.latest.muscleMass}kg${inBodyProgress.muscleChange !== null ? ` (${inBodyProgress.muscleChange >= 0 ? '+' : ''}${inBodyProgress.muscleChange.toFixed(1)}kg change)` : ''}` : ''}

=== YOUR TASK ===
Give SHORT, punchy insights. Each must be ONE sentence, MAX 15 words. Be specific and personal.

Return ONLY JSON (no markdown):
{
  "patternInsight": "max 15 words about their eating pattern",
  "actionItem": "max 15 words - one specific thing to do TODAY",
  "progressSummary": "max 15 words - encouraging progress with numbers",
  "wins": ["max 12 words each - 1-2 wins to celebrate"],
  "remaining": "max 10 words - what's left for today"
}

EXAMPLES OF GOOD (SHORT) RESPONSES:
- "42g protein from that burrito - solid choice!"
- "Add Greek yogurt this afternoon for an easy +15g protein."
- "Down 3.2kg this month - you're 32% to your goal!"
- "You've logged 6 days straight - consistency wins."
- "380 cal left - perfect for a light dinner."

CRITICAL RULES:
- MAXIMUM 15 words per field (wins: 12 words each)
- Be punchy, not preachy
- Reference their actual meals by name
- Include specific numbers when possible
- Sound like a supportive friend, not a lecture`;

  return callWithFallback(primaryKey, backupKey, async (apiKey) => {
    const content = await callGroqText(prompt, apiKey);
    const parsed = parseJsonResponse<{
      patternInsight: string;
      actionItem: string;
      progressSummary: string;
      wins: string[];
      remaining: string;
    }>(content);

    return {
      patternInsight: parsed.patternInsight || 'Keep tracking to see your patterns!',
      actionItem: parsed.actionItem || 'Log your next meal to stay on track.',
      progressSummary: parsed.progressSummary || 'Every day of tracking is progress.',
      wins: parsed.wins || ['You showed up today - that matters!'],
      remaining: parsed.remaining || `${remaining} calories remaining`,
      generatedAt: new Date().toISOString(),
    };
  });
}

export async function generateWeeklyInsights(
  dailyLogs: DailyLog[],
  weighIns: WeighIn[],
  settings: UserSettings,
  _profile: UserProfile | null,
  primaryKey: string | undefined,
  backupKey?: string
): Promise<WeeklyInsights> {
  // Get last 7 days of logs
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const weekLogs = dailyLogs.filter(log => {
    const logDate = new Date(log.date);
    return logDate >= weekAgo && logDate <= today;
  });

  const recentWeighIns = weighIns.filter(w => {
    const wDate = new Date(w.date);
    return wDate >= weekAgo && wDate <= today;
  });

  // Format data compactly
  const logsData = weekLogs.map(log => ({
    date: log.date,
    meals: log.meals.length,
    workout: log.workoutCalories || 0,
  }));

  const targetCals = Math.round((settings.dailyCalorieTargetMin + settings.dailyCalorieTargetMax) / 2);
  const weightChange = recentWeighIns.length >= 2
    ? (recentWeighIns[recentWeighIns.length - 1].weight - recentWeighIns[0].weight).toFixed(1)
    : 'N/A';

  const prompt = `Analyze this week's nutrition data and provide insights.

GOAL: ${settings.goalWeight < settings.startWeight ? 'Lose' : settings.goalWeight > settings.startWeight ? 'Gain' : 'Maintain'} weight (start: ${settings.startWeight}kg, target: ${settings.goalWeight}kg)
TARGET: ${targetCals} cal/day
WEEK DATA: ${JSON.stringify(logsData)}
WEIGHT CHANGE: ${weightChange}kg this week
DAYS LOGGED: ${weekLogs.length}/7

Return ONLY JSON (no markdown):
{
  "summary": "2-3 sentence week overview",
  "patterns": ["pattern1", "pattern2"],
  "wins": ["achievement"],
  "suggestions": ["tip1", "tip2"]
}

Be encouraging but honest. Focus on actionable insights.`;

  return callWithFallback(primaryKey, backupKey, async (apiKey) => {
    const content = await callGroqText(prompt, apiKey);
    const parsed = parseJsonResponse<{
      summary: string;
      patterns: string[];
      wins: string[];
      suggestions: string[];
    }>(content);

    return {
      summary: parsed.summary || 'Week summary unavailable',
      patterns: parsed.patterns || [],
      wins: parsed.wins || [],
      suggestions: parsed.suggestions || [],
      generatedAt: new Date().toISOString(),
    };
  });
}

export async function generateMonthlyInsights(
  dailyLogs: DailyLog[],
  weighIns: WeighIn[],
  inBodyScans: InBodyScan[],
  settings: UserSettings,
  _profile: UserProfile | null,
  primaryKey: string | undefined,
  backupKey?: string
): Promise<MonthlyInsights> {
  // Get last 30 days of data
  const today = new Date();
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);

  const monthLogs = dailyLogs.filter(log => {
    const logDate = new Date(log.date);
    return logDate >= monthAgo && logDate <= today;
  });

  const monthWeighIns = weighIns.filter(w => {
    const wDate = new Date(w.date);
    return wDate >= monthAgo && wDate <= today;
  });

  // Calculate averages
  const daysLogged = monthLogs.length;
  const avgMealsPerDay = daysLogged > 0
    ? (monthLogs.reduce((sum, log) => sum + log.meals.length, 0) / daysLogged).toFixed(1)
    : '0';

  // Weight trend
  const weightStart = monthWeighIns.length > 0 ? monthWeighIns[0].weight : settings.startWeight;
  const weightEnd = monthWeighIns.length > 0 ? monthWeighIns[monthWeighIns.length - 1].weight : weightStart;
  const weightChange = (weightEnd - weightStart).toFixed(1);

  // Goal progress
  const totalToLose = settings.startWeight - settings.goalWeight;
  const lost = settings.startWeight - weightEnd;
  const progressPercent = totalToLose !== 0 ? Math.round((lost / totalToLose) * 100) : 0;

  // InBody data
  const recentScan = inBodyScans.length > 0 ? inBodyScans[inBodyScans.length - 1] : null;

  const prompt = `Analyze this month's fitness data and provide long-term insights.

GOAL: ${settings.goalWeight < settings.startWeight ? 'Lose' : settings.goalWeight > settings.startWeight ? 'Gain' : 'Maintain'} weight
START: ${settings.startWeight}kg, TARGET: ${settings.goalWeight}kg, CURRENT: ${weightEnd}kg
PROGRESS: ${progressPercent}% toward goal
MONTH WEIGHT CHANGE: ${weightChange}kg
DAYS LOGGED: ${daysLogged}/30
AVG MEALS/DAY: ${avgMealsPerDay}
${recentScan ? `BODY FAT: ${recentScan.bodyFatPercent}%, MUSCLE: ${recentScan.muscleMass}kg` : ''}

Return ONLY JSON (no markdown):
{
  "summary": "Month overview in 2-3 sentences",
  "trends": ["trend1", "trend2"],
  "goalPrediction": "When they'll reach goal at current pace",
  "comparison": "Brief comparison to expected progress"
}

Be realistic with predictions. If data is limited, acknowledge it.`;

  return callWithFallback(primaryKey, backupKey, async (apiKey) => {
    const content = await callGroqText(prompt, apiKey);
    const parsed = parseJsonResponse<{
      summary: string;
      trends: string[];
      goalPrediction: string;
      comparison: string;
    }>(content);

    return {
      summary: parsed.summary || 'Month summary unavailable',
      trends: parsed.trends || [],
      goalPrediction: parsed.goalPrediction || 'Not enough data for prediction',
      comparison: parsed.comparison || '',
      generatedAt: new Date().toISOString(),
    };
  });
}
