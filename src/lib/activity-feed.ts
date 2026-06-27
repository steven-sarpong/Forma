// Freundes-Aktivitäts-Feed: postet automatisch Level-Ups & Badge-Unlocks
// (siehe lib/gamification.ts) und liest den Feed eigener + befreundeter Nutzer.

import { ActivityFeedEntry, ActivityType } from "@/types";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

interface ActivityRow {
  id: string;
  user_id: string;
  type: ActivityType;
  message: string;
  created_at: string;
}

interface ProfileNameRow {
  user_id: string;
  display_name: string | null;
}

function fallbackName(userId: string): string {
  return `Nutzer ${userId.slice(0, 4)}`;
}

export async function postActivity(type: ActivityType, message: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) return;
  await supabase.from("activity_feed").insert({ user_id: userId, type, message });
}

export async function getFriendsFeed(limit = 20): Promise<ActivityFeedEntry[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return [];

  const { data, error } = await supabase
    .from("activity_feed")
    .select("id, user_id, type, message, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  const rows = (data as ActivityRow[]) ?? [];
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const { data: profileRows } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .in("user_id", userIds.length > 0 ? userIds : [userId]);

  const names = new Map<string, string>();
  (profileRows as ProfileNameRow[] | null)?.forEach((row) => {
    names.set(row.user_id, row.display_name?.trim() || fallbackName(row.user_id));
  });

  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    displayName: r.user_id === userId ? "Du" : names.get(r.user_id) ?? fallbackName(r.user_id),
    type: r.type,
    message: r.message,
    createdAt: r.created_at,
    isSelf: r.user_id === userId,
  }));
}
