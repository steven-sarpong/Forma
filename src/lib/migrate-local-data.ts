// Einmalige Übernahme bestehender lokaler Daten (aus den Phasen vor dem
// Cloud-Sync) in Supabase, direkt nach dem ersten erfolgreichen Login.
// Läuft nur einmal pro Browser (Flag in localStorage) und nur, wenn
// tatsächlich lokale Daten vorhanden sind.

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import * as local from "@/lib/storage-local";
import { getLocalProfile, clearLocalProfile } from "@/lib/profile-local";
import { saveProfile } from "@/lib/profile";
import {
  addFridgeItem,
  addMeal,
  addWeightEntry,
  addWorkoutLog,
  saveWorkoutPlan,
} from "@/lib/storage";

const MIGRATION_FLAG_KEY = "fridgeai_cloud_migration_done";

function isBrowser() {
  return typeof window !== "undefined";
}

// onAuthStateChange kann mehrfach kurz nacheinander feuern (INITIAL_SESSION,
// SIGNED_IN, TOKEN_REFRESHED ...). Ohne dieses Guard würde jeder Aufruf eine
// eigene, parallele Migration starten und lokale Daten mehrfach übernehmen.
let migrationPromise: Promise<void> | null = null;

export async function migrateLocalDataToCloudIfNeeded(): Promise<void> {
  if (!isBrowser() || !isSupabaseConfigured()) return;
  if (window.localStorage.getItem(MIGRATION_FLAG_KEY) === "true") return;
  if (migrationPromise) return migrationPromise;

  migrationPromise = runMigration().finally(() => {
    migrationPromise = null;
  });
  return migrationPromise;
}

async function runMigration(): Promise<void> {
  if (window.localStorage.getItem(MIGRATION_FLAG_KEY) === "true") return;

  const { data } = await getSupabaseClient().auth.getUser();
  if (!data.user) return;

  try {
    // Profil nur übernehmen, wenn in der Cloud noch keins existiert (sonst
    // hätte der Nutzer sich evtl. an einem anderen Gerät schon eingerichtet).
    const localProfile = getLocalProfile();
    if (localProfile) {
      const { data: existing } = await getSupabaseClient()
        .from("profiles")
        .select("user_id")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (!existing) {
        await saveProfile(localProfile);
      }
      clearLocalProfile();
    }

    const fridgeItems = local.getFridgeItems();
    for (const item of fridgeItems) {
      await addFridgeItem(item);
    }

    const meals = local.getMeals();
    for (const meal of meals) {
      await addMeal(meal);
    }

    const weightEntries = local.getWeightEntries();
    for (const entry of weightEntries) {
      await addWeightEntry(entry);
    }

    const workoutPlan = local.getWorkoutPlan();
    if (workoutPlan) {
      await saveWorkoutPlan(workoutPlan);
    }

    const workoutLogs = local.getWorkoutLogs();
    for (const log of workoutLogs) {
      await addWorkoutLog(log);
    }

    local.clearAllLocalData();
    window.localStorage.setItem(MIGRATION_FLAG_KEY, "true");
  } catch (err) {
    // Migration nicht als erledigt markieren, damit es beim nächsten Login
    // erneut versucht wird – lokale Daten bleiben als Sicherheitsnetz erhalten.
    console.error("[migrate-local-data] Migration fehlgeschlagen:", err);
  }
}
