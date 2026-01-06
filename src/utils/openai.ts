interface InBodyExtractedData {
  weight: number | null;
  bodyFatPercent: number | null;
  muscleMass: number | null;
  skeletalMuscle: number | null;
  scanDate: string | null;
}

export interface HealthDataExtracted {
  steps: number | null;
  activeCalories: number | null;
  totalCalories: number | null;
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
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
  "activeCalories": <active/exercise calories burned as number>,
  "totalCalories": <total calories burned including resting as number>,
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
- Extract numerical values only (no units)
- If showing activity rings, Move = activeCalories, Exercise = exerciseMinutes, Stand = standHours
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
  } catch (e) {
    console.error('Failed to parse response:', content);
    throw new Error('Failed to parse health data from image');
  }
}

export async function extractInBodyData(
  imageBase64: string,
  apiKey: string
): Promise<InBodyExtractedData> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
              text: `Analyze this InBody scan result image and extract the following metrics. Return ONLY a JSON object with these exact keys (use null if a value cannot be found):

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
      max_tokens: 500,
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
  } catch (e) {
    console.error('Failed to parse response:', content);
    throw new Error('Failed to parse InBody data from image');
  }
}
