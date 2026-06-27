// Gruppen-Challenges: gemeinsames XP-Ziel über einen Zeitraum, Einladung
// gezielt an Freunde. Setzt einen Account voraus (kein lokaler Fallback).

import { ChallengeParticipantStatus, ChallengeSummary } from "@/types";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

interface ChallengeRow {
  id: string;
  creator_id: string;
  name: string;
  goal_type: "xp";
  target_value: number;
  starts_at: string;
  ends_at: string;
}

interface ParticipantRow {
  challenge_id: string;
  user_id: string;
  status: ChallengeParticipantStatus;
  starting_xp: number;
}

interface ProfileNameRow {
  user_id: string;
  display_name: string | null;
}

interface StatsXpRow {
  user_id: string;
  xp: number;
}

function fallbackName(userId: string): string {
  return `Nutzer ${userId.slice(0, 4)}`;
}

export function isChallengesAvailable(): boolean {
  return isSupabaseConfigured();
}

async function requireUserId(): Promise<string> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) throw new Error("Nicht angemeldet. Bitte melde dich erneut an.");
  return userId;
}

export async function createChallenge(params: {
  name: string;
  targetXp: number;
  durationDays: number;
  friendUserIds: string[];
}): Promise<void> {
  const supabase = getSupabaseClient();
  const userId = await requireUserId();

  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + params.durationDays * 24 * 60 * 60 * 1000);

  const { data: challenge, error } = await supabase
    .from("challenges")
    .insert({
      creator_id: userId,
      name: params.name.trim(),
      goal_type: "xp",
      target_value: params.targetXp,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
    })
    .select("id")
    .single();
  if (error || !challenge) throw new Error(error?.message || "Challenge konnte nicht erstellt werden.");

  const { data: ownStats } = await supabase
    .from("user_stats")
    .select("xp")
    .eq("user_id", userId)
    .maybeSingle();

  const participantRows = [
    { challenge_id: challenge.id, user_id: userId, status: "accepted", starting_xp: ownStats?.xp ?? 0, joined_at: new Date().toISOString() },
    ...params.friendUserIds.map((friendId) => ({
      challenge_id: challenge.id,
      user_id: friendId,
      status: "invited" as const,
      starting_xp: 0,
    })),
  ];

  const { error: participantsError } = await supabase
    .from("challenge_participants")
    .insert(participantRows);
  if (participantsError) throw new Error(participantsError.message);
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

export async function getMyChallenges(): Promise<ChallengeSummary[]> {
  const supabase = getSupabaseClient();
  const userId = await requireUserId();

  const { data: challengeRows, error } = await supabase
    .from("challenges")
    .select("id, creator_id, name, goal_type, target_value, starts_at, ends_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const challenges = (challengeRows as ChallengeRow[]) ?? [];
  if (challenges.length === 0) return [];

  const challengeIds = challenges.map((c) => c.id);
  const { data: participantRows, error: pError } = await supabase
    .from("challenge_participants")
    .select("challenge_id, user_id, status, starting_xp")
    .in("challenge_id", challengeIds);
  if (pError) throw new Error(pError.message);

  const participants = (participantRows as ParticipantRow[]) ?? [];
  const allUserIds = Array.from(new Set(participants.map((p) => p.user_id)));

  const { data: statsRows } = await supabase
    .from("user_stats")
    .select("user_id, xp")
    .in("user_id", allUserIds.length > 0 ? allUserIds : [userId]);
  const xpByUser = new Map<string, number>();
  (statsRows as StatsXpRow[] | null)?.forEach((row) => xpByUser.set(row.user_id, row.xp));

  const names = await namesForUserIds(allUserIds);

  return challenges
    .map((c) => {
      const myRow = participants.find((p) => p.challenge_id === c.id && p.user_id === userId);
      const challengeParticipants = participants
        .filter((p) => p.challenge_id === c.id)
        .map((p) => {
          const currentXp = xpByUser.get(p.user_id) ?? 0;
          const progress = p.status === "accepted" ? Math.max(0, currentXp - p.starting_xp) : 0;
          return {
            userId: p.user_id,
            displayName: p.user_id === userId ? "Du" : names.get(p.user_id) ?? fallbackName(p.user_id),
            status: p.status,
            progress,
            isSelf: p.user_id === userId,
          };
        })
        .sort((a, b) => b.progress - a.progress);

      return {
        id: c.id,
        creatorId: c.creator_id,
        name: c.name,
        goalType: c.goal_type,
        targetValue: c.target_value,
        startsAt: c.starts_at,
        endsAt: c.ends_at,
        myStatus: myRow?.status ?? "invited",
        participants: challengeParticipants,
      };
    })
    .filter((c) => c.participants.some((p) => p.userId === userId));
}

export async function acceptChallenge(challengeId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const userId = await requireUserId();

  const { data: stats } = await supabase
    .from("user_stats")
    .select("xp")
    .eq("user_id", userId)
    .maybeSingle();

  const { error } = await supabase
    .from("challenge_participants")
    .update({ status: "accepted", starting_xp: stats?.xp ?? 0, joined_at: new Date().toISOString() })
    .eq("challenge_id", challengeId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function declineChallenge(challengeId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const userId = await requireUserId();
  const { error } = await supabase
    .from("challenge_participants")
    .update({ status: "declined" })
    .eq("challenge_id", challengeId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function leaveChallenge(challengeId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const userId = await requireUserId();
  const { error } = await supabase
    .from("challenge_participants")
    .delete()
    .eq("challenge_id", challengeId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}
