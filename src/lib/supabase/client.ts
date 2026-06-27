// Browser-Client für Supabase. Nutzt den öffentlichen Anon-Key – sicher, weil
// sämtlicher Datenzugriff über Row Level Security (RLS) auf den eingeloggten
// Nutzer (auth.uid()) beschränkt ist (siehe supabase/schema.sql).

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function createBrowserClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase ist nicht konfiguriert. Bitte NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local setzen."
    );
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

// Lazy erzeugt, damit ein fehlender Key erst beim tatsächlichen Zugriff
// (nicht schon beim Modul-Import während des Builds) einen Fehler wirft.
let cachedClient: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseClient() {
  if (!cachedClient) {
    cachedClient = createBrowserClient();
  }
  return cachedClient;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}
