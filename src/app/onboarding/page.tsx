"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Flame,
  Droplet,
  Beef,
} from "lucide-react";
import {
  ActivityLevel,
  ACTIVITY_LEVEL_LABELS,
  BudgetLevel,
  CookingTimeLevel,
  FitnessGoal,
  FITNESS_GOAL_LABELS,
  Gender,
  UserProfile,
} from "@/types";
import { calculateNutritionGoals, getProfile, saveProfile } from "@/lib/profile";

type FormState = {
  displayName: string;
  gender: Gender | null;
  age: string;
  heightCm: string;
  weightKg: string;
  targetWeightKg: string;
  activityLevel: ActivityLevel | null;
  trainingFrequency: string;
  bodyFatPercent: string;
  stepsPerDay: string;
  occupation: string;
  eatingHabits: string;
  allergies: string;
  intolerances: string;
  favoriteFoods: string;
  dislikedFoods: string;
  budget: BudgetLevel | null;
  cookingTime: CookingTimeLevel | null;
  goal: FitnessGoal | null;
};

function emptyState(): FormState {
  return {
    displayName: "",
    gender: null,
    age: "",
    heightCm: "",
    weightKg: "",
    targetWeightKg: "",
    activityLevel: null,
    trainingFrequency: "3",
    bodyFatPercent: "",
    stepsPerDay: "",
    occupation: "",
    eatingHabits: "",
    allergies: "",
    intolerances: "",
    favoriteFoods: "",
    dislikedFoods: "",
    budget: null,
    cookingTime: null,
    goal: null,
  };
}

function profileToState(existing: UserProfile): FormState {
  return {
    displayName: existing.displayName ?? "",
    gender: existing.gender,
    age: String(existing.age),
    heightCm: String(existing.heightCm),
    weightKg: String(existing.weightKg),
    targetWeightKg: String(existing.targetWeightKg),
    activityLevel: existing.activityLevel,
    trainingFrequency: String(existing.trainingFrequency),
    bodyFatPercent: existing.bodyFatPercent ? String(existing.bodyFatPercent) : "",
    stepsPerDay: existing.stepsPerDay ? String(existing.stepsPerDay) : "",
    occupation: existing.occupation ?? "",
    eatingHabits: existing.eatingHabits ?? "",
    allergies: existing.allergies?.join(", ") ?? "",
    intolerances: existing.intolerances?.join(", ") ?? "",
    favoriteFoods: existing.favoriteFoods?.join(", ") ?? "",
    dislikedFoods: existing.dislikedFoods?.join(", ") ?? "",
    budget: existing.budget ?? null,
    cookingTime: existing.cookingTime ?? null,
    goal: existing.goal,
  };
}

const TOTAL_STEPS = 6;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(emptyState);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProfile().then((existing) => {
      if (existing) setForm(profileToState(existing));
    });
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  }

  function validateStep(): string | null {
    switch (step) {
      case 0:
        if (!form.displayName.trim()) return "Bitte gib einen Anzeigenamen ein.";
        if (!form.gender) return "Bitte wähle ein Geschlecht aus.";
        return null;
      case 1: {
        const age = Number(form.age);
        const height = Number(form.heightCm);
        const weight = Number(form.weightKg);
        const target = Number(form.targetWeightKg);
        if (!age || age < 14 || age > 100) return "Bitte gib ein gültiges Alter ein (14-100).";
        if (!height || height < 100 || height > 250) return "Bitte gib eine gültige Größe in cm ein.";
        if (!weight || weight < 30 || weight > 300) return "Bitte gib ein gültiges Gewicht in kg ein.";
        if (!target || target < 30 || target > 300) return "Bitte gib ein gültiges Zielgewicht in kg ein.";
        return null;
      }
      case 2:
        if (!form.activityLevel) return "Bitte wähle dein Aktivitätslevel aus.";
        if (!form.trainingFrequency) return "Bitte gib deine Trainingshäufigkeit an.";
        return null;
      case 3:
        if (!form.goal) return "Bitte wähle dein Ziel aus.";
        return null;
      case 4:
        return null;
      default:
        return null;
    }
  }

  function next() {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    if (step < TOTAL_STEPS - 1) setStep((s) => s + 1);
  }

  function back() {
    if (step > 0) setStep((s) => s - 1);
    else router.push("/");
  }

  function splitList(value: string): string[] {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function buildProfile(): Omit<UserProfile, "createdAt" | "updatedAt"> {
    return {
      displayName: form.displayName.trim(),
      gender: form.gender as Gender,
      age: Number(form.age),
      heightCm: Number(form.heightCm),
      weightKg: Number(form.weightKg),
      targetWeightKg: Number(form.targetWeightKg),
      activityLevel: form.activityLevel as ActivityLevel,
      trainingFrequency: Number(form.trainingFrequency) || 0,
      bodyFatPercent: form.bodyFatPercent ? Number(form.bodyFatPercent) : undefined,
      stepsPerDay: form.stepsPerDay ? Number(form.stepsPerDay) : undefined,
      occupation: form.occupation || undefined,
      eatingHabits: form.eatingHabits || undefined,
      allergies: splitList(form.allergies),
      intolerances: splitList(form.intolerances),
      favoriteFoods: splitList(form.favoriteFoods),
      dislikedFoods: splitList(form.dislikedFoods),
      budget: form.budget ?? undefined,
      cookingTime: form.cookingTime ?? undefined,
      goal: form.goal as FitnessGoal,
    };
  }

  async function finish() {
    setSaving(true);
    setError(null);
    try {
      await saveProfile(buildProfile());
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Profil konnte nicht gespeichert werden.");
      setSaving(false);
    }
  }

  const previewProfile = (): UserProfile | null => {
    if (!form.displayName.trim() || !form.gender || !form.activityLevel || !form.goal) return null;
    if (!form.age || !form.heightCm || !form.weightKg || !form.targetWeightKg) return null;
    return {
      ...buildProfile(),
      createdAt: "",
      updatedAt: "",
    };
  };

  const goals = (() => {
    const p = previewProfile();
    return p ? calculateNutritionGoals(p) : null;
  })();

  return (
    <div>
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={back} className="w-9 h-9 rounded-full flex items-center justify-center bg-white border border-brand-100 text-brand-700">
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1 h-2 rounded-full bg-brand-100 overflow-hidden">
            <div
              className="h-full bg-brand-600 transition-all"
              style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-brand-900">Dein Profil</h1>
        <p className="text-sm text-gray-500 mt-1">
          Schritt {step + 1} von {TOTAL_STEPS} – damit dein KI-Coach dich optimal begleiten kann
        </p>
      </div>

      <div className="px-5 space-y-5 pb-6">
        {step === 0 && (
          <div className="card p-4 space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-500">Wie heißt du?</label>
              <input
                type="text"
                className="input-field mt-1"
                value={form.displayName}
                onChange={(e) => update("displayName", e.target.value)}
                placeholder="z. B. Max"
                maxLength={30}
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-1">
                Dieser Name wird im Dashboard, bei Freunden und im Leaderboard angezeigt.
              </p>
            </div>
            <p className="text-sm font-semibold text-gray-500">Geschlecht</p>
            <div className="grid grid-cols-3 gap-2">
              {(["männlich", "weiblich", "divers"] as Gender[]).map((g) => (
                <button
                  key={g}
                  onClick={() => update("gender", g)}
                  className={`rounded-xl py-3 text-sm font-medium border transition-all ${
                    form.gender === g
                      ? "bg-brand-600 text-white border-brand-600"
                      : "bg-white text-brand-700 border-brand-200"
                  }`}
                >
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="card p-4 space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-500">Alter (Jahre)</label>
              <input
                type="number"
                inputMode="numeric"
                className="input-field mt-1"
                value={form.age}
                onChange={(e) => update("age", e.target.value)}
                placeholder="z. B. 28"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-500">Größe (cm)</label>
              <input
                type="number"
                inputMode="numeric"
                className="input-field mt-1"
                value={form.heightCm}
                onChange={(e) => update("heightCm", e.target.value)}
                placeholder="z. B. 178"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-500">Aktuelles Gewicht (kg)</label>
              <input
                type="number"
                inputMode="decimal"
                className="input-field mt-1"
                value={form.weightKg}
                onChange={(e) => update("weightKg", e.target.value)}
                placeholder="z. B. 82"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-500">Zielgewicht (kg)</label>
              <input
                type="number"
                inputMode="decimal"
                className="input-field mt-1"
                value={form.targetWeightKg}
                onChange={(e) => update("targetWeightKg", e.target.value)}
                placeholder="z. B. 75"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-500">Körperfett % (optional)</label>
              <input
                type="number"
                inputMode="decimal"
                className="input-field mt-1"
                value={form.bodyFatPercent}
                onChange={(e) => update("bodyFatPercent", e.target.value)}
                placeholder="z. B. 18"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="card p-4 space-y-4">
            <div>
              <p className="text-sm font-semibold text-gray-500 mb-2">Aktivitätslevel</p>
              <div className="space-y-2">
                {(Object.keys(ACTIVITY_LEVEL_LABELS) as ActivityLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => update("activityLevel", lvl)}
                    className={`w-full text-left rounded-xl py-3 px-4 text-sm font-medium border transition-all ${
                      form.activityLevel === lvl
                        ? "bg-brand-600 text-white border-brand-600"
                        : "bg-white text-brand-700 border-brand-200"
                    }`}
                  >
                    {ACTIVITY_LEVEL_LABELS[lvl]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-500">Trainingseinheiten pro Woche</label>
              <input
                type="number"
                inputMode="numeric"
                className="input-field mt-1"
                value={form.trainingFrequency}
                onChange={(e) => update("trainingFrequency", e.target.value)}
                placeholder="z. B. 3"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-500">Schritte pro Tag (optional)</label>
              <input
                type="number"
                inputMode="numeric"
                className="input-field mt-1"
                value={form.stepsPerDay}
                onChange={(e) => update("stepsPerDay", e.target.value)}
                placeholder="z. B. 8000"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-500">Beruf (optional)</label>
              <input
                type="text"
                className="input-field mt-1"
                value={form.occupation}
                onChange={(e) => update("occupation", e.target.value)}
                placeholder="z. B. Büroangestellter"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="card p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-500">Was ist dein Ziel?</p>
            <div className="space-y-2">
              {(Object.keys(FITNESS_GOAL_LABELS) as FitnessGoal[]).map((g) => (
                <button
                  key={g}
                  onClick={() => update("goal", g)}
                  className={`w-full text-left rounded-xl py-3 px-4 text-sm font-medium border transition-all ${
                    form.goal === g
                      ? "bg-brand-600 text-white border-brand-600"
                      : "bg-white text-brand-700 border-brand-200"
                  }`}
                >
                  {FITNESS_GOAL_LABELS[g]}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="card p-4 space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-500">Essgewohnheiten (optional)</label>
              <input
                type="text"
                className="input-field mt-1"
                value={form.eatingHabits}
                onChange={(e) => update("eatingHabits", e.target.value)}
                placeholder="z. B. Vegetarisch, Low Carb..."
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-500">Allergien (Komma-getrennt)</label>
              <input
                type="text"
                className="input-field mt-1"
                value={form.allergies}
                onChange={(e) => update("allergies", e.target.value)}
                placeholder="z. B. Nüsse, Schalentiere"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-500">Unverträglichkeiten</label>
              <input
                type="text"
                className="input-field mt-1"
                value={form.intolerances}
                onChange={(e) => update("intolerances", e.target.value)}
                placeholder="z. B. Laktose, Gluten"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-500">Lieblingsessen</label>
              <input
                type="text"
                className="input-field mt-1"
                value={form.favoriteFoods}
                onChange={(e) => update("favoriteFoods", e.target.value)}
                placeholder="z. B. Pasta, Hähnchen, Sushi"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-500">Nicht gemochte Lebensmittel</label>
              <input
                type="text"
                className="input-field mt-1"
                value={form.dislikedFoods}
                onChange={(e) => update("dislikedFoods", e.target.value)}
                placeholder="z. B. Brokkoli, Innereien"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500 mb-2">Budget zum Kochen</p>
              <div className="grid grid-cols-3 gap-2">
                {(["niedrig", "mittel", "hoch"] as BudgetLevel[]).map((b) => (
                  <button
                    key={b}
                    onClick={() => update("budget", b)}
                    className={`rounded-xl py-2.5 text-sm font-medium border transition-all ${
                      form.budget === b
                        ? "bg-brand-600 text-white border-brand-600"
                        : "bg-white text-brand-700 border-brand-200"
                    }`}
                  >
                    {b.charAt(0).toUpperCase() + b.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500 mb-2">Zeit zum Kochen</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ["wenig", "Wenig"],
                  ["mittel", "Mittel"],
                  ["viel", "Viel"],
                ] as [CookingTimeLevel, string][]).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => update("cookingTime", val)}
                    className={`rounded-xl py-2.5 text-sm font-medium border transition-all ${
                      form.cookingTime === val
                        ? "bg-brand-600 text-white border-brand-600"
                        : "bg-white text-brand-700 border-brand-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 5 && goals && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-xl2 p-5 text-white">
              <p className="text-sm text-brand-100">Dein persönliches Ziel</p>
              <p className="text-3xl font-bold mt-1">{goals.calorieGoal} kcal</p>
              <p className="text-xs text-brand-100 mt-1">
                Grundumsatz {goals.bmr} kcal · Gesamtumsatz {goals.tdee} kcal
              </p>
            </div>

            <div className="card p-4">
              <p className="text-sm font-semibold text-gray-500 mb-3">Deine Makros pro Tag</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-11 h-11 rounded-full bg-rose-100 flex items-center justify-center mb-1">
                    <Beef size={20} className="text-rose-500" />
                  </div>
                  <p className="text-lg font-bold text-brand-900">{goals.proteinGoalG}g</p>
                  <p className="text-[11px] text-gray-500">Protein</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-11 h-11 rounded-full bg-amber-100 flex items-center justify-center mb-1">
                    <Flame size={20} className="text-amber-500" />
                  </div>
                  <p className="text-lg font-bold text-brand-900">{goals.carbsGoalG}g</p>
                  <p className="text-[11px] text-gray-500">Kohlenhydrate</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-11 h-11 rounded-full bg-brand-100 flex items-center justify-center mb-1">
                    <Droplet size={20} className="text-brand-600" />
                  </div>
                  <p className="text-lg font-bold text-brand-900">{goals.fatGoalG}g</p>
                  <p className="text-[11px] text-gray-500">Fett</p>
                </div>
              </div>
            </div>

            <div className="card p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-brand-900">Wasserbedarf</p>
                <p className="text-xs text-gray-400">empfohlen pro Tag</p>
              </div>
              <p className="text-lg font-bold text-brand-900">{(goals.waterGoalMl / 1000).toFixed(1)} L</p>
            </div>

            <div className="card p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-brand-900">Schrittziel</p>
                <p className="text-xs text-gray-400">empfohlen pro Tag</p>
              </div>
              <p className="text-lg font-bold text-brand-900">{goals.stepsGoal.toLocaleString("de-DE")}</p>
            </div>

            {goals.weeksToGoal !== null && (
              <div className="card p-4">
                <p className="text-sm font-medium text-brand-900">Realistische Prognose</p>
                <p className="text-xs text-gray-500 mt-1">
                  Mit ca. {Math.abs(goals.weeklyWeightChangeKg).toFixed(2)} kg pro Woche erreichst du dein
                  Zielgewicht in etwa <span className="font-semibold">{goals.weeksToGoal} Wochen</span>.
                </p>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm text-rose-600 text-center">{error}</p>}

        <div className="flex gap-2 pt-2">
          {step < TOTAL_STEPS - 1 ? (
            <button onClick={next} className="btn-primary w-full flex items-center justify-center gap-2">
              Weiter <ChevronRight size={18} />
            </button>
          ) : (
            <button onClick={finish} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
              <Check size={18} /> {saving ? "Speichert..." : "Profil speichern"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
