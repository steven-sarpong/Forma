// Client-seitige Schicht für den AI-Coach: ruft /api/coach auf und cached
// die Nachricht pro Tag (+ Tageszeit-Slot) in localStorage, damit nicht bei
// jedem Dashboard-Aufruf erneut die KI angefragt wird.

import { NutritionGoals, UserProfile } from "@/types";

const COACH_CACHE_KEY = "fridgeai_coach_cache";

export interface CoachMessage {
  message: string;
  tip: string;
  modelUsed: string;
  generatedAt: string;
}

interface CoachCache {
  cacheKey: string;
  data: CoachMessage;
}

function isBrowser() {
  return typeof window !== "undefined";
}

function getTimeOfDay(): "morgens" | "mittags" | "abends" | "nachts" {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return "morgens";
  if (hour >= 11 && hour < 17) return "mittags";
  if (hour >= 17 && hour < 22) return "abends";
  return "nachts";
}

function buildCacheKey(): string {
  const today = new Date().toDateString();
  return `${today}_${getTimeOfDay()}`;
}

function readCache(): CoachCache | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(COACH_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CoachCache;
  } catch {
    return null;
  }
}

function writeCache(cache: CoachCache) {
  if (!isBrowser()) return;
  window.localStorage.setItem(COACH_CACHE_KEY, JSON.stringify(cache));
}

export async function getCoachMessage(
  profile: UserProfile,
  goals: NutritionGoals,
  todaysTotals: { calories: number; protein: number; carbs: number; fat: number },
  options: { forceRefresh?: boolean } = {}
): Promise<CoachMessage> {
  const cacheKey = buildCacheKey();
  if (!options.forceRefresh) {
    const cached = readCache();
    if (cached && cached.cacheKey === cacheKey) {
      return cached.data;
    }
  }

  const response = await fetch("/api/coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      goal: profile.goal,
      calorieGoal: goals.calorieGoal,
      caloriesSoFar: todaysTotals.calories,
      proteinGoalG: goals.proteinGoalG,
      proteinSoFar: todaysTotals.protein,
      carbsGoalG: goals.carbsGoalG,
      carbsSoFar: todaysTotals.carbs,
      fatGoalG: goals.fatGoalG,
      fatSoFar: todaysTotals.fat,
      waterGoalMl: goals.waterGoalMl,
      weeklyWeightChangeKg: goals.weeklyWeightChangeKg,
      weeksToGoal: goals.weeksToGoal,
      currentWeightKg: profile.weightKg,
      targetWeightKg: profile.targetWeightKg,
      timeOfDay: getTimeOfDay(),
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Unbekannter Fehler" }));
    throw new Error(err.error || "Coach-Nachricht konnte nicht geladen werden.");
  }

  const data = await response.json();
  const coachMessage: CoachMessage = {
    message: data.message,
    tip: data.tip,
    modelUsed: data.modelUsed,
    generatedAt: new Date().toISOString(),
  };

  writeCache({ cacheKey, data: coachMessage });
  return coachMessage;
}

export function clearCoachCache() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(COACH_CACHE_KEY);
}
