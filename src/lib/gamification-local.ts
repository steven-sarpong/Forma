// Lokaler Fallback (localStorage) für Gamification-Stats, solange Supabase
// nicht konfiguriert ist – analog zu storage-local.ts.

import { GamificationStats } from "@/types";

const STATS_KEY = "fridgeai_gamification_stats";

function isBrowser() {
  return typeof window !== "undefined";
}

const EMPTY_STATS: GamificationStats = {
  xp: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastActivityDate: null,
  unlockedBadgeIds: [],
};

export function getLocalStats(): GamificationStats {
  if (!isBrowser()) return EMPTY_STATS;
  try {
    const raw = window.localStorage.getItem(STATS_KEY);
    if (!raw) return EMPTY_STATS;
    return { ...EMPTY_STATS, ...JSON.parse(raw) };
  } catch {
    return EMPTY_STATS;
  }
}

export function saveLocalStats(stats: GamificationStats) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

export function clearLocalStats() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STATS_KEY);
}
