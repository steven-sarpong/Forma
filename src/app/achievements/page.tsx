"use client";

import { useEffect, useState } from "react";
import {
  Flame,
  Trophy,
  Lock,
  ScanLine,
  UtensilsCrossed,
  Dumbbell,
  Scale,
  Target,
  Sparkles,
  LucideIcon,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { BADGES, calculateLevel, getStats } from "@/lib/gamification";
import { BadgeId, GamificationStats, LevelInfo } from "@/types";

const BADGE_ICONS: Record<string, LucideIcon> = {
  ScanLine,
  UtensilsCrossed,
  Flame,
  Dumbbell,
  Trophy,
  Scale,
  Target,
  Sparkles,
};

export default function AchievementsPage() {
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [level, setLevel] = useState<LevelInfo | null>(null);

  useEffect(() => {
    (async () => {
      const s = await getStats();
      setStats(s);
      setLevel(calculateLevel(s.xp));
    })();
  }, []);

  if (!stats || !level) {
    return <div className="px-5 pt-10 text-center text-sm text-gray-400">Lade Fortschritt...</div>;
  }

  const unlocked = new Set<BadgeId>(stats.unlockedBadgeIds);

  return (
    <div>
      <PageHeader title="Erfolge" subtitle="Dein Fortschritt & deine Abzeichen" />

      <div className="px-5 space-y-5">
        {/* Level & XP */}
        <div className="card p-5 bg-gradient-to-br from-brand-600 to-brand-700 text-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-brand-100">Aktuelles Level</p>
              <p className="text-2xl font-bold">Level {level.level}</p>
            </div>
            <span className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center">
              <Trophy size={24} />
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/20 overflow-hidden mb-1">
            <div
              className="h-full bg-white transition-all"
              style={{ width: `${Math.round(level.progress * 100)}%` }}
            />
          </div>
          <p className="text-xs text-brand-100">
            {level.xpIntoLevel} / {level.xpForNextLevel} XP bis Level {level.level + 1}
          </p>
        </div>

        {/* Streak */}
        <div className="card p-4 flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-accent-100 flex items-center justify-center shrink-0">
            <Flame size={18} className="text-accent-500" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-brand-900">{stats.currentStreak} Tage Streak</p>
            <p className="text-xs text-gray-400">Längste Streak: {stats.longestStreak} Tage</p>
          </div>
        </div>

        {/* Badges */}
        <div>
          <p className="text-sm font-semibold text-gray-500 mb-2">Abzeichen</p>
          <div className="grid grid-cols-2 gap-3">
            {BADGES.map((badge) => {
              const isUnlocked = unlocked.has(badge.id);
              const Icon = BADGE_ICONS[badge.icon] ?? Trophy;
              return (
                <div
                  key={badge.id}
                  className={`card p-3 flex flex-col items-center text-center gap-1.5 ${
                    isUnlocked ? "" : "opacity-50"
                  }`}
                >
                  <span
                    className={`w-11 h-11 rounded-full flex items-center justify-center ${
                      isUnlocked ? "bg-brand-100" : "bg-gray-100"
                    }`}
                  >
                    {isUnlocked ? (
                      <Icon size={20} className="text-brand-600" />
                    ) : (
                      <Lock size={18} className="text-gray-400" />
                    )}
                  </span>
                  <p className="text-xs font-semibold text-brand-900">{badge.name}</p>
                  <p className="text-[11px] text-gray-400">{badge.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
