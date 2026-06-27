// Lokaler Fallback für das Nutzerprofil (localStorage), solange Supabase noch
// nicht konfiguriert ist. Sobald NEXT_PUBLIC_SUPABASE_URL/ANON_KEY gesetzt
// sind, übernimmt lib/profile.ts automatisch die Cloud-Variante.

import { UserProfile } from "@/types";

const PROFILE_KEY = "fridgeai_profile";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getLocalProfile(): UserProfile | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function saveLocalProfile(
  profile: Omit<UserProfile, "createdAt" | "updatedAt">
): UserProfile {
  const existing = getLocalProfile();
  const now = new Date().toISOString();
  const fullProfile: UserProfile = {
    ...profile,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  if (isBrowser()) {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(fullProfile));
  }
  return fullProfile;
}

export function clearLocalProfile() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(PROFILE_KEY);
}
