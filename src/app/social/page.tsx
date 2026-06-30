"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users, UserPlus, Check, X, Pencil, Sparkles, Trophy, Swords,
  ChevronRight,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import AvatarUpload, { getStoredAvatar } from "@/components/AvatarUpload";
import { getProfile } from "@/lib/profile";
import {
  acceptFriendRequest,
  getFriends,
  getIncomingRequests,
  isSocialAvailable,
  removeFriendship,
  sendFriendRequest,
  setDisplayName,
} from "@/lib/friends";
import FriendProfileSheet from "@/components/FriendProfileSheet";
import { getFriendsFeed } from "@/lib/activity-feed";
import { ActivityFeedEntry, FriendListEntry, FriendRequestEntry } from "@/types";

export default function SocialPage() {
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayNameState] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);

  const [emailInput, setEmailInput] = useState("");
  const [sending, setSending] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);

  const [requests, setRequests] = useState<FriendRequestEntry[]>([]);
  const [friends, setFriends] = useState<FriendListEntry[]>([]);
  const [feed, setFeed] = useState<ActivityFeedEntry[]>([]);

  const [selectedFriend, setSelectedFriend] = useState<{ userId: string; displayName: string } | null>(null);

  async function reload() {
    const [reqs, frs, fd] = await Promise.all([getIncomingRequests(), getFriends(), getFriendsFeed()]);
    setRequests(reqs);
    setFriends(frs);
    setFeed(fd);
  }

  useEffect(() => {
    setAvatar(getStoredAvatar());
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

  if (!available) {
    return (
      <div>
        <PageHeader title="Freunde" subtitle="Freunde & Aktivitäten" />
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
      <PageHeader title="Freunde" subtitle="Freunde, Anfragen & Aktivitäten" />

      <div className="px-5 space-y-5">
        {/* Link zu Challenges */}
        <Link
          href="/challenges"
          className="card p-4 flex items-center gap-3 bg-gradient-to-br from-white to-brand-50/60"
        >
          <span className="w-11 h-11 rounded-full bg-brand-600 flex items-center justify-center shrink-0">
            <Trophy size={20} className="text-white" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-brand-900">Leaderboard & Challenges</p>
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Swords size={11} /> Vergleiche dich mit Freunden und starte Wettkämpfe
            </p>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </Link>

        {/* Eigenes Profil */}
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-400 mb-3">Dein Profil</p>
          <div className="flex items-center gap-4">
            <AvatarUpload
              value={avatar}
              onChange={setAvatar}
              initials={displayName || "?"}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {editingName ? (
                  <div className="flex gap-2 flex-1">
                    <input
                      autoFocus
                      className="input-field flex-1 text-sm"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Anzeigename"
                      maxLength={30}
                    />
                    <button onClick={handleSaveName} disabled={savingName || !nameInput.trim()} className="btn-primary px-3 text-sm">
                      {savingName ? "…" : "OK"}
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-brand-900 truncate">
                      {displayName || "Noch kein Name"}
                    </p>
                    <button onClick={() => setEditingName(true)} className="text-gray-400" aria-label="Bearbeiten">
                      <Pencil size={13} />
                    </button>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Tippe auf das Bild um ein Foto hinzuzufügen</p>
            </div>
          </div>
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
                  <button onClick={() => handleAccept(r.friendshipId)} className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center" aria-label="Annehmen">
                    <Check size={15} />
                  </button>
                  <button onClick={() => handleDecline(r.friendshipId)} className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center" aria-label="Ablehnen">
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

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
                    <span className="font-semibold text-brand-900">{entry.displayName}</span> {entry.message}
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
            <div className="card p-4 text-sm text-gray-400 text-center">Noch keine Freunde hinzugefügt.</div>
          ) : (
            <div className="space-y-2">
              {friends.map((f) => (
                <div key={f.friendshipId} className="card p-3 flex items-center gap-3">
                  <button
                    onClick={() => setSelectedFriend({ userId: f.userId, displayName: f.displayName })}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <span className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-sm shrink-0">
                      {f.displayName.slice(0, 1).toUpperCase()}
                    </span>
                    <p className="text-sm font-medium text-brand-900 truncate">{f.displayName}</p>
                  </button>
                  <button onClick={() => handleRemoveFriend(f.friendshipId)} className="text-xs text-rose-400 shrink-0">
                    Entfernen
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedFriend && (
        <FriendProfileSheet
          userId={selectedFriend.userId}
          displayName={selectedFriend.displayName}
          onClose={() => setSelectedFriend(null)}
        />
      )}
    </div>
  );
}

