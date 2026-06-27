"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Session } from "@supabase/supabase-js";
import { getSession, onAuthStateChange } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { migrateLocalDataToCloudIfNeeded } from "@/lib/migrate-local-data";

const PUBLIC_PATHS = ["/login"];
// Diese Seite verarbeitet selbst die Supabase-Session aus dem Bestätigungs-
// Link (vor oder ohne aktive Session) und übernimmt ihr eigenes Redirect –
// AuthGuard darf hier nicht eingreifen, sonst landet der Nutzer vor der
// Erfolgsmeldung auf /login.
const GUARD_EXEMPT_PATHS = ["/auth/callback"];

// Schützt die App: leitet nicht eingeloggte Nutzer zu /login um.
// Solange Supabase noch nicht konfiguriert ist (kein .env.local-Key),
// wird die Prüfung übersprungen, damit die App lokal weiter nutzbar bleibt.
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured() || GUARD_EXEMPT_PATHS.includes(pathname)) {
      setChecked(true);
      return;
    }

    let active = true;

    getSession().then((session) => {
      if (!active) return;
      handleSession(session);
      setChecked(true);
    });

    const unsubscribe = onAuthStateChange((session) => {
      if (!active) return;
      handleSession(session);
    });

    function handleSession(session: Session | null) {
      const isPublic = PUBLIC_PATHS.includes(pathname);
      if (!session && !isPublic) {
        router.replace("/login");
      } else if (session) {
        void migrateLocalDataToCloudIfNeeded();
        if (isPublic) router.replace("/");
      }
    }

    return () => {
      active = false;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!checked) {
    return <div className="px-5 pt-10 text-center text-sm text-gray-400">Lade...</div>;
  }

  return <>{children}</>;
}
