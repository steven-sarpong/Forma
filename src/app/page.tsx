"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ScanLine, Flame, Beef, ChevronRight, AlertTriangle, Droplet, Wheat, Sparkles, RefreshCw, Scale, Dumbbell, Trophy } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { getFridgeItems, getTodaysMeals, getTodaysTotals, getExpiringItems, getLatestWeightEntry } from "@/lib/storage";
import { getProfile, calculateNutritionGoals } from "@/lib/profile";
import { getCoachMessage, CoachMessage } from "@/lib/coach";
import { calculateLevel, getStats } from "@/lib/gamification";
import { FridgeItem, Meal, NutritionGoals, UserProfile, WeightEntry, GamificationStats, LevelInfo } from "@/types";
import { CATEGORY_EMOJI, daysUntil } from "@/lib/category-style";

export default function DashboardPage() {
  const router = useRouter();
  const [checkedProfile, setCheckedProfile] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [goals, setGoals] = useState<NutritionGoals | null>(null);
  const [totals, setTotals] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [todaysMeals, setTodaysMeals] = useState<Meal[]>([]);
  const [recentScans, setRecentScans] = useState<FridgeItem[]>([]);
  const [expiring, setExpiring] = useState<FridgeItem[]>([]);
  const [latestWeight, setLatestWeight] = useState<WeightEntry | null>(null);
  const [gamificationStats, setGamificationStats] = useState<GamificationStats | null>(null);
  const [level, setLevel] = useState<LevelInfo | null>(null);
  const [coach, setCoach] = useState<CoachMessage | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const p = await getProfile();
      if (!active) return;
      if (!p) {
        router.replace("/onboarding");
        return;
      }
      const g = calculateNutritionGoals(p);
      setProfile(p);
      setGoals(g);
      setCheckedProfile(true);

      const [t, allMeals, fridgeItems, expiringItems, latest, stats] = await Promise.all([
        getTodaysTotals(),
        getTodaysMeals(),
        getFridgeItems(),
        getExpiringItems(3),
        getLatestWeightEntry(),
        getStats(),
      ]);
      if (!active) return;
      setTotals(t);
      setTodaysMeals(allMeals.slice(0, 4));
      setRecentScans(fridgeItems.filter((i) => i.source === "scan").slice(0, 5));
      setExpiring(expiringItems);
      setLatestWeight(latest);
      setGamificationStats(stats);
      setLevel(calculateLevel(stats.xp));

      loadCoachMessage(p, g, t);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function loadCoachMessage(
    p: UserProfile,
    g: NutritionGoals,
    t: { calories: number; protein: number; carbs: number; fat: number },
    forceRefresh = false
  ) {
    setCoachLoading(true);
    setCoachError(null);
    try {
      const msg = await getCoachMessage(p, g, t, { forceRefresh });
      setCoach(msg);
    } catch (err) {
      setCoachError(err instanceof Error ? err.message : "Coach konnte nicht geladen werden.");
    } finally {
      setCoachLoading(false);
    }
  }

  if (!checkedProfile) {
    return <div className="px-5 pt-10 text-center text-sm text-gray-400">Lade dein Profil...</div>;
  }

  return (
    <div>
      <PageHeader title="Hallo 👋" subtitle="Hier ist dein Überblick für heute" />

      <div className="px-5 space-y-5">
        {/* Großer Scan-CTA */}
        <Link
          href="/scan"
          className="block bg-gradient-to-br from-brand-600 to-brand-700 rounded-xl2 p-5 text-white shadow-cardHover active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-brand-100">Neuer Scan</p>
              <p className="text-lg font-bold mt-1">Kühlschrank scannen</p>
              <p className="text-xs text-brand-100 mt-1">KI erkennt deine Zutaten automatisch</p>
            </div>
            <span className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center">
              <ScanLine size={28} />
            </span>
          </div>
        </Link>

        {/* AI Coach */}
        <div className="card p-4 bg-gradient-to-br from-white to-brand-50/60">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center shrink-0">
              <Sparkles size={18} className="text-white" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-brand-900">Dein AI Coach</p>
                <button
                  onClick={() => profile && goals && loadCoachMessage(profile, goals, totals, true)}
                  disabled={coachLoading}
                  className="text-gray-400 hover:text-brand-600 disabled:opacity-50"
                  aria-label="Coach-Nachricht aktualisieren"
                >
                  <RefreshCw size={14} className={coachLoading ? "animate-spin" : ""} />
                </button>
              </div>
              {coachLoading && !coach && (
                <p className="text-sm text-gray-400 mt-1">Dein Coach denkt nach...</p>
              )}
              {coachError && !coach && (
                <p className="text-sm text-rose-500 mt-1">{coachError}</p>
              )}
              {coach && (
                <>
                  <p className="text-sm text-gray-700 mt-1">{coach.message}</p>
                  <p className="text-xs text-brand-600 font-medium mt-2">💡 {coach.tip}</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Gamification */}
        {level && gamificationStats && (
          <Link
            href="/achievements"
            className="card p-4 flex items-center gap-3 bg-gradient-to-br from-white to-brand-50/60"
          >
            <span className="w-11 h-11 rounded-full bg-brand-600 flex items-center justify-center shrink-0">
              <Trophy size={20} className="text-white" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-brand-900">Level {level.level}</p>
                <p className="text-xs text-accent-600 font-medium flex items-center gap-1">
                  <Flame size={12} /> {gamificationStats.currentStreak} Tage
                </p>
              </div>
              <div className="h-1.5 rounded-full bg-brand-100 overflow-hidden mt-1.5">
                <div
                  className="h-full bg-brand-600 transition-all"
                  style={{ width: `${Math.round(level.progress * 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                {level.xpIntoLevel} / {level.xpForNextLevel} XP · Erfolge ansehen
              </p>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </Link>
        )}

        {/* Ablauf-Warnung */}
        {expiring.length > 0 && (
          <Link
            href="/fridge"
            className="card p-4 flex items-center gap-3 border-amber-200 bg-amber-50"
          >
            <AlertTriangle size={20} className="text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">{expiring.length} Lebensmittel</span> laufen bald ab
            </p>
            <ChevronRight size={18} className="ml-auto text-amber-500" />
          </Link>
        )}

        {/* Tagesübersicht mit Zielen */}
        {goals && (
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-500">Heute</p>
              <p className="text-xs text-gray-400">
                noch <span className="font-semibold text-brand-700">{Math.max(0, Math.round(goals.calorieGoal - totals.calories))} kcal</span>
              </p>
            </div>

            <div className="flex items-center gap-2 mb-1">
              <Flame size={16} className="text-accent-500" />
              <p className="text-xs text-gray-500">
                {Math.round(totals.calories)} / {goals.calorieGoal} kcal
              </p>
            </div>
            <div className="h-2 rounded-full bg-accent-100 overflow-hidden mb-4">
              <div
                className="h-full bg-accent-500 transition-all"
                style={{ width: `${Math.min(100, (totals.calories / goals.calorieGoal) * 100)}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center">
                <div className="w-11 h-11 rounded-full bg-rose-100 flex items-center justify-center mb-1">
                  <Beef size={20} className="text-rose-500" />
                </div>
                <p className="text-sm font-bold text-brand-900">
                  {Math.round(totals.protein)}/{goals.proteinGoalG}g
                </p>
                <p className="text-[11px] text-gray-500">Protein</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-11 h-11 rounded-full bg-amber-100 flex items-center justify-center mb-1">
                  <Wheat size={20} className="text-amber-500" />
                </div>
                <p className="text-sm font-bold text-brand-900">
                  {Math.round(totals.carbs)}/{goals.carbsGoalG}g
                </p>
                <p className="text-[11px] text-gray-500">Kohlenhydrate</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-11 h-11 rounded-full bg-brand-100 flex items-center justify-center mb-1">
                  <Droplet size={20} className="text-brand-600" />
                </div>
                <p className="text-sm font-bold text-brand-900">
                  {Math.round(totals.fat)}/{goals.fatGoalG}g
                </p>
                <p className="text-[11px] text-gray-500">Fett</p>
              </div>
            </div>
          </div>
        )}

        {/* Gewicht */}
        <Link href="/weight" className="card p-4 flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
            <Scale size={18} className="text-brand-600" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium text-brand-900">
              {latestWeight ? `${latestWeight.weightKg.toFixed(1)} kg` : "Noch kein Gewicht erfasst"}
            </p>
            <p className="text-xs text-gray-400">
              Ziel: {profile?.targetWeightKg} kg · Verlauf & Prognose ansehen
            </p>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </Link>

        {/* Training */}
        <Link href="/training" className="card p-4 flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
            <Dumbbell size={18} className="text-brand-600" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium text-brand-900">Training</p>
            <p className="text-xs text-gray-400">Trainingsplan & Historie ansehen</p>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </Link>

        {/* Heutige Mahlzeiten */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-500">Heutige Mahlzeiten</p>
            <Link href="/meals" className="text-xs text-brand-600 font-medium flex items-center">
              Alle <ChevronRight size={14} />
            </Link>
          </div>
          {todaysMeals.length === 0 ? (
            <div className="card p-4 text-sm text-gray-400 text-center">
              Noch keine Mahlzeiten erfasst
            </div>
          ) : (
            <div className="space-y-2">
              {todaysMeals.map((m) => (
                <div key={m.id} className="card p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-brand-900">{m.name}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(m.eatenAt).toLocaleTimeString("de-DE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span className="pill bg-brand-50 text-brand-700">{m.calories} kcal</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Letzte Scans */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-500">Zuletzt gescannt</p>
            <Link href="/fridge" className="text-xs text-brand-600 font-medium flex items-center">
              Kühlschrank <ChevronRight size={14} />
            </Link>
          </div>
          {recentScans.length === 0 ? (
            <div className="card p-4 text-sm text-gray-400 text-center">
              Noch keine Scans vorhanden
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {recentScans.map((item) => (
                <div
                  key={item.id}
                  className="card p-3 min-w-[100px] flex flex-col items-center shrink-0"
                >
                  <span className="text-2xl">{CATEGORY_EMOJI[item.category]}</span>
                  <p className="text-xs font-medium text-brand-900 mt-1 text-center">
                    {item.name}
                  </p>
                  {item.expiryDate && (
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {daysUntil(item.expiryDate)}d
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
