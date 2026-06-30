"use client";

import { useEffect, useState } from "react";
import { X, Trophy, Sparkles, Flame, Loader2 } from "lucide-react";
import { getFriendProfile, FriendProfile } from "@/lib/friends";
import { BADGES } from "@/lib/gamification";

interface Props {
  userId: string;
  displayName: string;
  onClose: () => void;
}

export default function FriendProfileSheet({ userId, displayName, onClose }: Props) {
  const [profile, setProfile] = useState<FriendProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFriendProfile(userId)
      .then(setProfile)
      .finally(() => setLoading(false));
  }, [userId]);

  const earnedBadges = profile ? BADGES.filter((b) => profile.unlockedBadgeIds.includes(b.id)) : [];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="fixed inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-t-2xl w-full max-w-md mx-auto p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={28} className="animate-spin text-brand-500" />
          </div>
        ) : (
          <>
            <div className="flex items-start gap-4 mb-5">
              <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                <span className="text-2xl font-bold text-brand-600">
                  {displayName.slice(0, 1).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-brand-900 truncate">{profile?.displayName ?? displayName}</p>
                {profile && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Dabei seit{" "}
                    {new Date(profile.memberSince).toLocaleDateString("de-DE", {
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
              <button onClick={onClose} className="text-gray-400 shrink-0 mt-1" aria-label="Schließen">
                <X size={20} />
              </button>
            </div>

            {profile && (
              <>
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <StatChip icon={<Trophy size={14} className="text-brand-600" />} label="Level" value={String(profile.level)} />
                  <StatChip icon={<Sparkles size={14} className="text-amber-500" />} label="XP" value={String(profile.xp)} />
                  <StatChip icon={<Flame size={14} className="text-accent-500" />} label="Streak" value={`${profile.currentStreak}d`} />
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">
                    Abzeichen ({earnedBadges.length} / {BADGES.length})
                  </p>
                  {earnedBadges.length === 0 ? (
                    <p className="text-xs text-gray-400">Noch keine Abzeichen freigeschaltet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {earnedBadges.map((b) => (
                        <span key={b.id} className="pill bg-brand-50 border border-brand-100 text-brand-700 text-xs">
                          {b.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-brand-50 rounded-xl p-3 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <p className="text-base font-bold text-brand-900">{value}</p>
      <p className="text-[10px] text-gray-400">{label}</p>
    </div>
  );
}
