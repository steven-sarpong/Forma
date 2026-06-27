// Zentrale AI-Service-Schicht: kapselt alle Aufrufe an OpenRouter.
// Läuft ausschließlich serverseitig (API-Routes), damit der OPENROUTER_API_KEY
// nie an den Client gelangt.

import { RecipeCategory } from "@/types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

interface OpenRouterMessage {
  role: "system" | "user";
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;
}

class AIServiceError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "AIServiceError";
  }
}

function getEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new AIServiceError(`Umgebungsvariable ${name} ist nicht gesetzt.`);
  }
  return value;
}

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new AIServiceError(
      "OPENROUTER_API_KEY fehlt. Bitte in .env.local eintragen (siehe .env.example)."
    );
  }
  return key;
}

async function callOpenRouter(
  model: string,
  messages: OpenRouterMessage[],
  jsonMode = true,
  maxTokens = 2000
): Promise<string> {
  const apiKey = getApiKey();

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:3000",
      "X-Title": process.env.OPENROUTER_SITE_NAME || "FridgeAI",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
      max_tokens: maxTokens,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new AIServiceError(
      `OpenRouter-Anfrage fehlgeschlagen (Status ${response.status}): ${text}`
    );
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new AIServiceError("OpenRouter-Antwort enthielt keinen verwertbaren Inhalt.");
  }
  return content;
}

// Versucht zunächst das Hauptmodell, fällt bei Fehlern automatisch auf das
// Fallback-Modell zurück. Wirft erst, wenn beide Modelle fehlschlagen.
async function callWithFallback(
  primaryModel: string,
  fallbackModel: string,
  messages: OpenRouterMessage[],
  jsonMode = true,
  maxTokens = 2000
): Promise<{ content: string; modelUsed: string }> {
  try {
    const content = await callOpenRouter(primaryModel, messages, jsonMode, maxTokens);
    return { content, modelUsed: primaryModel };
  } catch (primaryError) {
    console.warn(
      `[ai-service] Hauptmodell "${primaryModel}" fehlgeschlagen, versuche Fallback "${fallbackModel}".`,
      primaryError
    );
    try {
      const content = await callOpenRouter(fallbackModel, messages, jsonMode, maxTokens);
      return { content, modelUsed: fallbackModel };
    } catch (fallbackError) {
      throw new AIServiceError(
        "Sowohl Haupt- als auch Fallback-Modell sind fehlgeschlagen.",
        fallbackError
      );
    }
  }
}

// Wie callWithFallback, aber mit beliebig vielen Modellen in absteigender Priorität.
// Wird für den AI-Coach genutzt: Claude Sonnet -> Gemini 2.5 Flash -> kostenloses Nemotron.
async function callWithFallbackChain(
  models: string[],
  messages: OpenRouterMessage[],
  jsonMode = true,
  maxTokens = 600
): Promise<{ content: string; modelUsed: string }> {
  let lastError: unknown;
  for (const model of models) {
    try {
      const content = await callOpenRouter(model, messages, jsonMode, maxTokens);
      return { content, modelUsed: model };
    } catch (err) {
      console.warn(`[ai-service] Modell "${model}" fehlgeschlagen, versuche nächstes Modell.`, err);
      lastError = err;
    }
  }
  throw new AIServiceError("Alle konfigurierten KI-Modelle sind fehlgeschlagen.", lastError);
}

function safeJsonParse<T>(raw: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Manche Modelle umschließen JSON mit Markdown-Codeblöcken trotz response_format.
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        // fällt durch zum Fehler unten
      }
    }
    throw new AIServiceError("KI-Antwort konnte nicht als JSON interpretiert werden.");
  }
}

// ---------- Kühlschrank-Scan ----------

const SCAN_SYSTEM_PROMPT = `Analysiere dieses Bild eines Kühlschranks, einer Einkaufstüte oder einzelner Lebensmittel. Erkenne alle sichtbaren Lebensmittel so genau wie möglich. Gib ausschließlich valides JSON zurück. Keine Erklärung, kein Markdown.

Format:
{
  "detected_items": [
    {
      "name": "Lebensmittelname auf Deutsch",
      "category": "Gemüse | Obst | Fleisch | Fisch | Milchprodukte | Getränke | Tiefkühl | Vorrat | Sonstiges",
      "estimated_quantity": "geschätzte Menge",
      "confidence": 0.0
    }
  ]
}

Wenn du unsicher bist, nutze realistische Namen und setze die confidence entsprechend niedriger.
Erkenne nur tatsächlich im Bild sichtbare Lebensmittel, keine Mehrfachnennungen. Wenn nichts erkennbar ist, gib ein leeres "detected_items"-Array zurück.`;

export async function analyzeFridgeImage(imageBase64DataUrl: string) {
  const primaryModel = getEnv("OPENROUTER_PRIMARY_MODEL", "google/gemini-2.5-flash");
  const fallbackModel = getEnv("OPENROUTER_FALLBACK_MODEL", "google/gemma-4-26b-a4b-it:free");

  const messages: OpenRouterMessage[] = [
    { role: "system", content: SCAN_SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        { type: "text", text: "Analysiere dieses Kühlschrank-/Lebensmittelfoto." },
        { type: "image_url", image_url: { url: imageBase64DataUrl } },
      ],
    },
  ];

  const { content, modelUsed } = await callWithFallback(primaryModel, fallbackModel, messages);
  const parsed = safeJsonParse<{ detected_items: unknown[] }>(content);
  return { ...parsed, modelUsed };
}

// ---------- Mahlzeiten-Scan ----------

const MEAL_SCAN_SYSTEM_PROMPT = `Du bist ein erfahrener Ernährungsberater und Koch, der Fotos von zubereitetem Essen analysiert,
um Kalorien und Makronährstoffe für eine Meal-Tracking-App zu schätzen.
Antworte AUSSCHLIESSLICH mit validem JSON in genau diesem Format, ohne zusätzlichen Text:

{
  "meal_name": "Spaghetti Bolognese",
  "confidence": 0.85,
  "items": [
    { "name": "Spaghetti", "estimated_quantity": "ca. 200g" },
    { "name": "Hackfleischsoße", "estimated_quantity": "ca. 150g" }
  ],
  "calories_estimate": 650,
  "macros": { "protein": "28g", "carbs": "75g", "fat": "22g" }
}

Regeln:
- "meal_name" ist eine kurze, alltagstaugliche Bezeichnung des gesamten Gerichts auf dem Foto
- "confidence" ist eine Zahl zwischen 0 und 1, wie sicher du dir bei der Erkennung bist
- "items" listet die wichtigsten erkennbaren Bestandteile der Mahlzeit auf (2-6 Einträge)
- "calories_estimate" ist eine realistische Schätzung der Gesamtkalorien (kcal) der kompletten Portion auf dem Foto
- "macros" sind grobe Schätzungen in Gramm als String mit "g"-Suffix, bezogen auf die gesamte Portion
- Schätze nach gesundem Menschenverstand basierend auf Portionsgröße, sichtbaren Zutaten und typischen Zubereitungsarten
- Wenn auf dem Foto kein Essen erkennbar ist, setze "meal_name" auf "Unbekannt", "confidence" auf 0 und alle Schätzwerte auf 0`;

export async function analyzeMealImage(imageBase64DataUrl: string) {
  const primaryModel = getEnv("OPENROUTER_PRIMARY_MODEL", "google/gemini-2.5-flash");
  const fallbackModel = getEnv("OPENROUTER_FALLBACK_MODEL", "google/gemma-4-26b-a4b-it:free");

  const messages: OpenRouterMessage[] = [
    { role: "system", content: MEAL_SCAN_SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        { type: "text", text: "Analysiere dieses Foto einer Mahlzeit und schätze Kalorien sowie Makros." },
        { type: "image_url", image_url: { url: imageBase64DataUrl } },
      ],
    },
  ];

  const { content, modelUsed } = await callWithFallback(primaryModel, fallbackModel, messages);
  const parsed = safeJsonParse<{
    meal_name: string;
    confidence: number;
    items: unknown[];
    calories_estimate: number;
    macros: { protein: string; carbs: string; fat: string };
  }>(content);
  return { ...parsed, modelUsed };
}

// ---------- Rezeptvorschläge ----------

const RECIPE_SYSTEM_PROMPT = `Du bist ein kreativer, ernährungsbewusster Koch-Assistent für eine Meal-Tracking-App.
Erstelle Rezeptvorschläge basierend auf den vorhandenen Kühlschrank-Zutaten des Nutzers.
Antworte AUSSCHLIESSLICH mit validem JSON in genau diesem Format, ohne zusätzlichen Text:

{
  "recipes": [
    {
      "title": "Tomaten-Mozzarella-Omelett",
      "category": "Schnell & einfach",
      "available_ingredients": ["Tomaten", "Eier", "Mozzarella"],
      "missing_ingredients": ["Basilikum"],
      "prep_time": "15 Minuten",
      "calories_estimate": 520,
      "macros": { "protein": "32g", "carbs": "12g", "fat": "38g" },
      "steps": ["Tomaten waschen und schneiden.", "Eier verquirlen.", "Alles in der Pfanne braten."]
    }
  ]
}

Regeln:
- "category" muss exakt einer dieser Werte sein: Schnell & einfach, Gesund, Für Kinder geeignet, High Protein, Wenig Kalorien, Resteverwertung
- Nutze bevorzugt die vorhandenen Zutaten, "missing_ingredients" soll möglichst kurz sein
- "calories_estimate" ist eine ganze Zahl (kcal pro Portion)
- "macros" sind grobe Schätzungen in Gramm als String mit "g"-Suffix
- "steps" sind 3-6 kurze, klare Schritte
- Erstelle 3-6 unterschiedliche Rezepte, möglichst aus unterschiedlichen Kategorien`;

export async function generateRecipes(
  fridgeItemNames: string[],
  preferredCategory?: RecipeCategory
) {
  const textModel = getEnv("OPENROUTER_TEXT_MODEL", "openai/gpt-4o-mini");
  const fallbackModel = getEnv("OPENROUTER_FALLBACK_MODEL", "google/gemma-4-26b-a4b-it:free");

  const categoryHint = preferredCategory
    ? `Fokussiere dich besonders auf die Kategorie "${preferredCategory}".`
    : "Decke nach Möglichkeit mehrere Kategorien ab.";

  const userPrompt = `Verfügbare Zutaten im Kühlschrank: ${
    fridgeItemNames.length > 0 ? fridgeItemNames.join(", ") : "(keine erfasst)"
  }.
${categoryHint}`;

  const messages: OpenRouterMessage[] = [
    { role: "system", content: RECIPE_SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  const { content, modelUsed } = await callWithFallback(textModel, fallbackModel, messages);
  const parsed = safeJsonParse<{ recipes: unknown[] }>(content);
  return { ...parsed, modelUsed };
}

// ---------- AI Coach ----------

const COACH_SYSTEM_PROMPT = `Du bist ein freundlicher, motivierender persönlicher Fitness- und Ernährungscoach in einer Tracking-App.
Du sprichst den Nutzer direkt und natürlich auf Deutsch an (Du-Form), wie ein guter Personal Trainer, nicht wie ein Bot.
Du bekommst aktuelle Tageswerte, Ziele und Profildaten des Nutzers. Formuliere darauf basierend eine kurze, persönliche Coach-Nachricht.

Antworte AUSSCHLIESSLICH mit validem JSON in genau diesem Format, ohne zusätzlichen Text:
{
  "message": "Kurze, konkrete und motivierende Nachricht (max. 2-3 Sätze)",
  "tip": "Ein einzelner, konkreter und umsetzbarer Tipp für heute (max. 1 Satz)"
}

Regeln:
- Beziehe dich auf konkrete Zahlen (z.B. fehlende Proteinmenge, Kaloriendefizit, Fortschritt zum Zielgewicht), wenn vorhanden
- Sei ehrlich aber wohlwollend, niemals beschämend oder streng
- Variiere den Ton je nach Tageszeit und Fortschritt (z.B. morgens motivierend, abends zusammenfassend)
- Keine generischen Plattitüden, die zu jedem Tag passen würden`;

export interface CoachContext {
  goal: string;
  calorieGoal: number;
  caloriesSoFar: number;
  proteinGoalG: number;
  proteinSoFar: number;
  carbsGoalG: number;
  carbsSoFar: number;
  fatGoalG: number;
  fatSoFar: number;
  waterGoalMl: number;
  weeklyWeightChangeKg: number;
  weeksToGoal: number | null;
  currentWeightKg: number;
  targetWeightKg: number;
  timeOfDay: "morgens" | "mittags" | "abends" | "nachts";
}

export async function generateCoachMessage(ctx: CoachContext) {
  const primaryModel = getEnv("OPENROUTER_COACH_MODEL", "anthropic/claude-3.5-sonnet");
  const secondaryModel = getEnv("OPENROUTER_PRIMARY_MODEL", "google/gemini-2.5-flash");
  const freeModel = getEnv("OPENROUTER_COACH_FREE_MODEL", "nvidia/nemotron-nano-9b-v2:free");

  const userPrompt = `Profil & heutiger Stand des Nutzers:
- Ziel: ${ctx.goal}
- Aktuelles Gewicht: ${ctx.currentWeightKg} kg, Zielgewicht: ${ctx.targetWeightKg} kg
- Erwartete Veränderung: ${ctx.weeklyWeightChangeKg} kg/Woche${
    ctx.weeksToGoal ? `, Prognose: ${ctx.weeksToGoal} Wochen bis zum Ziel` : ""
  }
- Tageszeit: ${ctx.timeOfDay}
- Kalorien: ${Math.round(ctx.caloriesSoFar)} / ${ctx.calorieGoal} kcal
- Protein: ${Math.round(ctx.proteinSoFar)} / ${ctx.proteinGoalG} g
- Kohlenhydrate: ${Math.round(ctx.carbsSoFar)} / ${ctx.carbsGoalG} g
- Fett: ${Math.round(ctx.fatSoFar)} / ${ctx.fatGoalG} g
- Wasserziel: ${(ctx.waterGoalMl / 1000).toFixed(1)} L`;

  const messages: OpenRouterMessage[] = [
    { role: "system", content: COACH_SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  const { content, modelUsed } = await callWithFallbackChain(
    [primaryModel, secondaryModel, freeModel],
    messages
  );
  const parsed = safeJsonParse<{ message: string; tip: string }>(content);
  return { ...parsed, modelUsed };
}

// ---------- Trainingsplan-Generator ----------

const WORKOUT_SYSTEM_PROMPT = `Du bist ein erfahrener Personal Trainer, der individuelle Trainingspläne für eine Fitness-App erstellt.
Antworte AUSSCHLIESSLICH mit validem JSON in genau diesem Format, ohne zusätzlichen Text:

{
  "days": [
    {
      "name": "Tag 1 - Push",
      "focus": "Brust, Schulter, Trizeps",
      "exercises": [
        { "name": "Bankdrücken", "muscleGroup": "Brust", "sets": 4, "reps": "8-10", "restSeconds": 90, "notes": "Langsame Ausführung, volle Range of Motion" }
      ]
    }
  ]
}

Regeln:
- Erstelle genau so viele Trainingstage, wie der Nutzer pro Woche trainieren möchte
- Wähle eine sinnvolle Aufteilung (z.B. Ganzkörper bei 2-3x/Woche, Push/Pull/Legs oder Oberkörper/Unterkörper bei 4-6x/Woche)
- Passe Übungsauswahl, Wiederholungsbereiche und Satzzahl an das Ziel an:
  - Muskelaufbau: 6-12 Wiederholungen, 3-5 Sätze, Fokus auf progressive Overload
  - Abnehmen / Body Recomposition: Mix aus Kraft und höheren Wiederholungen (10-15), kürzere Pausen, mehr Gesamtvolumen
  - Gesünder leben: moderates Ganzkörpertraining, 10-15 Wiederholungen, Fokus auf Technik und Nachhaltigkeit
- Jeder Trainingstag soll 5-7 Übungen enthalten, sinnvoll nach Muskelgruppen sortiert
- "restSeconds" ist die empfohlene Pause zwischen den Sätzen in Sekunden
- Nutze deutsche Übungsnamen, die in jedem Fitnessstudio nachvollziehbar sind`;

export interface WorkoutPlanInput {
  goal: string;
  daysPerWeek: number;
  activityLevel: string;
  age: number;
  gender: string;
}

export async function generateWorkoutPlan(input: WorkoutPlanInput) {
  const textModel = getEnv("OPENROUTER_TEXT_MODEL", "openai/gpt-4o-mini");
  const fallbackModel = getEnv("OPENROUTER_FALLBACK_MODEL", "google/gemma-4-26b-a4b-it:free");

  const userPrompt = `Erstelle einen Trainingsplan für folgenden Nutzer:
- Ziel: ${input.goal}
- Trainingstage pro Woche: ${input.daysPerWeek}
- Aktivitätslevel: ${input.activityLevel}
- Alter: ${input.age}
- Geschlecht: ${input.gender}`;

  const messages: OpenRouterMessage[] = [
    { role: "system", content: WORKOUT_SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  const { content, modelUsed } = await callWithFallback(textModel, fallbackModel, messages, true, 3000);
  const parsed = safeJsonParse<{ days: unknown[] }>(content);
  return { ...parsed, modelUsed };
}

export { AIServiceError };
