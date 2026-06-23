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
  jsonMode = true
): Promise<{ content: string; modelUsed: string }> {
  try {
    const content = await callOpenRouter(primaryModel, messages, jsonMode);
    return { content, modelUsed: primaryModel };
  } catch (primaryError) {
    console.warn(
      `[ai-service] Hauptmodell "${primaryModel}" fehlgeschlagen, versuche Fallback "${fallbackModel}".`,
      primaryError
    );
    try {
      const content = await callOpenRouter(fallbackModel, messages, jsonMode);
      return { content, modelUsed: fallbackModel };
    } catch (fallbackError) {
      throw new AIServiceError(
        "Sowohl Haupt- als auch Fallback-Modell sind fehlgeschlagen.",
        fallbackError
      );
    }
  }
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

const SCAN_SYSTEM_PROMPT = `Du bist ein präziser Lebensmittel-Erkennungsassistent für eine Kühlschrank-Tracking-App.
Analysiere das übermittelte Foto eines Kühlschranks oder einzelner Lebensmittel.
Antworte AUSSCHLIESSLICH mit validem JSON in genau diesem Format, ohne zusätzlichen Text:

{
  "detected_items": [
    {
      "name": "Tomaten",
      "category": "Gemüse",
      "confidence": 0.91,
      "estimated_quantity": "4 Stück"
    }
  ]
}

Regeln:
- "category" muss exakt einer dieser Werte sein: Gemüse, Obst, Fleisch, Fisch, Milchprodukte, Getränke, Tiefkühl, Vorrat, Sonstiges
- "confidence" ist eine Zahl zwischen 0 und 1
- "estimated_quantity" ist eine grobe, für Laien verständliche Schätzung (z. B. "4 Stück", "ca. 500g", "1 Packung")
- Erkenne nur tatsächlich im Bild sichtbare Lebensmittel, keine Mehrfachnennungen
- Wenn nichts erkennbar ist, gib ein leeres "detected_items"-Array zurück`;

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

export { AIServiceError };
