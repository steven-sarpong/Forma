// Auth-Hilfsfunktionen rund um Supabase Auth (E-Mail/Passwort).

import { Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";

export async function getSession(): Promise<Session | null> {
  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error) return null;
  return data.session;
}

// Basis-URL der App für Auth-Redirects. NEXT_PUBLIC_SITE_URL sollte in
// Produktion auf die echte Domain gesetzt sein (siehe .env.example); ohne
// diese Variable fällt die App auf die aktuelle Browser-Origin zurück, damit
// lokale Entwicklung auch ohne Konfiguration funktioniert.
function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:3000";
}

export async function signUp(email: string, password: string) {
  const { data, error } = await getSupabaseClient().auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${getSiteUrl()}/auth/callback` },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await getSupabaseClient().auth.signOut();
  if (error) throw error;
}

export async function resetPasswordForEmail(email: string) {
  const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/auth/callback`,
  });
  if (error) throw error;
}

export function onAuthStateChange(callback: (session: Session | null) => void) {
  const {
    data: { subscription },
  } = getSupabaseClient().auth.onAuthStateChange((_event, session) => callback(session));
  return () => subscription.unsubscribe();
}
