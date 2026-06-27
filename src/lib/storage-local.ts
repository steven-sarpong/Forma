// Lokaler Fallback (localStorage) für Kühlschrank, Mahlzeiten, Gewicht und
// Training – wird genutzt, solange Supabase nicht konfiguriert ist, und beim
// ersten Login als Quelle für die einmalige Cloud-Migration (lib/migrate-local-data.ts).

import { v4 as uuidv4 } from "uuid";
import { FridgeItem, Meal, WeightEntry, WorkoutPlan, WorkoutLog } from "@/types";

const FRIDGE_KEY = "fridgeai_items";
const MEALS_KEY = "fridgeai_meals";
const WEIGHT_KEY = "fridgeai_weight_entries";
const WORKOUT_PLAN_KEY = "fridgeai_workout_plan";
const WORKOUT_LOG_KEY = "fridgeai_workout_logs";

function isBrowser() {
  return typeof window !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

// ---------- Kühlschrank-Items ----------

export function getFridgeItems(): FridgeItem[] {
  return readJson<FridgeItem[]>(FRIDGE_KEY, []);
}

export function saveFridgeItems(items: FridgeItem[]) {
  writeJson(FRIDGE_KEY, items);
}

export function addFridgeItem(item: Omit<FridgeItem, "id" | "addedAt">): FridgeItem {
  const newItem: FridgeItem = {
    ...item,
    id: uuidv4(),
    addedAt: new Date().toISOString(),
  };
  const items = getFridgeItems();
  items.unshift(newItem);
  saveFridgeItems(items);
  return newItem;
}

export function updateFridgeItem(id: string, updates: Partial<FridgeItem>) {
  const items = getFridgeItems().map((it) => (it.id === id ? { ...it, ...updates } : it));
  saveFridgeItems(items);
}

export function deleteFridgeItem(id: string) {
  const items = getFridgeItems().filter((it) => it.id !== id);
  saveFridgeItems(items);
}

// ---------- Mahlzeiten ----------

export function getMeals(): Meal[] {
  return readJson<Meal[]>(MEALS_KEY, []);
}

export function saveMeals(meals: Meal[]) {
  writeJson(MEALS_KEY, meals);
}

export function addMeal(meal: Omit<Meal, "id">): Meal {
  const newMeal: Meal = { ...meal, id: uuidv4() };
  const meals = getMeals();
  meals.unshift(newMeal);
  saveMeals(meals);
  return newMeal;
}

export function deleteMeal(id: string) {
  const meals = getMeals().filter((m) => m.id !== id);
  saveMeals(meals);
}

// ---------- Gewichtsverlauf ----------

export function getWeightEntries(): WeightEntry[] {
  return readJson<WeightEntry[]>(WEIGHT_KEY, []).sort(
    (a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime()
  );
}

export function saveWeightEntries(entries: WeightEntry[]) {
  writeJson(WEIGHT_KEY, entries);
}

export function addWeightEntry(entry: Omit<WeightEntry, "id">): WeightEntry {
  const newEntry: WeightEntry = { ...entry, id: uuidv4() };
  const entries = getWeightEntries();
  entries.push(newEntry);
  saveWeightEntries(entries);
  return newEntry;
}

export function deleteWeightEntry(id: string) {
  const entries = getWeightEntries().filter((e) => e.id !== id);
  saveWeightEntries(entries);
}

// ---------- Training ----------

export function getWorkoutPlan(): WorkoutPlan | null {
  return readJson<WorkoutPlan | null>(WORKOUT_PLAN_KEY, null);
}

export function saveWorkoutPlan(plan: WorkoutPlan) {
  writeJson(WORKOUT_PLAN_KEY, plan);
}

export function clearWorkoutPlan() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(WORKOUT_PLAN_KEY);
}

export function getWorkoutLogs(): WorkoutLog[] {
  return readJson<WorkoutLog[]>(WORKOUT_LOG_KEY, []).sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );
}

export function addWorkoutLog(log: Omit<WorkoutLog, "id">): WorkoutLog {
  const newLog: WorkoutLog = { ...log, id: uuidv4() };
  const logs = getWorkoutLogs();
  logs.unshift(newLog);
  writeJson(WORKOUT_LOG_KEY, logs);
  return newLog;
}

export function deleteWorkoutLog(id: string) {
  const logs = getWorkoutLogs().filter((l) => l.id !== id);
  writeJson(WORKOUT_LOG_KEY, logs);
}

// ---------- Reset & Migrationshilfen ----------

export function hasAnyLocalData(): boolean {
  return (
    getFridgeItems().length > 0 ||
    getMeals().length > 0 ||
    getWeightEntries().length > 0 ||
    getWorkoutLogs().length > 0 ||
    getWorkoutPlan() !== null
  );
}

export function clearAllLocalData() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(FRIDGE_KEY);
  window.localStorage.removeItem(MEALS_KEY);
  window.localStorage.removeItem(WEIGHT_KEY);
  window.localStorage.removeItem(WORKOUT_PLAN_KEY);
  window.localStorage.removeItem(WORKOUT_LOG_KEY);
}
