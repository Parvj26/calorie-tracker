// Groq API integration for vision tasks
// Uses Llama 3.2 Vision model (free tier available)

export interface GroqFoodAnalysis {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: 'high' | 'medium' | 'low';
  portionSize: string;
}

export interface GroqInBodyData {
  weight: number | null;
  bodyFatPercent: number | null;
  muscleMass: number | null;
  skeletalMuscle: number | null;
  scanDate: string | null;
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
    "confidence": "high" | "medium" | "low",
    "portionSize": "estimated portion description"
  }
]

Important:
- Be specific with food names
- Estimate based on visible portion size
- Use reasonable nutritional values
- Return an array even for single items
- confidence should reflect how certain you are about the identification`;

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

export async function groqExtractInBodyData(
  imageBase64: string,
  apiKey: string
): Promise<GroqInBodyData> {
  const prompt = `Analyze this InBody scan result image and extract the following metrics. Return ONLY a JSON object with these exact keys (use null if a value cannot be found):

{
  "weight": <number in kg>,
  "bodyFatPercent": <number, just the percentage value>,
  "muscleMass": <number in kg, this might be labeled as "Lean Body Mass" or "Fat Free Mass">,
  "skeletalMuscle": <number in kg, labeled as "Skeletal Muscle Mass" or "SMM">,
  "scanDate": "<date in YYYY-MM-DD format if visible, otherwise null>"
}

Important:
- Extract numerical values only (no units in the JSON)
- For body fat percentage, just provide the number (e.g., 25.5 not "25.5%")
- If the scan shows multiple readings, use the most prominent/main values
- Return ONLY the JSON object, no other text`;

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
