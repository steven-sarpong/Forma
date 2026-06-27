// Nutzerprofil-Persistenz über Supabase (Cloud-Sync, RLS-geschützt pro Nutzer)
// sowie die Berechnung von Grundumsatz, Gesamtumsatz, Kalorienziel, Makros und
// Wasserbedarf aus den Onboarding-Daten.

import { ActivityLevel, FitnessGoal, NutritionGoals, UserProfile } from "@/types";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getLocalProfile, saveLocalProfile, clearLocalProfile } from "@/lib/profile-local";

interface ProfileRow {
  user_id: string;
  gender: string;
  age: number;
  height_cm: number;
  weight_kg: number;
  target_weight_kg: number;
  activity_level: string;
  training_frequency: number;
  body_fat_percent: number | null;
  steps_per_day: number | null;
  occupation: string | null;
  eating_habits: string | null;
  allergies: string[];
  intolerances: string[];
  favorite_foods: string[];
  disliked_foods: string[];
  budget: string | null;
  cooking_time: string | null;
  goal: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

function rowToProfile(row: ProfileRow): UserProfile {
  return {
    gender: row.gender as UserProfile["gender"],
    age: row.age,
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    targetWeightKg: row.target_weight_kg,
    activityLevel: row.activity_level as ActivityLevel,
    trainingFrequency: row.training_frequency,
    bodyFatPercent: row.body_fat_percent ?? undefined,
    stepsPerDay: row.steps_per_day ?? undefined,
    occupation: row.occupation ?? undefined,
    eatingHabits: row.eating_habits ?? undefined,
    allergies: row.allergies ?? [],
    intolerances: row.intolerances ?? [],
    favoriteFoods: row.favorite_foods ?? [],
    dislikedFoods: row.disliked_foods ?? [],
    budget: (row.budget as UserProfile["budget"]) ?? undefined,
    cookingTime: (row.cooking_time as UserProfile["cookingTime"]) ?? undefined,
    goal: row.goal as FitnessGoal,
    displayName: row.display_name ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getProfile(): Promise<UserProfile | null> {
  if (!isSupabaseConfigured()) return getLocalProfile();
  try {
    const supabase = getSupabaseClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) return null;
    return rowToProfile(data as ProfileRow);
  } catch {
    return null;
  }
}

export async function hasProfile(): Promise<boolean> {
  return (await getProfile()) !== null;
}

export async function saveProfile(
  profile: Omit<UserProfile, "createdAt" | "updatedAt">
): Promise<UserProfile> {
  if (!isSupabaseConfigured()) return saveLocalProfile(profile);

  const supabase = getSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (userError || !userId) {
    throw new Error("Nicht angemeldet. Bitte melde dich erneut an.");
  }

  const row = {
    user_id: userId,
    gender: profile.gender,
    age: profile.age,
    height_cm: profile.heightCm,
    weight_kg: profile.weightKg,
    target_weight_kg: profile.targetWeightKg,
    activity_level: profile.activityLevel,
    training_frequency: profile.trainingFrequency,
    body_fat_percent: profile.bodyFatPercent ?? null,
    steps_per_day: profile.stepsPerDay ?? null,
    occupation: profile.occupation ?? null,
    eating_habits: profile.eatingHabits ?? null,
    allergies: profile.allergies ?? [],
    intolerances: profile.intolerances ?? [],
    favorite_foods: profile.favoriteFoods ?? [],
    disliked_foods: profile.dislikedFoods ?? [],
    budget: profile.budget ?? null,
    cooking_time: profile.cookingTime ?? null,
    goal: profile.goal,
    display_name: profile.displayName ?? null,
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(row, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Profil konnte nicht gespeichert werden.");
  }
  return rowToProfile(data as ProfileRow);
}

export async function clearProfile(): Promise<void> {
  if (!isSupabaseConfigured()) {
    clearLocalProfile();
    return;
  }
  const supabase = getSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return;
  await supabase.from("profiles").delete().eq("user_id", userId);
}

// Aktivitätsfaktoren für die TDEE-Berechnung (PAL-Werte)
const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sitzend: 1.2,
  leicht: 1.375,
  moderat: 1.55,
  aktiv: 1.725,
  sehr_aktiv: 1.9,
};

// Grundumsatz nach Mifflin-St Jeor (genauste verbreitete Formel ohne Bodyfat-Messung)
function calculateBMR(profile: UserProfile): number {
  const { gender, weightKg, heightCm, age } = profile;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (gender === "männlich") return base + 5;
  if (gender === "weiblich") return base - 161;
  // divers: Mittelwert der geschlechtsspezifischen Konstanten
  return base - 78;
}

const MIN_SAFE_CALORIES = 1200;

export function calculateNutritionGoals(profile: UserProfile): NutritionGoals {
  const bmr = calculateBMR(profile);
  const tdee = bmr * ACTIVITY_MULTIPLIERS[profile.activityLevel];

  let calorieGoal: number;
  let weeklyWeightChangeKg: number;

  switch (profile.goal as FitnessGoal) {
    case "abnehmen":
      calorieGoal = tdee - 500;
      weeklyWeightChangeKg = -0.5;
      break;
    case "muskelaufbau":
      calorieGoal = tdee + 300;
      weeklyWeightChangeKg = 0.25;
      break;
    case "recomposition":
      calorieGoal = tdee - 200;
      weeklyWeightChangeKg = -0.2;
      break;
    case "gesuender_leben":
    default:
      calorieGoal = tdee;
      weeklyWeightChangeKg = 0;
      break;
  }

  calorieGoal = Math.max(MIN_SAFE_CALORIES, Math.round(calorieGoal));

  // Proteinbedarf bezogen auf Körpergewicht, je nach Ziel
  const proteinPerKg =
    profile.goal === "muskelaufbau" ? 2.2 : profile.goal === "recomposition" ? 2.0 : profile.goal === "abnehmen" ? 1.8 : 1.4;
  const proteinGoalG = Math.round(profile.weightKg * proteinPerKg);

  // Fett: 25% der Kalorien, Rest geht in Kohlenhydrate
  const fatGoalG = Math.round((calorieGoal * 0.25) / 9);
  const remainingCalories = calorieGoal - proteinGoalG * 4 - fatGoalG * 9;
  const carbsGoalG = Math.max(0, Math.round(remainingCalories / 4));

  const waterGoalMl = Math.round(profile.weightKg * 33);
  const stepsGoal = profile.stepsPerDay && profile.stepsPerDay > 0 ? profile.stepsPerDay : 9000;

  const weightDiffKg = profile.targetWeightKg - profile.weightKg;
  let weeksToGoal: number | null = null;
  if (weeklyWeightChangeKg !== 0 && weightDiffKg !== 0) {
    // Nur sinnvoll, wenn Richtung der Veränderung zum Ziel passt
    const sameDirection = Math.sign(weightDiffKg) === Math.sign(weeklyWeightChangeKg);
    if (sameDirection) {
      weeksToGoal = Math.ceil(Math.abs(weightDiffKg / weeklyWeightChangeKg));
    }
  }

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calorieGoal,
    proteinGoalG,
    carbsGoalG,
    fatGoalG,
    waterGoalMl,
    stepsGoal,
    weeklyWeightChangeKg,
    weeksToGoal,
  };
}
