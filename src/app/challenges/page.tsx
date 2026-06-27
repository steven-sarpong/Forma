"use client";

import { useEffect, useState } from "react";
import { Trophy, Swords, Plus, Flame, Crown } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { getLeaderboard, getFriends, isSocialAvailable } from "@/lib/friends";
import {
  acceptChallenge,
  createChallenge,
  declineChallenge,
  getMyChallenges,
  leaveChallenge,
} from "@/lib/challenges";
import { ChallengeSummary, FriendListEntry, LeaderboardEntry } from "@/types";

export default function ChallengesPage() {
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(true);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [friends, setFriends] = useState<FriendListEntry[]>([]);
  const [challenges, setChallenges] = useState<ChallengeSummary[]>([]);

  const [showCreateChallenge, setShowCreateChallenge] = useState(false);
  const [challengeName, setChallengeName] = useState("");
  const [challengeTargetXp, setChallengeTargetXp] = useState("200");
  const [challengeDuration, setChallengeDuration] = useState("7");
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [creatingChallenge, setCreatingChallenge] = useState(false);
  const [challengeError, setChallengeError] = useState<string | null>(null);

  async function reload() {
    const [board, frs, ch] = await Promise.all([getLeaderboard(), getFriends(), getMyChallenges()]);
    setLeaderboard(board);
    setFriends(frs);
    setChallenges(ch);
  }

  useEffect(() => {
    (async () => {
      if (!isSocialAvailable()) {
        setAvailable(false);
        setLoading(false);
        return;
      }
      await reload();
      setLoading(false);
    })();
  }, []);

  function toggleFriendSelection(friendUserId: string) {
    setSelectedFriendIds((prev) =>
      prev.includes(friendUserId) ? prev.filter((id) => id !== friendUserId) : [...prev, friendUserId]
    );
  }

  async function handleCreateChallenge(e: React.FormEvent) {
    e.preventDefault();
    setChallengeError(null);
    const targetXp = Number(challengeTargetXp);
    const durationDays = Number(challengeDuration);
    if (!challengeName.trim() || !targetXp || targetXp <= 0 || !durationDays || durationDays <= 0) {
      setChallengeError("Bitte Name, gültiges XP-Ziel und Dauer angeben.");
      return;
    }
    setCreatingChallenge(true);
    try {
      await createChallenge({
        name: challengeName.trim(),
        targetXp,
        durationDays,
        friendUserIds: selectedFriendIds,
      });
      setChallengeName("");
      setChallengeTargetXp("200");
      setChallengeDuration("7");
      setSelectedFriendIds([]);
      setShowCreateChallenge(false);
      await reload();
    } catch (err) {
      setChallengeError(err instanceof Error ? err.message : "Challenge konnte nicht erstellt werden.");
    } finally {
      setCreatingChallenge(false);
    }
  }

  async function handleAcceptChallenge(challengeId: string) {
    await acceptChallenge(challengeId);
    await reload();
  }

  async function handleDeclineChallenge(challengeId: string) {
    await declineChallenge(challengeId);
    await reload();
  }

  async function handleLeaveChallenge(challengeId: string) {
    await leaveChallenge(challengeId);
    await reload();
  }

  function daysRemaining(endsAt: string): number {
    return Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  }

  if (!available) {
    return (
      <div>
        <PageHeader title="Challenges" subtitle="Leaderboard & gemeinsame Ziele" />
        <div className="px-5">
          <div className="card p-5 text-center text-sm text-gray-400">
            Challenges benötigen Cloud-Sync. Richte zuerst Supabase ein (siehe Einstellungen).
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="px-5 pt-10 text-center text-sm text-gray-400">Lade...</div>;
  }

  return (
    <div>
      <PageHeader title="Challenges" subtitle="Leaderboard & gemeinsame Ziele" />

      <div className="px-5 space-y-6 pb-6">
        {/* Leaderboard */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={16} className="text-accent-500" />
            <p className="text-sm font-semibold text-gray-500">Leaderboard</p>
          </div>
          {leaderboard.length <= 1 ? (
            <div className="card p-4 text-sm text-gray-400 text-center">
              Füge Freunde hinzu (im Bereich „Freunde“), um euch zu vergleichen.
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry, i) => (
                <div
                  key={entry.userId}
                  className={`card p-3 flex items-center gap-3 ${
                    entry.isSelf ? "border-brand-300 bg-brand-50/60" : ""
                  }`}
                >
                  <span className="w-7 flex items-center justify-center text-sm font-bold text-gray-400">
                    {i === 0 ? <Crown size={16} className="text-amber-400" /> : i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-brand-900 truncate">{entry.displayName}</p>
                    <p className="text-xs text-gray-400">Level {entry.level}</p>
                  </div>
                  <span className="text-xs text-accent-600 font-medium flex items-center gap-1">
                    <Flame size={12} /> {entry.currentStreak}
                  </span>
                  <span className="pill bg-brand-50 text-brand-700">{entry.xp} XP</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Challenges */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Swords size={16} className="text-brand-600" />
              <p className="text-sm font-semibold text-gray-500">Aktive Challenges</p>
            </div>
            <button
              onClick={() => setShowCreateChallenge((v) => !v)}
              className="text-xs text-brand-600 font-medium flex items-center gap-1"
            >
              <Plus size={14} /> Neue Challenge
            </button>
          </div>

          {showCreateChallenge && (
            <form onSubmit={handleCreateChallenge} className="card p-4 space-y-3 mb-3">
              <div>
                <label className="text-xs text-gray-500">Name</label>
                <input
                  className="input-field mt-1"
                  value={challengeName}
                  onChange={(e) => setChallengeName(e.target.value)}
                  placeholder="z. B. Wochen-Sprint"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500">XP-Ziel</label>
                  <input
                    type="number"
                    className="input-field mt-1"
                    value={challengeTargetXp}
                    onChange={(e) => setChallengeTargetXp(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Dauer (Tage)</label>
                  <input
                    type="number"
                    className="input-field mt-1"
                    value={challengeDuration}
                    onChange={(e) => setChallengeDuration(e.target.value)}
                  />
                </div>
              </div>
              {friends.length > 0 && (
                <div>
                  <label className="text-xs text-gray-500">Freunde einladen</label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {friends.map((f) => {
                      const selected = selectedFriendIds.includes(f.userId);
                      return (
                        <button
                          type="button"
                          key={f.userId}
                          onClick={() => toggleFriendSelection(f.userId)}
                          className={`pill ${selected ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600"}`}
                        >
                          {f.displayName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {challengeError && <p className="text-xs text-rose-500">{challengeError}</p>}
              <button type="submit" disabled={creatingChallenge} className="btn-primary w-full">
                {creatingChallenge ? "Wird erstellt..." : "Challenge starten"}
              </button>
            </form>
          )}

          {challenges.length === 0 ? (
            <div className="card p-6 flex flex-col items-center text-center gap-2">
              <Swords size={26} className="text-brand-300" />
              <p className="text-sm text-gray-400">
                Noch keine Challenges. Starte eine mit deinen Freunden!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {challenges.map((c) => (
                <div key={c.id} className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-brand-900">{c.name}</p>
                    <span className="text-[11px] text-gray-400">{daysRemaining(c.endsAt)} Tage übrig</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">Ziel: {c.targetValue} XP</p>

                  <div className="space-y-2">
                    {c.participants
                      .filter((p) => p.status === "accepted")
                      .map((p) => (
                        <div key={p.userId} className="flex items-center gap-2">
                          <p className="text-xs font-medium text-brand-900 w-20 truncate">{p.displayName}</p>
                          <div className="flex-1 h-2 rounded-full bg-brand-100 overflow-hidden">
                            <div
                              className="h-full bg-brand-600"
                              style={{ width: `${Math.min(100, (p.progress / c.targetValue) * 100)}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-gray-400 w-16 text-right">
                            {p.progress}/{c.targetValue}
                          </p>
                        </div>
                      ))}
                  </div>

                  {c.myStatus === "invited" && (
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => handleAcceptChallenge(c.id)} className="btn-primary flex-1 py-2 text-sm">
                        Annehmen
                      </button>
                      <button onClick={() => handleDeclineChallenge(c.id)} className="btn-secondary flex-1 py-2 text-sm">
                        Ablehnen
                      </button>
                    </div>
                  )}
                  {c.myStatus === "accepted" && c.creatorId !== c.participants.find((p) => p.isSelf)?.userId && (
                    <button onClick={() => handleLeaveChallenge(c.id)} className="text-xs text-rose-500 mt-3">
                      Challenge verlassen
                    </button>
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
