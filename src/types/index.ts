// Zentrale Typdefinitionen für FridgeAI / SmartMeal Tracker

export type FoodCategory =
  | "Gemüse"
  | "Obst"
  | "Fleisch"
  | "Fisch"
  | "Milchprodukte"
  | "Getränke"
  | "Tiefkühl"
  | "Vorrat"
  | "Sonstiges";

export const FOOD_CATEGORIES: FoodCategory[] = [
  "Gemüse",
  "Obst",
  "Fleisch",
  "Fisch",
  "Milchprodukte",
  "Getränke",
  "Tiefkühl",
  "Vorrat",
  "Sonstiges",
];

export interface FridgeItem {
  id: string;
  name: string;
  category: FoodCategory;
  quantity?: string;
  expiryDate?: string; // ISO-Datum, optional
  confidence?: number; // 0-1, gesetzt wenn per KI-Scan erkannt
  addedAt: string; // ISO-Datum
  source: "scan" | "manual";
}

export interface DetectedItem {
  name: string;
  category: FoodCategory;
  confidence: number;
  estimated_quantity?: string;
}

export interface ScanResult {
  detected_items: DetectedItem[];
}

export type RecipeCategory =
  | "Schnell & einfach"
  | "Gesund"
  | "Für Kinder geeignet"
  | "High Protein"
  | "Wenig Kalorien"
  | "Resteverwertung";

export const RECIPE_CATEGORIES: RecipeCategory[] = [
  "Schnell & einfach",
  "Gesund",
  "Für Kinder geeignet",
  "High Protein",
  "Wenig Kalorien",
  "Resteverwertung",
];

export interface Macros {
  protein: string;
  carbs: string;
  fat: string;
}

export interface Recipe {
  title: string;
  category: RecipeCategory;
  available_ingredients: string[];
  missing_ingredients: string[];
  prep_time: string;
  calories_estimate: number;
  macros: Macros;
  steps: string[];
}

export interface RecipeResult {
  recipes: Recipe[];
}

export interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number; // Gramm
  carbs: number; // Gramm
  fat: number; // Gramm
  eatenAt: string; // ISO-Datum/Zeit
  source: "manual" | "recipe" | "scan";
  recipeTitle?: string;
}

export interface MealScanItem {
  name: string;
  estimated_quantity?: string;
}

export interface MealScanResult {
  meal_name: string;
  confidence: number;
  items: MealScanItem[];
  calories_estimate: number;
  macros: Macros;
}

export interface AppSettings {
  hasApiKeyHint: boolean;
}
