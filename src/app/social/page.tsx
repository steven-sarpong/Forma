"use client";

import { useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  Trophy,
  Check,
  X,
  Flame,
  Pencil,
  Swords,
  Sparkles,
  Plus,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { getProfile } from "@/lib/profile";
import {
  acceptFriendRequest,
  getFriends,
  getIncomingRequests,
  getLeaderboard,
  isSocialAvailable,
  removeFriendship,
  sendFriendRequest,
  setDisplayName,
} from "@/lib/friends";
import {
  acceptChallenge,
  createChallenge,
  declineChallenge,
  getMyChallenges,
  leaveChallenge,
} from "@/lib/challenges";
import { getFriendsFeed } from "@/lib/activity-feed";
import {
  ActivityFeedEntry,
  ChallengeSummary,
  FriendListEntry,
  FriendRequestEntry,
  LeaderboardEntry,
} from "@/types";

export default function SocialPage() {
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayNameState] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [emailInput, setEmailInput] = useState("");
  const [sending, setSending] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);

  const [requests, setRequests] = useState<FriendRequestEntry[]>([]);
  const [friends, setFriends] = useState<FriendListEntry[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [challenges, setChallenges] = useState<ChallengeSummary[]>([]);
  const [feed, setFeed] = useState<ActivityFeedEntry[]>([]);

  const [showCreateChallenge, setShowCreateChallenge] = useState(false);
  const [challengeName, setChallengeName] = useState("");
  const [challengeTargetXp, setChallengeTargetXp] = useState("200");
  const [challengeDuration, setChallengeDuration] = useState("7");
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [creatingChallenge, setCreatingChallenge] = useState(false);
  const [challengeError, setChallengeError] = useState<string | null>(null);

  async function reload() {
    const [reqs, frs, board, ch, fd] = await Promise.all([
      getIncomingRequests(),
      getFriends(),
      getLeaderboard(),
      getMyChallenges(),
      getFriendsFeed(),
    ]);
    setRequests(reqs);
    setFriends(frs);
    setLeaderboard(board);
    setChallenges(ch);
    setFeed(fd);
  }

  useEffect(() => {
    (async () => {
      if (!isSocialAvailable()) {
        setAvailable(false);
        setLoading(false);
        return;
      }
      const profile = await getProfile();
      setDisplayNameState(profile?.displayName?.trim() || "");
      setNameInput(profile?.displayName?.trim() || "");
      await reload();
      setLoading(false);
    })();
  }, []);

  async function handleSaveName() {
    if (!nameInput.trim()) return;
    setSavingName(true);
    try {
      await setDisplayName(nameInput.trim());
      setDisplayNameState(nameInput.trim());
      setEditingName(false);
      await reload();
    } finally {
      setSavingName(false);
    }
  }

  async function handleSendRequest(e: React.FormEvent) {
    e.preventDefault();
    setRequestError(null);
    setRequestSuccess(null);
    setSending(true);
    try {
      await sendFriendRequest(emailInput);
      setRequestSuccess("Anfrage gesendet!");
      setEmailInput("");
      await reload();
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : "Anfrage fehlgeschlagen.");
    } finally {
      setSending(false);
    }
  }

  async function handleAccept(friendshipId: string) {
    await acceptFriendRequest(friendshipId);
    await reload();
  }

  async function handleDecline(friendshipId: string) {
    await removeFriendship(friendshipId);
    await reload();
  }

  async function handleRemoveFriend(friendshipId: string) {
    await removeFriendship(friendshipId);
    await reload();
  }

  function toggleFriendSelection(friendUserId: string) {
    setSelectedFriendIds((prev) =>
      prev.includes(friendUserId)
        ? prev.filter((id) => id !== friendUserId)
        : [...prev, friendUserId]
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
        <PageHeader title="Freunde" subtitle="Freunde, Anfragen & Leaderboard" />
        <div className="px-5">
          <div className="card p-5 text-center text-sm text-gray-400">
            Social-Features benötigen Cloud-Sync. Richte zuerst Supabase ein (siehe Einstellungen).
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
      <PageHeader title="Freunde" subtitle="Freunde, Anfragen & Leaderboard" />

      <div className="px-5 space-y-5">
        {/* Anzeigename */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-brand-900">Dein Anzeigename</p>
            {!editingName && (
              <button
                onClick={() => setEditingName(true)}
                className="text-gray-400 hover:text-brand-600"
                aria-label="Anzeigenamen bearbeiten"
              >
                <Pencil size={14} />
              </button>
            )}
          </div>
          {editingName ? (
            <div className="flex gap-2 mt-2">
              <input
                className="input-field flex-1"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="z. B. Max"
                maxLength={30}
              />
              <button
                onClick={handleSaveName}
                disabled={savingName || !nameInput.trim()}
                className="btn-primary px-4"
              >
                Speichern
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              {displayName || "Noch kein Name gesetzt – Freunde sehen sonst eine zufällige ID."}
            </p>
          )}
        </div>

        {/* Freund hinzufügen */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus size={18} className="text-brand-600" />
            <p className="text-sm font-semibold text-brand-900">Freund hinzufügen</p>
          </div>
          <form onSubmit={handleSendRequest} className="flex gap-2">
            <input
              type="email"
              className="input-field flex-1"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="E-Mail-Adresse"
              required
            />
            <button type="submit" disabled={sending} className="btn-primary px-4">
              Senden
            </button>
          </form>
          {requestError && <p className="text-xs text-rose-500 mt-2">{requestError}</p>}
          {requestSuccess && <p className="text-xs text-brand-600 mt-2">{requestSuccess}</p>}
        </div>

        {/* Eingehende Anfragen */}
        {requests.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-2">Anfragen</p>
            <div className="space-y-2">
              {requests.map((r) => (
                <div key={r.friendshipId} className="card p-3 flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-sm shrink-0">
                    {r.displayName.slice(0, 1).toUpperCase()}
                  </span>
                  <p className="flex-1 text-sm font-medium text-brand-900">{r.displayName}</p>
                  <button
                    onClick={() => handleAccept(r.friendshipId)}
                    className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center"
                    aria-label="Annehmen"
                  >
                    <Check size={15} />
                  </button>
                  <button
                    onClick={() => handleDecline(r.friendshipId)}
                    className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center"
                    aria-label="Ablehnen"
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={16} className="text-accent-500" />
            <p className="text-sm font-semibold text-gray-500">Leaderboard</p>
          </div>
          {leaderboard.length <= 1 ? (
            <div className="card p-4 text-sm text-gray-400 text-center">
              Füge Freunde hinzu, um euch zu vergleichen.
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry, i) => (
                <div
                  key={entry.userId}
                  className={`card p-3 flex items-center gap-3 ${
                    entry.isSelf ? "border-brand-300 bg-brand-50/50" : ""
                  }`}
                >
                  <span className="w-7 text-sm font-bold text-gray-400 text-center">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-brand-900 truncate">
                      {entry.displayName}
                    </p>
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
              <p className="text-sm font-semibold text-gray-500">Challenges</p>
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
                          className={`pill ${
                            selected ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600"
                          }`}
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
                Challenge starten
              </button>
            </form>
          )}

          {challenges.length === 0 ? (
            <div className="card p-4 text-sm text-gray-400 text-center">
              Noch keine Challenges. Starte eine mit deinen Freunden!
            </div>
          ) : (
            <div className="space-y-3">
              {challenges.map((c) => (
                <div key={c.id} className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-brand-900">{c.name}</p>
                    <span className="text-[11px] text-gray-400">
                      {daysRemaining(c.endsAt)} Tage übrig
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">Ziel: {c.targetValue} XP</p>

                  <div className="space-y-2">
                    {c.participants
                      .filter((p) => p.status === "accepted")
                      .map((p) => (
                        <div key={p.userId} className="flex items-center gap-2">
                          <p className="text-xs font-medium text-brand-900 w-20 truncate">
                            {p.displayName}
                          </p>
                          <div className="flex-1 h-2 rounded-full bg-brand-100 overflow-hidden">
                            <div
                              className="h-full bg-brand-600"
                              style={{
                                width: `${Math.min(100, (p.progress / c.targetValue) * 100)}%`,
                              }}
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
                      <button
                        onClick={() => handleAcceptChallenge(c.id)}
                        className="btn-primary flex-1 py-2 text-sm"
                      >
                        Annehmen
                      </button>
                      <button
                        onClick={() => handleDeclineChallenge(c.id)}
                        className="btn-secondary flex-1 py-2 text-sm"
                      >
                        Ablehnen
                      </button>
                    </div>
                  )}
                  {c.myStatus === "accepted" && c.creatorId !== c.participants.find((p) => p.isSelf)?.userId && (
                    <button
                      onClick={() => handleLeaveChallenge(c.id)}
                      className="text-xs text-rose-500 mt-3"
                    >
                      Challenge verlassen
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Freundes-Feed */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-gray-400" />
            <p className="text-sm font-semibold text-gray-500">Freundes-Feed</p>
          </div>
          {feed.length === 0 ? (
            <div className="card p-4 text-sm text-gray-400 text-center">
              Noch keine Aktivitäten. Level-Ups und Abzeichen erscheinen hier.
            </div>
          ) : (
            <div className="space-y-2">
              {feed.map((entry) => (
                <div key={entry.id} className="card p-3 flex items-center gap-3">
                  {entry.type === "level_up" ? (
                    <Trophy size={16} className="text-accent-500 shrink-0" />
                  ) : (
                    <Sparkles size={16} className="text-brand-600 shrink-0" />
                  )}
                  <p className="flex-1 text-sm text-gray-700">
                    <span className="font-semibold text-brand-900">{entry.displayName}</span>{" "}
                    {entry.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Freundesliste */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} className="text-gray-400" />
            <p className="text-sm font-semibold text-gray-500">Deine Freunde</p>
          </div>
          {friends.length === 0 ? (
            <div className="card p-4 text-sm text-gray-400 text-center">
              Noch keine Freunde hinzugefügt.
            </div>
          ) : (
            <div className="space-y-2">
              {friends.map((f) => (
                <div key={f.friendshipId} className="card p-3 flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-sm shrink-0">
                    {f.displayName.slice(0, 1).toUpperCase()}
                  </span>
                  <p className="flex-1 text-sm font-medium text-brand-900">{f.displayName}</p>
                  <button
                    onClick={() => handleRemoveFriend(f.friendshipId)}
                    className="text-xs text-rose-500"
                  >
                    Entfernen
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
