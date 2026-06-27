// Auth-Hilfsfunktionen rund um Supabase Auth (E-Mail/Passwort).

import { Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";

export async function getSession(): Promise<Session | null> {
  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error) return null;
  return data.session;
}

export async function signUp(email: string, password: string) {
  const { data, error } = await getSupabaseClient().auth.signUp({ email, password });
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

export function onAuthStateChange(callback: (session: Session | null) => void) {
  const {
    data: { subscription },
  } = getSupabaseClient().auth.onAuthStateChange((_event, session) => callback(session));
  return () => subscription.unsubscribe();
}
