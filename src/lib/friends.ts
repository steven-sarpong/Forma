// Social-Features (Freunde, Anfragen, Leaderboard). Setzt einen Account
// voraus – ohne Supabase-Konfiguration gibt es keinen lokalen Fallback, da
// Freundschaften mehrere Nutzer verbinden.

import { FriendListEntry, FriendRequestEntry, LeaderboardEntry } from "@/types";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { calculateLevel } from "@/lib/gamification";

interface FriendshipRow {
  id: string;
  user_id: string;
  friend_id: string;
  status: "pending" | "accepted";
}

interface ProfileNameRow {
  user_id: string;
  display_name: string | null;
}

function fallbackName(userId: string): string {
  return `Nutzer ${userId.slice(0, 4)}`;
}

export function isSocialAvailable(): boolean {
  return isSupabaseConfigured();
}

async function requireUserId(): Promise<string> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) throw new Error("Nicht angemeldet. Bitte melde dich erneut an.");
  return userId;
}

export async function setDisplayName(name: string): Promise<void> {
  const supabase = getSupabaseClient();
  const userId = await requireUserId();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: name.trim() })
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function sendFriendRequest(email: string): Promise<void> {
  const supabase = getSupabaseClient();
  const userId = await requireUserId();

  const { data: foundId, error: rpcError } = await supabase.rpc("find_user_id_by_email", {
    lookup_email: email.trim().toLowerCase(),
  });
  if (rpcError) throw new Error(rpcError.message);
  if (!foundId) throw new Error("Kein Nutzer mit dieser E-Mail-Adresse gefunden.");
  if (foundId === userId) throw new Error("Das ist deine eigene E-Mail-Adresse.");

  const { data: existing } = await supabase
    .from("friendships")
    .select("id, status")
    .or(
      `and(user_id.eq.${userId},friend_id.eq.${foundId}),and(user_id.eq.${foundId},friend_id.eq.${userId})`
    )
    .maybeSingle();

  if (existing) {
    throw new Error(
      existing.status === "accepted"
        ? "Ihr seid bereits befreundet."
        : "Es gibt bereits eine offene Anfrage."
    );
  }

  const { error } = await supabase
    .from("friendships")
    .insert({ user_id: userId, friend_id: foundId, status: "pending" });
  if (error) throw new Error(error.message);
}

async function namesForUserIds(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .in("user_id", userIds);

  const map = new Map<string, string>();
  (data as ProfileNameRow[] | null)?.forEach((row) => {
    map.set(row.user_id, row.display_name?.trim() || fallbackName(row.user_id));
  });
  userIds.forEach((id) => {
    if (!map.has(id)) map.set(id, fallbackName(id));
  });
  return map;
}

export async function getIncomingRequests(): Promise<FriendRequestEntry[]> {
  const supabase = getSupabaseClient();
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("friendships")
    .select("id, user_id, friend_id, status")
    .eq("friend_id", userId)
    .eq("status", "pending");
  if (error) throw new Error(error.message);

  const rows = (data as FriendshipRow[]) ?? [];
  const names = await namesForUserIds(rows.map((r) => r.user_id));

  return rows.map((r) => ({
    friendshipId: r.id,
    userId: r.user_id,
    displayName: names.get(r.user_id) ?? fallbackName(r.user_id),
  }));
}

export async function getFriends(): Promise<FriendListEntry[]> {
  const supabase = getSupabaseClient();
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("friendships")
    .select("id, user_id, friend_id, status")
    .eq("status", "accepted")
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`);
  if (error) throw new Error(error.message);

  const rows = (data as FriendshipRow[]) ?? [];
  const friendIds = rows.map((r) => (r.user_id === userId ? r.friend_id : r.user_id));
  const names = await namesForUserIds(friendIds);

  return rows.map((r) => {
    const friendId = r.user_id === userId ? r.friend_id : r.user_id;
    return {
      friendshipId: r.id,
      userId: friendId,
      displayName: names.get(friendId) ?? fallbackName(friendId),
    };
  });
}

export async function acceptFriendRequest(friendshipId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("friendships")
    .update({ status: "accepted" })
    .eq("id", friendshipId);
  if (error) throw new Error(error.message);
}

export async function removeFriendship(friendshipId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
  if (error) throw new Error(error.message);
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const supabase = getSupabaseClient();
  const userId = await requireUserId();

  const friends = await getFriends();
  const allIds = [userId, ...friends.map((f) => f.userId)];

  const { data: statsRows, error } = await supabase
    .from("user_stats")
    .select("user_id, xp, current_streak")
    .in("user_id", allIds);
  if (error) throw new Error(error.message);

  const names = await namesForUserIds(allIds);
  const statsByUser = new Map<string, { xp: number; current_streak: number }>();
  (statsRows ?? []).forEach((row: { user_id: string; xp: number; current_streak: number }) => {
    statsByUser.set(row.user_id, row);
  });

  const entries: LeaderboardEntry[] = allIds.map((id) => {
    const stats = statsByUser.get(id) ?? { xp: 0, current_streak: 0 };
    return {
      userId: id,
      displayName: id === userId ? "Du" : names.get(id) ?? fallbackName(id),
      xp: stats.xp,
      level: calculateLevel(stats.xp).level,
      currentStreak: stats.current_streak,
      isSelf: id === userId,
    };
  });

  entries.sort((a, b) => b.xp - a.xp);
  return entries;
}
