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

interface InBodyExtractedData {
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

export interface HealthDataExtracted {
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

export async function extractHealthData(
  imageBase64: string,
  apiKey: string
): Promise<HealthDataExtracted> {
  const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this Apple Health app screenshot and extract health metrics. Return ONLY a JSON object with these keys (use null if not visible):

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
- Return ONLY the JSON object, no other text`,
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
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to analyze image');
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error('No response from API');
  }

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    const parsed = JSON.parse(jsonMatch[0]);
    // Ensure workouts is always an array
    if (!parsed.workouts) {
      parsed.workouts = [];
    }
    return parsed;
  } catch {
    console.error('Failed to parse response:', content);
    throw new Error('Failed to parse health data from image');
  }
}

export async function extractInBodyData(
  imageBase64: string,
  apiKey: string
): Promise<InBodyExtractedData> {
  const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this InBody body composition scan report. Extract ALL available metrics with high precision. Return ONLY valid JSON (no markdown) with this structure:

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
10. Return ONLY the JSON object, no explanations or markdown formatting`,
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
      max_tokens: 800,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to analyze image');
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error('No response from API');
  }

  // Parse the JSON response
  try {
    // Try to extract JSON from the response (in case there's extra text)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    return JSON.parse(jsonMatch[0]);
  } catch {
    console.error('Failed to parse response:', content);
    throw new Error('Failed to parse InBody data from image');
  }
}
