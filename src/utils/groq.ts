// Groq API integration for vision tasks
// Uses Llama 3.2 Vision model (free tier available)

import type { Recipe } from '../types';

export interface GroqFoodAnalysis {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
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

async function callGroqVision(
  imageBase64: string,
  prompt: string,
  apiKey: string
): Promise<string> {
  const response = await fetch(GROQ_API_URL, {
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
  const response = await fetch(GROQ_API_URL, {
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
  } catch (e) {
    console.error('Failed to parse Groq response:', content);
    throw new Error('Failed to parse response from Groq');
  }
}

export async function groqAnalyzeFood(
  imageBase64: string,
  apiKey: string
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
    "sugar": <number in grams>,
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
- sugar: total sugars including natural and added sugars`;

  const content = await callGroqVision(imageBase64, prompt, apiKey);

  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found');
    }
    const parsed = JSON.parse(jsonMatch[0]);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (e) {
    console.error('Failed to parse food response:', content);
    throw new Error('Failed to parse food analysis from Groq');
  }
}

export async function groqFormatRecipeText(
  rawText: string,
  apiKey: string
): Promise<Recipe> {
  const prompt = `You are a recipe formatter. Convert the user text into structured JSON that matches this schema:

{
  "servings": number | null,
  "totalTime": number | null,
  "nutrition": { "calories": number | null, "protein": number | null, "carbs": number | null, "fat": number | null, "fiber": number | null, "sugar": number | null } | null,
  "sections": [
    {
      "title": string,
      "ingredients": [ { "item": string, "portion": string } ],
      "nutrition": { "calories": number | null, "protein": number | null, "carbs": number | null, "fat": number | null, "fiber": number | null, "sugar": number | null } | null,
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
- sugar: total sugars in grams
- Return ONLY JSON, no markdown.

User text:
${rawText}`;

  const content = await callGroqText(prompt, apiKey);
  const parsed = parseJsonResponse<Recipe>(content);
  return {
    ...parsed,
    rawText: rawText.trim(),
  };
}

export async function groqExtractInBodyData(
  imageBase64: string,
  apiKey: string
): Promise<GroqInBodyData> {
  const prompt = `Analyze this InBody body composition scan report. Extract ALL available metrics with high precision. Return ONLY valid JSON (no markdown) with this structure:

{
  "scanDate": "YYYY-MM-DD format from the scan",
  "weight": number in kg,
  "bodyFatPercent": number (percentage, not decimal),
  "muscleMass": number in kg,
  "skeletalMuscle": number in kg,
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
6. Return ONLY the JSON object, no explanations or markdown formatting`;

  const content = await callGroqVision(imageBase64, prompt, apiKey);
  return parseJsonResponse<GroqInBodyData>(content);
}

export async function groqExtractHealthData(
  imageBase64: string,
  apiKey: string
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

  const content = await callGroqVision(imageBase64, prompt, apiKey);
  const parsed = parseJsonResponse<GroqHealthData>(content);

  // Ensure workouts is always an array
  if (!parsed.workouts) {
    parsed.workouts = [];
  }

  return parsed;
}
