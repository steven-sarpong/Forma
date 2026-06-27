// XP/Level/Streak/Badge-Logik. Synchronisiert über Supabase (RLS), mit
// lokalem Fallback analog zu lib/profile.ts / lib/storage.ts.

import { BadgeDefinition, BadgeId, GamificationStats, LevelInfo, XpReason } from "@/types";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getLocalStats, saveLocalStats, clearLocalStats } from "@/lib/gamification-local";
import { getFridgeItems, getMeals, getWeightEntries, getWorkoutLogs } from "@/lib/storage";
import { getProfile } from "@/lib/profile";
import { postActivity } from "@/lib/activity-feed";

const XP_REWARDS: Record<XpReason, number> = {
  meal: 10,
  scan: 15,
  weight: 10,
  workout: 25,
};

const XP_PER_LEVEL = 100;

export function calculateLevel(xp: number): LevelInfo {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const xpIntoLevel = xp % XP_PER_LEVEL;
  return {
    level,
    xpIntoLevel,
    xpForNextLevel: XP_PER_LEVEL,
    progress: xpIntoLevel / XP_PER_LEVEL,
  };
}

export const BADGES: BadgeDefinition[] = [
  { id: "erster_scan", name: "Erster Scan", description: "Scanne deinen ersten Kühlschrank-Artikel per KI", icon: "ScanLine" },
  { id: "meal_tracker", name: "Meal Tracker", description: "Erfasse 10 Mahlzeiten", icon: "UtensilsCrossed" },
  { id: "wochen_champion", name: "Wochen-Champion", description: "7 Tage in Folge aktiv", icon: "Flame" },
  { id: "trainings_starter", name: "Trainings-Starter", description: "Schließe deine erste Trainingseinheit ab", icon: "Dumbbell" },
  { id: "eisensportler", name: "Eisensportler", description: "Schließe 10 Trainingseinheiten ab", icon: "Trophy" },
  { id: "gewichts_tracker", name: "Gewichts-Tracker", description: "Trage 5 Gewichtswerte ein", icon: "Scale" },
  { id: "zielgewicht_erreicht", name: "Zielgewicht erreicht", description: "Erreiche dein Zielgewicht (±1 kg)", icon: "Target" },
  { id: "streak_master", name: "Streak-Master", description: "30 Tage in Folge aktiv", icon: "Sparkles" },
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const diff = new Date(a).getTime() - new Date(b).getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function updateStreak(stats: GamificationStats): GamificationStats {
  const today = todayIso();
  if (stats.lastActivityDate === today) {
    return stats; // heute schon aktiv gewesen, Streak bleibt unverändert
  }
  let currentStreak = 1;
  if (stats.lastActivityDate) {
    const gap = daysBetween(today, stats.lastActivityDate);
    if (gap === 1) {
      currentStreak = stats.currentStreak + 1;
    }
  }
  return {
    ...stats,
    currentStreak,
    longestStreak: Math.max(stats.longestStreak, currentStreak),
    lastActivityDate: today,
  };
}

async function evaluateBadges(stats: GamificationStats): Promise<BadgeId[]> {
  const unlocked = new Set(stats.unlockedBadgeIds);
  const newlyUnlocked: BadgeId[] = [];

  function unlock(id: BadgeId, condition: boolean) {
    if (condition && !unlocked.has(id)) {
      unlocked.add(id);
      newlyUnlocked.push(id);
    }
  }

  const [fridgeItems, meals, weightEntries, workoutLogs, profile] = await Promise.all([
    getFridgeItems(),
    getMeals(),
    getWeightEntries(),
    getWorkoutLogs(),
    getProfile(),
  ]);

  unlock("erster_scan", fridgeItems.some((i) => i.source === "scan"));
  unlock("meal_tracker", meals.length >= 10);
  unlock("wochen_champion", stats.currentStreak >= 7);
  unlock("trainings_starter", workoutLogs.length >= 1);
  unlock("eisensportler", workoutLogs.length >= 10);
  unlock("gewichts_tracker", weightEntries.length >= 5);
  unlock("streak_master", stats.currentStreak >= 30);

  if (profile && weightEntries.length > 0) {
    const latest = weightEntries[0].weightKg;
    unlock("zielgewicht_erreicht", Math.abs(latest - profile.targetWeightKg) <= 1);
  }

  stats.unlockedBadgeIds = Array.from(unlocked);
  return newlyUnlocked;
}

export async function getStats(): Promise<GamificationStats> {
  if (!isSupabaseConfigured()) return getLocalStats();
  const supabase = getSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return getLocalStats();

  const { data, error } = await supabase
    .from("user_stats")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return { xp: 0, currentStreak: 0, longestStreak: 0, lastActivityDate: null, unlockedBadgeIds: [] };
  }
  return {
    xp: data.xp,
    currentStreak: data.current_streak,
    longestStreak: data.longest_streak,
    lastActivityDate: data.last_activity_date,
    unlockedBadgeIds: data.unlocked_badge_ids ?? [],
  };
}

async function saveStats(stats: GamificationStats): Promise<void> {
  if (!isSupabaseConfigured()) {
    saveLocalStats(stats);
    return;
  }
  const supabase = getSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return;

  await supabase.from("user_stats").upsert(
    {
      user_id: userId,
      xp: stats.xp,
      current_streak: stats.currentStreak,
      longest_streak: stats.longestStreak,
      last_activity_date: stats.lastActivityDate,
      unlocked_badge_ids: stats.unlockedBadgeIds,
    },
    { onConflict: "user_id" }
  );
}

export interface RecordActivityResult {
  stats: GamificationStats;
  xpGained: number;
  leveledUp: boolean;
  previousLevel: number;
  newLevel: number;
  newBadges: BadgeDefinition[];
}

export async function recordActivity(reason: XpReason): Promise<RecordActivityResult> {
  const before = await getStats();
  const previousLevel = calculateLevel(before.xp).level;

  const xpGained = XP_REWARDS[reason];
  let next: GamificationStats = { ...before, xp: before.xp + xpGained };
  next = updateStreak(next);

  const newlyUnlockedIds = await evaluateBadges(next);
  await saveStats(next);

  const newLevel = calculateLevel(next.xp).level;
  const leveledUp = newLevel > previousLevel;
  const newBadges = BADGES.filter((b) => newlyUnlockedIds.includes(b.id));

  if (leveledUp) {
    void postActivity("level_up", `hat Level ${newLevel} erreicht!`);
  }
  newBadges.forEach((badge) => {
    void postActivity("badge_unlock", `hat das Abzeichen „${badge.name}“ freigeschaltet!`);
  });

  return {
    stats: next,
    xpGained,
    leveledUp,
    previousLevel,
    newLevel,
    newBadges,
  };
}

export async function clearStats(): Promise<void> {
  clearLocalStats();
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return;
  await supabase.from("user_stats").delete().eq("user_id", userId);
}
