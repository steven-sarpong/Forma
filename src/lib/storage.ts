// Persistenzschicht für Kühlschrank, Mahlzeiten, Gewicht und Training.
// Synchronisiert über Supabase (RLS-geschützt pro Nutzer), sobald konfiguriert –
// andernfalls automatischer Fallback auf localStorage (siehe lib/storage-local.ts).

import { v4 as uuidv4 } from "uuid";
import { FridgeItem, Meal, WeightEntry, WorkoutPlan, WorkoutLog } from "@/types";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import * as local from "@/lib/storage-local";

async function getUserId(): Promise<string | null> {
  const { data } = await getSupabaseClient().auth.getUser();
  return data.user?.id ?? null;
}

// ---------- Kühlschrank-Items ----------

interface FridgeItemRow {
  id: string;
  name: string;
  category: string;
  quantity: string | null;
  quantity_value: number | null;
  quantity_unit: string | null;
  expiry_date: string | null;
  confidence: number | null;
  added_at: string;
  source: string;
  nutrition_per_100g: FridgeItem["nutritionPer100g"] | null;
  nutrition_estimated: boolean;
}

function rowToFridgeItem(row: FridgeItemRow): FridgeItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category as FridgeItem["category"],
    quantity: row.quantity ?? undefined,
    quantityValue: row.quantity_value ?? undefined,
    quantityUnit: row.quantity_unit ?? undefined,
    expiryDate: row.expiry_date ?? undefined,
    confidence: row.confidence ?? undefined,
    addedAt: row.added_at,
    source: row.source as FridgeItem["source"],
    nutritionPer100g: row.nutrition_per_100g ?? undefined,
    nutritionEstimated: row.nutrition_estimated,
  };
}

function fridgeItemToRow(item: FridgeItem, userId: string): FridgeItemRow & { user_id: string } {
  return {
    id: item.id,
    user_id: userId,
    name: item.name,
    category: item.category,
    quantity: item.quantity ?? null,
    quantity_value: item.quantityValue ?? null,
    quantity_unit: item.quantityUnit ?? null,
    expiry_date: item.expiryDate ?? null,
    confidence: item.confidence ?? null,
    added_at: item.addedAt,
    source: item.source,
    nutrition_per_100g: item.nutritionPer100g ?? null,
    nutrition_estimated: item.nutritionEstimated ?? false,
  };
}

export async function getFridgeItems(): Promise<FridgeItem[]> {
  if (!isSupabaseConfigured()) return local.getFridgeItems();
  const userId = await getUserId();
  if (!userId) return [];
  const { data, error } = await getSupabaseClient()
    .from("fridge_items")
    .select("*")
    .eq("user_id", userId)
    .order("added_at", { ascending: false });
  if (error || !data) return [];
  return (data as FridgeItemRow[]).map(rowToFridgeItem);
}

export async function addFridgeItem(
  item: Omit<FridgeItem, "id" | "addedAt">
): Promise<FridgeItem> {
  if (!isSupabaseConfigured()) return local.addFridgeItem(item);

  const newItem: FridgeItem = {
    ...item,
    id: uuidv4(),
    addedAt: new Date().toISOString(),
  };
  const userId = await getUserId();
  if (!userId) throw new Error("Nicht angemeldet.");
  const { error } = await getSupabaseClient()
    .from("fridge_items")
    .insert(fridgeItemToRow(newItem, userId));
  if (error) throw new Error(error.message);
  return newItem;
}

export async function updateFridgeItem(id: string, updates: Partial<FridgeItem>): Promise<void> {
  if (!isSupabaseConfigured()) {
    local.updateFridgeItem(id, updates);
    return;
  }
  const userId = await getUserId();
  if (!userId) return;
  const partialRow: Record<string, unknown> = {};
  if (updates.name !== undefined) partialRow.name = updates.name;
  if (updates.category !== undefined) partialRow.category = updates.category;
  if (updates.quantity !== undefined) partialRow.quantity = updates.quantity;
  if (updates.quantityValue !== undefined) partialRow.quantity_value = updates.quantityValue;
  if (updates.quantityUnit !== undefined) partialRow.quantity_unit = updates.quantityUnit;
  if (updates.expiryDate !== undefined) partialRow.expiry_date = updates.expiryDate;
  if (updates.confidence !== undefined) partialRow.confidence = updates.confidence;
  if (updates.nutritionPer100g !== undefined) partialRow.nutrition_per_100g = updates.nutritionPer100g;
  if (updates.nutritionEstimated !== undefined) partialRow.nutrition_estimated = updates.nutritionEstimated;

  await getSupabaseClient().from("fridge_items").update(partialRow).eq("id", id).eq("user_id", userId);
}

export async function deleteFridgeItem(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    local.deleteFridgeItem(id);
    return;
  }
  const userId = await getUserId();
  if (!userId) return;
  await getSupabaseClient().from("fridge_items").delete().eq("id", id).eq("user_id", userId);
}

export async function getExpiringItems(withinDays = 3): Promise<FridgeItem[]> {
  const items = await getFridgeItems();
  const now = Date.now();
  const limit = now + withinDays * 24 * 60 * 60 * 1000;
  return items.filter((it) => {
    if (!it.expiryDate) return false;
    const t = new Date(it.expiryDate).getTime();
    return t <= limit;
  });
}

// ---------- Mahlzeiten ----------

interface MealRow {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  eaten_at: string;
  source: string;
  recipe_title: string | null;
  confidence: number | null;
  items: Meal["items"] | null;
  model_used: string | null;
}

function rowToMeal(row: MealRow): Meal {
  return {
    id: row.id,
    name: row.name,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    eatenAt: row.eaten_at,
    source: row.source as Meal["source"],
    recipeTitle: row.recipe_title ?? undefined,
    confidence: row.confidence ?? undefined,
    items: row.items ?? undefined,
    modelUsed: row.model_used ?? undefined,
  };
}

function mealToRow(meal: Meal, userId: string) {
  return {
    id: meal.id,
    user_id: userId,
    name: meal.name,
    calories: meal.calories,
    protein: meal.protein,
    carbs: meal.carbs,
    fat: meal.fat,
    eaten_at: meal.eatenAt,
    source: meal.source,
    recipe_title: meal.recipeTitle ?? null,
    confidence: meal.confidence ?? null,
    items: meal.items ?? null,
    model_used: meal.modelUsed ?? null,
  };
}

export async function getMeals(): Promise<Meal[]> {
  if (!isSupabaseConfigured()) return local.getMeals();
  const userId = await getUserId();
  if (!userId) return [];
  const { data, error } = await getSupabaseClient()
    .from("meals")
    .select("*")
    .eq("user_id", userId)
    .order("eaten_at", { ascending: false });
  if (error || !data) return [];
  return (data as MealRow[]).map(rowToMeal);
}

export async function addMeal(meal: Omit<Meal, "id">): Promise<Meal> {
  if (!isSupabaseConfigured()) return local.addMeal(meal);

  const newMeal: Meal = { ...meal, id: uuidv4() };
  const userId = await getUserId();
  if (!userId) throw new Error("Nicht angemeldet.");
  const { error } = await getSupabaseClient().from("meals").insert(mealToRow(newMeal, userId));
  if (error) throw new Error(error.message);
  return newMeal;
}

export async function deleteMeal(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    local.deleteMeal(id);
    return;
  }
  const userId = await getUserId();
  if (!userId) return;
  await getSupabaseClient().from("meals").delete().eq("id", id).eq("user_id", userId);
}

export async function getTodaysMeals(): Promise<Meal[]> {
  const today = new Date().toDateString();
  const meals = await getMeals();
  return meals.filter((m) => new Date(m.eatenAt).toDateString() === today);
}

export async function getTodaysTotals() {
  const meals = await getTodaysMeals();
  return meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

// ---------- Gewichtsverlauf ----------

interface WeightEntryRow {
  id: string;
  weight_kg: number;
  body_fat_percent: number | null;
  note: string | null;
  logged_at: string;
}

function rowToWeightEntry(row: WeightEntryRow): WeightEntry {
  return {
    id: row.id,
    weightKg: row.weight_kg,
    bodyFatPercent: row.body_fat_percent ?? undefined,
    note: row.note ?? undefined,
    loggedAt: row.logged_at,
  };
}

function weightEntryToRow(entry: WeightEntry, userId: string) {
  return {
    id: entry.id,
    user_id: userId,
    weight_kg: entry.weightKg,
    body_fat_percent: entry.bodyFatPercent ?? null,
    note: entry.note ?? null,
    logged_at: entry.loggedAt,
  };
}

export async function getWeightEntries(): Promise<WeightEntry[]> {
  if (!isSupabaseConfigured()) return local.getWeightEntries();
  const userId = await getUserId();
  if (!userId) return [];
  const { data, error } = await getSupabaseClient()
    .from("weight_entries")
    .select("*")
    .eq("user_id", userId)
    .order("logged_at", { ascending: false });
  if (error || !data) return [];
  return (data as WeightEntryRow[]).map(rowToWeightEntry);
}

export async function addWeightEntry(entry: Omit<WeightEntry, "id">): Promise<WeightEntry> {
  if (!isSupabaseConfigured()) return local.addWeightEntry(entry);

  const newEntry: WeightEntry = { ...entry, id: uuidv4() };
  const userId = await getUserId();
  if (!userId) throw new Error("Nicht angemeldet.");
  const { error } = await getSupabaseClient()
    .from("weight_entries")
    .insert(weightEntryToRow(newEntry, userId));
  if (error) throw new Error(error.message);
  return newEntry;
}

export async function deleteWeightEntry(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    local.deleteWeightEntry(id);
    return;
  }
  const userId = await getUserId();
  if (!userId) return;
  await getSupabaseClient().from("weight_entries").delete().eq("id", id).eq("user_id", userId);
}

export async function getLatestWeightEntry(): Promise<WeightEntry | null> {
  const entries = await getWeightEntries();
  return entries.length > 0 ? entries[0] : null;
}

// ---------- Training ----------

interface WorkoutPlanRow {
  plan_id: string;
  goal: string;
  days_per_week: number;
  days: WorkoutPlan["days"];
  model_used: string | null;
  created_at: string;
}

function rowToWorkoutPlan(row: WorkoutPlanRow): WorkoutPlan {
  return {
    id: row.plan_id,
    goal: row.goal as WorkoutPlan["goal"],
    daysPerWeek: row.days_per_week,
    days: row.days,
    createdAt: row.created_at,
    modelUsed: row.model_used ?? "",
  };
}

export async function getWorkoutPlan(): Promise<WorkoutPlan | null> {
  if (!isSupabaseConfigured()) return local.getWorkoutPlan();
  const userId = await getUserId();
  if (!userId) return null;
  const { data, error } = await getSupabaseClient()
    .from("workout_plans")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return rowToWorkoutPlan(data as WorkoutPlanRow);
}

export async function saveWorkoutPlan(plan: WorkoutPlan): Promise<void> {
  if (!isSupabaseConfigured()) {
    local.saveWorkoutPlan(plan);
    return;
  }
  const userId = await getUserId();
  if (!userId) throw new Error("Nicht angemeldet.");
  const row = {
    user_id: userId,
    plan_id: plan.id,
    goal: plan.goal,
    days_per_week: plan.daysPerWeek,
    days: plan.days,
    model_used: plan.modelUsed || null,
    created_at: plan.createdAt,
  };
  const { error } = await getSupabaseClient()
    .from("workout_plans")
    .upsert(row, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}

export async function clearWorkoutPlan(): Promise<void> {
  if (!isSupabaseConfigured()) {
    local.clearWorkoutPlan();
    return;
  }
  const userId = await getUserId();
  if (!userId) return;
  await getSupabaseClient().from("workout_plans").delete().eq("user_id", userId);
}

interface WorkoutLogRow {
  id: string;
  day_name: string;
  duration_minutes: number;
  calories_burned: number;
  completed_at: string;
}

function rowToWorkoutLog(row: WorkoutLogRow): WorkoutLog {
  return {
    id: row.id,
    dayName: row.day_name,
    durationMinutes: row.duration_minutes,
    caloriesBurned: row.calories_burned,
    completedAt: row.completed_at,
  };
}

function workoutLogToRow(log: WorkoutLog, userId: string) {
  return {
    id: log.id,
    user_id: userId,
    day_name: log.dayName,
    duration_minutes: log.durationMinutes,
    calories_burned: log.caloriesBurned,
    completed_at: log.completedAt,
  };
}

export async function getWorkoutLogs(): Promise<WorkoutLog[]> {
  if (!isSupabaseConfigured()) return local.getWorkoutLogs();
  const userId = await getUserId();
  if (!userId) return [];
  const { data, error } = await getSupabaseClient()
    .from("workout_logs")
    .select("*")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false });
  if (error || !data) return [];
  return (data as WorkoutLogRow[]).map(rowToWorkoutLog);
}

export async function addWorkoutLog(log: Omit<WorkoutLog, "id">): Promise<WorkoutLog> {
  if (!isSupabaseConfigured()) return local.addWorkoutLog(log);

  const newLog: WorkoutLog = { ...log, id: uuidv4() };
  const userId = await getUserId();
  if (!userId) throw new Error("Nicht angemeldet.");
  const { error } = await getSupabaseClient()
    .from("workout_logs")
    .insert(workoutLogToRow(newLog, userId));
  if (error) throw new Error(error.message);
  return newLog;
}

export async function deleteWorkoutLog(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    local.deleteWorkoutLog(id);
    return;
  }
  const userId = await getUserId();
  if (!userId) return;
  await getSupabaseClient().from("workout_logs").delete().eq("id", id).eq("user_id", userId);
}

export async function getWorkoutLogsThisWeek(): Promise<WorkoutLog[]> {
  const now = new Date();
  const startOfWeek = new Date(now);
  const dayOffset = (now.getDay() + 6) % 7; // Montag = 0
  startOfWeek.setDate(now.getDate() - dayOffset);
  startOfWeek.setHours(0, 0, 0, 0);
  const logs = await getWorkoutLogs();
  return logs.filter((l) => new Date(l.completedAt) >= startOfWeek);
}

// ---------- Reset (Einstellungen) ----------

export async function resetAllData(): Promise<void> {
  local.clearAllLocalData();
  if (!isSupabaseConfigured()) return;
  const userId = await getUserId();
  if (!userId) return;
  const supabase = getSupabaseClient();
  await Promise.all([
    supabase.from("fridge_items").delete().eq("user_id", userId),
    supabase.from("meals").delete().eq("user_id", userId),
    supabase.from("weight_entries").delete().eq("user_id", userId),
    supabase.from("workout_plans").delete().eq("user_id", userId),
    supabase.from("workout_logs").delete().eq("user_id", userId),
  ]);
}
