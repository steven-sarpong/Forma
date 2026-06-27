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

export interface NutritionPer100g {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
}

export interface FridgeItem {
  id: string;
  name: string;
  category: FoodCategory;
  quantity?: string; // freie Anzeige-Menge (z.B. aus KI-Scan: "4 Stück")
  quantityValue?: number; // numerische Menge für Nährwert-Berechnung
  quantityUnit?: string; // g, ml, Stück, Packung ...
  expiryDate?: string; // ISO-Datum, optional
  confidence?: number; // 0-1, gesetzt wenn per KI-Scan erkannt
  addedAt: string; // ISO-Datum
  source: "scan" | "manual";
  nutritionPer100g?: NutritionPer100g;
  nutritionEstimated?: boolean; // true, wenn Werte aus Fallback-Durchschnitt stammen statt aus der DB
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

export interface MealScanItem {
  name: string;
  estimated_quantity?: string;
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
  confidence?: number; // 0-1, gesetzt wenn per KI-Scan erkannt
  items?: MealScanItem[]; // erkannte Bestandteile, falls per KI-Scan erfasst
  modelUsed?: string; // genutztes KI-Modell, falls per Scan erfasst
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

// ---------- Nutzerprofil & Onboarding ----------

export type Gender = "männlich" | "weiblich" | "divers";

export type ActivityLevel =
  | "sitzend" // wenig bis keine Bewegung
  | "leicht" // 1-2x Sport/Woche
  | "moderat" // 3-4x Sport/Woche
  | "aktiv" // 5-6x Sport/Woche
  | "sehr_aktiv"; // täglich intensiv / körperliche Arbeit

export const ACTIVITY_LEVEL_LABELS: Record<ActivityLevel, string> = {
  sitzend: "Sitzend (Bürojob, kaum Bewegung)",
  leicht: "Leicht aktiv (1-2x Sport/Woche)",
  moderat: "Moderat aktiv (3-4x Sport/Woche)",
  aktiv: "Aktiv (5-6x Sport/Woche)",
  sehr_aktiv: "Sehr aktiv (täglich intensiv / körperliche Arbeit)",
};

export type FitnessGoal = "abnehmen" | "muskelaufbau" | "recomposition" | "gesuender_leben";

export const FITNESS_GOAL_LABELS: Record<FitnessGoal, string> = {
  abnehmen: "Abnehmen",
  muskelaufbau: "Muskelaufbau",
  recomposition: "Body Recomposition",
  gesuender_leben: "Gesünder leben",
};

export type BudgetLevel = "niedrig" | "mittel" | "hoch";
export type CookingTimeLevel = "wenig" | "mittel" | "viel";

export interface UserProfile {
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  activityLevel: ActivityLevel;
  trainingFrequency: number; // Trainingseinheiten pro Woche
  bodyFatPercent?: number;
  stepsPerDay?: number;
  occupation?: string;
  eatingHabits?: string;
  allergies?: string[];
  intolerances?: string[];
  favoriteFoods?: string[];
  dislikedFoods?: string[];
  budget?: BudgetLevel;
  cookingTime?: CookingTimeLevel;
  goal: FitnessGoal;
  displayName?: string; // für Social-Features (Freunde, Leaderboard) sichtbarer Name
  createdAt: string;
  updatedAt: string;
}

// ---------- Training ----------

export interface WorkoutExercise {
  name: string;
  muscleGroup: string;
  sets: number;
  reps: string; // z.B. "8-12" oder "12-15"
  restSeconds: number;
  notes?: string;
}

export interface WorkoutDay {
  name: string; // z.B. "Tag 1 - Push"
  focus: string; // z.B. "Brust, Schulter, Trizeps"
  exercises: WorkoutExercise[];
}

export interface WorkoutPlan {
  id: string;
  goal: FitnessGoal;
  daysPerWeek: number;
  days: WorkoutDay[];
  createdAt: string;
  modelUsed: string;
}

export interface WorkoutLog {
  id: string;
  dayName: string;
  durationMinutes: number;
  caloriesBurned: number;
  completedAt: string; // ISO-Datum
}

export interface WeightEntry {
  id: string;
  weightKg: number;
  bodyFatPercent?: number;
  note?: string;
  loggedAt: string; // ISO-Datum
}

export type BmiCategory = "Untergewicht" | "Normalgewicht" | "Übergewicht" | "Adipositas";

// ---------- Gamification ----------

export type BadgeId =
  | "erster_scan"
  | "meal_tracker"
  | "wochen_champion"
  | "trainings_starter"
  | "eisensportler"
  | "gewichts_tracker"
  | "zielgewicht_erreicht"
  | "streak_master";

export interface BadgeDefinition {
  id: BadgeId;
  name: string;
  description: string;
  icon: string; // lucide-react Icon-Name
}

export interface GamificationStats {
  xp: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null; // ISO-Datum (nur Tag), letzte XP-Aktivität
  unlockedBadgeIds: BadgeId[];
}

export interface LevelInfo {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progress: number; // 0-1
}

export type XpReason = "meal" | "scan" | "weight" | "workout";

export interface NutritionGoals {
  bmr: number; // Grundumsatz (kcal)
  tdee: number; // Gesamtumsatz (kcal)
  calorieGoal: number; // Kalorienziel (kcal)
  proteinGoalG: number;
  carbsGoalG: number;
  fatGoalG: number;
  waterGoalMl: number;
  stepsGoal: number;
  weeklyWeightChangeKg: number; // erwartete Veränderung pro Woche (negativ = Abnahme)
  weeksToGoal: number | null; // realistische Prognose bis Zielgewicht
}

// ---------- Social ----------

export type FriendshipStatus = "pending" | "accepted";

export interface Friendship {
  id: string;
  userId: string; // hat die Anfrage gesendet
  friendId: string; // hat die Anfrage erhalten
  status: FriendshipStatus;
  createdAt: string;
}

export interface FriendListEntry {
  friendshipId: string;
  userId: string; // der Freund (nicht der angemeldete Nutzer)
  displayName: string;
}

export interface FriendRequestEntry {
  friendshipId: string;
  userId: string; // wer die Anfrage gesendet hat
  displayName: string;
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  xp: number;
  level: number;
  currentStreak: number;
  isSelf: boolean;
}

// ---------- Challenges & Aktivitäts-Feed ----------

export type ChallengeGoalType = "xp";
export type ChallengeParticipantStatus = "invited" | "accepted" | "declined";

export interface ChallengeParticipantProgress {
  userId: string;
  displayName: string;
  status: ChallengeParticipantStatus;
  progress: number; // XP seit Beitritt
  isSelf: boolean;
}

export interface ChallengeSummary {
  id: string;
  creatorId: string;
  name: string;
  goalType: ChallengeGoalType;
  targetValue: number;
  startsAt: string;
  endsAt: string;
  myStatus: ChallengeParticipantStatus;
  participants: ChallengeParticipantProgress[];
}

export type ActivityType = "level_up" | "badge_unlock";

export interface ActivityFeedEntry {
  id: string;
  userId: string;
  displayName: string;
  type: ActivityType;
  message: string;
  createdAt: string;
  isSelf: boolean;
}
