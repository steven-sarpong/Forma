"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Flame, Beef, ChevronRight, AlertTriangle, Droplet, Wheat,
  Scale, Dumbbell, Trophy, Crown, Swords, Refrigerator,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import CoachFab from "@/components/CoachFab";
import AvatarUpload, { getStoredAvatar } from "@/components/AvatarUpload";
import { getExpiringItems, getLatestWeightEntry, getTodaysTotals, getFridgeItems } from "@/lib/storage";
import { getProfile, calculateNutritionGoals } from "@/lib/profile";
import { getCoachMessage, CoachMessage } from "@/lib/coach";
import { calculateLevel, getStats } from "@/lib/gamification";
import { getLeaderboard, isSocialAvailable } from "@/lib/friends";
import { getMyChallenges } from "@/lib/challenges";
import {
  FridgeItem,
  NutritionGoals,
  UserProfile,
  WeightEntry,
  GamificationStats,
  LevelInfo,
  ChallengeSummary,
} from "@/types";

export default function DashboardPage() {
  const router = useRouter();
  const [checkedProfile, setCheckedProfile] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [goals, setGoals] = useState<NutritionGoals | null>(null);
  const [totals, setTotals] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [expiring, setExpiring] = useState<FridgeItem[]>([]);
  const [latestWeight, setLatestWeight] = useState<WeightEntry | null>(null);
  const [gamificationStats, setGamificationStats] = useState<GamificationStats | null>(null);
  const [level, setLevel] = useState<LevelInfo | null>(null);
  const [coach, setCoach] = useState<CoachMessage | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [rank, setRank] = useState<{ position: number; total: number } | null>(null);
  const [topChallenge, setTopChallenge] = useState<ChallengeSummary | null>(null);
  const [fridgeCategories, setFridgeCategories] = useState<{ label: string; count: number }[]>([]);
  const [avatar, setAvatar] = useState<string | null>(null);
  const profileRef = useRef<UserProfile | null>(null);
  const goalsRef = useRef<NutritionGoals | null>(null);
  const totalsRef = useRef({ calories: 0, protein: 0, carbs: 0, fat: 0 });

  useEffect(() => {
    setAvatar(getStoredAvatar());
    let active = true;
    (async () => {
      const p = await getProfile();
      if (!active) return;
      if (!p) { router.replace("/onboarding"); return; }

      const g = calculateNutritionGoals(p);
      setProfile(p);
      setGoals(g);
      setCheckedProfile(true);
      profileRef.current = p;
      goalsRef.current = g;

      const [t, expiringItems, latest, stats, fridgeItems] = await Promise.all([
        getTodaysTotals(),
        getExpiringItems(3),
        getLatestWeightEntry(),
        getStats(),
        getFridgeItems(),
      ]);
      if (!active) return;

      setTotals(t);
      totalsRef.current = t;
      setExpiring(expiringItems);
      setLatestWeight(latest);
      setGamificationStats(stats);
      setLevel(calculateLevel(stats.xp));

      // Kühlschrank nach Kategorie aggregieren
      const catMap = new Map<string, number>();
      fridgeItems.forEach((item) => {
        catMap.set(item.category, (catMap.get(item.category) ?? 0) + 1);
      });
      const sorted = Array.from(catMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 7)
        .map(([label, count]) => ({ label, count }));
      setFridgeCategories(sorted);

      if (isSocialAvailable()) {
        const [board, myChallenges] = await Promise.all([
          getLeaderboard().catch(() => []),
          getMyChallenges().catch(() => []),
        ]);
        if (!active) return;
        if (board.length > 1) {
          const position = board.findIndex((e) => e.isSelf) + 1;
          if (position > 0) setRank({ position, total: board.length });
        }
        const accepted = myChallenges.find((c) => c.myStatus === "accepted");
        setTopChallenge(accepted ?? null);
      }

      loadCoach(p, g, t);
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function loadCoach(
    p: UserProfile,
    g: NutritionGoals,
    t: { calories: number; protein: number; carbs: number; fat: number },
    forceRefresh = false
  ) {
    setCoachLoading(true);
    try {
      setCoach(await getCoachMessage(p, g, t, { forceRefresh }));
    } catch {
      // error shown inside CoachFab
    } finally {
      setCoachLoading(false);
    }
  }

  function refreshCoach() {
    if (profileRef.current && goalsRef.current) {
      loadCoach(profileRef.current, goalsRef.current, totalsRef.current, true);
    }
  }

  if (!checkedProfile) {
    return <div className="px-5 pt-10 text-center text-sm text-gray-400">Lade...</div>;
  }

  const calPct = goals ? Math.min(100, (totals.calories / goals.calorieGoal) * 100) : 0;
  const proteinPct = goals ? Math.min(100, (totals.protein / goals.proteinGoalG) * 100) : 0;
  const greeting = profile?.displayName ? `Hallo, ${profile.displayName}` : "Hallo";

  return (
    <div>
      <PageHeader
        title={greeting}
        subtitle="Dein Überblick für heute"
        right={
          <AvatarUpload
            value={avatar}
            onChange={setAvatar}
            initials={profile?.displayName?.slice(0, 1) ?? "?"}
            size="sm"
          />
        }
      />

      <div className="px-5 space-y-4 pb-6">

        {/* Ablauf-Warnung */}
        {expiring.length > 0 && (
          <Link href="/fridge" className="card p-3 flex items-center gap-3 border-amber-200 bg-amber-50">
            <AlertTriangle size={18} className="text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800 flex-1">
              <span className="font-semibold">{expiring.length} Lebensmittel</span> laufen bald ab
            </p>
            <ChevronRight size={16} className="text-amber-500" />
          </Link>
        )}

        {/* Kalorien + Makros */}
        {goals && (
          <div className="card p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-gray-500">Kalorien heute</p>
              <p className="text-xs text-gray-400">
                noch <span className="font-semibold text-brand-700">
                  {Math.max(0, Math.round(goals.calorieGoal - totals.calories))} kcal
                </span>
              </p>
            </div>
            <div className="flex items-baseline gap-1.5 mb-2">
              <span className="text-2xl font-bold text-brand-900">{Math.round(totals.calories)}</span>
              <span className="text-sm text-gray-400">/ {goals.calorieGoal} kcal</span>
            </div>
            <div className="h-2 rounded-full bg-accent-100 overflow-hidden mb-4">
              <div className="h-full bg-accent-500 transition-all" style={{ width: `${calPct}%` }} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <MacroStat
                icon={<Beef size={14} className="text-rose-500" />}
                label="Protein"
                value={`${Math.round(totals.protein)}g`}
                goal={`${goals.proteinGoalG}g`}
                pct={proteinPct}
                barColor="bg-rose-400"
              />
              <MacroStat
                icon={<Wheat size={14} className="text-amber-500" />}
                label="Kohlenhydrate"
                value={`${Math.round(totals.carbs)}g`}
                goal={`${goals.carbsGoalG}g`}
                pct={Math.min(100, (totals.carbs / goals.carbsGoalG) * 100)}
                barColor="bg-amber-400"
              />
              <MacroStat
                icon={<Droplet size={14} className="text-sky-500" />}
                label="Fett"
                value={`${Math.round(totals.fat)}g`}
                goal={`${goals.fatGoalG}g`}
                pct={Math.min(100, (totals.fat / goals.fatGoalG) * 100)}
                barColor="bg-sky-400"
              />
            </div>
          </div>
        )}

        {/* Erste Schritte für neue Nutzer */}
        {gamificationStats?.xp === 0 && totals.calories === 0 && (
          <div className="card p-4 space-y-3">
            <p className="text-sm font-semibold text-brand-900">Erste Schritte</p>
            <div className="space-y-2">
              <Link href="/scan" className="flex items-center gap-3 py-2 border-b border-gray-100">
                <span className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                  <Flame size={15} className="text-brand-600" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-brand-900">Erste Mahlzeit scannen</p>
                  <p className="text-xs text-gray-400">Foto aufnehmen & Kalorien tracken</p>
                </div>
                <ChevronRight size={16} className="text-gray-400" />
              </Link>
              <Link href="/training" className="flex items-center gap-3 py-2 border-b border-gray-100">
                <span className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                  <Dumbbell size={15} className="text-brand-600" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-brand-900">Trainingsplan erstellen</p>
                  <p className="text-xs text-gray-400">KI-generiert & auf dich abgestimmt</p>
                </div>
                <ChevronRight size={16} className="text-gray-400" />
              </Link>
              <Link href="/fridge" className="flex items-center gap-3 py-2">
                <span className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                  <Refrigerator size={15} className="text-brand-600" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-brand-900">Kühlschrank scannen</p>
                  <p className="text-xs text-gray-400">Lebensmittel & Ablaufdaten erfassen</p>
                </div>
                <ChevronRight size={16} className="text-gray-400" />
              </Link>
            </div>
          </div>
        )}

        {/* Challenges & Leaderboard */}
        {(rank || topChallenge) && (
          <Link
            href="/challenges"
            className="block rounded-xl2 p-4 bg-gradient-to-br from-brand-900 to-brand-700 text-white shadow-card active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold flex items-center gap-1.5">
                <Trophy size={14} /> Challenges & Leaderboard
              </p>
              <ChevronRight size={15} className="text-white/60" />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {rank && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <Crown size={15} className="text-amber-300" />
                  <p className="text-sm whitespace-nowrap">
                    Platz <span className="font-bold">{rank.position}</span> von {rank.total}
                  </p>
                </div>
              )}
              {topChallenge && (
                <div className="flex items-center gap-1.5 min-w-0">
                  <Swords size={14} className="text-white/70 shrink-0" />
                  <p className="text-sm truncate">{topChallenge.name}</p>
                </div>
              )}
            </div>
            {topChallenge && (
              <div className="mt-3">
                <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full bg-amber-300 transition-all"
                    style={{
                      width: `${Math.min(100, ((topChallenge.participants.find((p) => p.isSelf)?.progress ?? 0) / topChallenge.targetValue) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-white/70 mt-1">
                  {topChallenge.participants.find((p) => p.isSelf)?.progress ?? 0}/{topChallenge.targetValue} XP
                </p>
              </div>
            )}
          </Link>
        )}

        {/* Level & XP */}
        {level && gamificationStats && (
          <Link href="/achievements" className="card p-4 flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
              <Trophy size={18} className="text-brand-600" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm font-semibold text-brand-900">Level {level.level}</p>
                <p className="text-xs text-accent-600 font-medium flex items-center gap-1">
                  <Flame size={11} /> {gamificationStats.currentStreak} Tage
                </p>
              </div>
              <div className="h-1.5 rounded-full bg-brand-100 overflow-hidden">
                <div className="h-full bg-brand-600 transition-all" style={{ width: `${Math.round(level.progress * 100)}%` }} />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                {level.xpIntoLevel} / {level.xpForNextLevel} XP
              </p>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </Link>
        )}

        {/* Kühlschrank */}
        <Link href="/fridge" className="card p-4 flex items-center gap-3" id="fridge-card">
          <span className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
            <Refrigerator size={18} className="text-brand-600" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-brand-900">Kühlschrank</p>
            <p className="text-xs text-gray-400">
              {fridgeCategories.length > 0
                ? `${fridgeCategories.reduce((s, c) => s + c.count, 0)} Produkte`
                : "Noch keine Produkte"}
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
            <p className="text-sm font-semibold text-brand-900">Training</p>
            <p className="text-xs text-gray-400">Plan & Trainingshistorie</p>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </Link>

        {/* Gewicht */}
        <Link href="/weight" className="card p-4 flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
            <Scale size={18} className="text-brand-600" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-brand-900">
              {latestWeight ? `${latestWeight.weightKg.toFixed(1)} kg` : "Gewicht erfassen"}
            </p>
            <p className="text-xs text-gray-400">Ziel: {profile?.targetWeightKg} kg</p>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </Link>

      </div>

      <CoachFab
        coachMessage={coach}
        coachLoading={coachLoading}
        onRefresh={refreshCoach}
        context={{
          goal: profile?.goal,
          calorieGoal: goals?.calorieGoal,
          caloriesSoFar: totals.calories,
          proteinGoalG: goals?.proteinGoalG,
          proteinSoFar: totals.protein,
          currentWeightKg: profile?.weightKg,
          targetWeightKg: profile?.targetWeightKg,
        }}
      />
    </div>
  );
}

function MacroStat({
  icon,
  label,
  value,
  goal,
  pct,
  barColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  goal: string;
  pct: number;
  barColor: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-1 mb-0.5">
        {icon}
        <p className="text-sm font-bold text-brand-900">{value}</p>
      </div>
      <p className="text-[10px] text-gray-400 mb-1.5">{label}</p>
      <div className="w-full h-1 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-gray-300 mt-0.5">{goal}</p>
    </div>
  );
}

