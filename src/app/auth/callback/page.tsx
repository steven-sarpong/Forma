"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

type Status = "checking" | "success" | "error";

// Diese Seite ist das Redirect-Ziel für Supabase Auth-E-Mails (Registrierung,
// Passwort-Reset). Der Supabase-Client liest Session-Token automatisch aus
// dem URL-Hash bzw. tauscht einen PKCE-"code" gegen eine Session – diese Seite
// wartet nur das Ergebnis ab und zeigt dem Nutzer einen klaren Status.
export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="px-5 pt-16 max-w-md mx-auto">
          <div className="card p-6 flex flex-col items-center text-center gap-3">
            <Loader2 size={32} className="text-brand-600 animate-spin" />
            <p className="font-semibold text-brand-900">Bestätigung wird geprüft...</p>
          </div>
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>("checking");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setStatus("error");
      setMessage("Cloud-Sync ist nicht eingerichtet.");
      return;
    }

    const errorDescription = searchParams.get("error_description") || searchParams.get("error");
    if (errorDescription) {
      setStatus("error");
      setMessage(decodeURIComponent(errorDescription.replace(/\+/g, " ")));
      return;
    }

    let active = true;
    (async () => {
      const supabase = getSupabaseClient();
      const code = searchParams.get("code");

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        // Fallback/Standardfall: Supabase hat die Session bereits aus dem
        // URL-Hash gelesen (detectSessionInUrl, Standardverhalten des Clients).
        const { data, error } = await supabase.auth.getSession();
        if (!active) return;
        if (error) throw error;

        if (data.session) {
          setStatus("success");
        } else {
          // Kein Session-Token im Link gefunden, aber auch kein Fehler -
          // typischerweise ein bereits verwendeter oder abgelaufener Link.
          setStatus("error");
          setMessage("Der Link ist ungültig oder abgelaufen. Bitte fordere eine neue E-Mail an.");
        }
      } catch (err) {
        if (!active) return;
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Bestätigung fehlgeschlagen.");
      }
    })();

    return () => {
      active = false;
    };
  }, [searchParams]);

  useEffect(() => {
    if (status !== "success") return;
    const timeout = setTimeout(() => router.replace("/"), 2500);
    return () => clearTimeout(timeout);
  }, [status, router]);

  return (
    <div className="px-5 pt-16 max-w-md mx-auto">
      <div className="card p-6 flex flex-col items-center text-center gap-3">
        {status === "checking" && (
          <>
            <Loader2 size={32} className="text-brand-600 animate-spin" />
            <p className="font-semibold text-brand-900">Bestätigung wird geprüft...</p>
            <p className="text-sm text-gray-500">Einen Moment bitte.</p>
          </>
        )}

        {status === "success" && (
          <>
            <span className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center">
              <CheckCircle2 size={28} className="text-brand-600" />
            </span>
            <p className="font-semibold text-brand-900">E-Mail bestätigt!</p>
            <p className="text-sm text-gray-500">
              Dein Konto ist aktiv. Du wirst gleich automatisch weitergeleitet.
            </p>
            <button onClick={() => router.replace("/")} className="btn-primary w-full mt-1">
              Jetzt zu Forma
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <span className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center">
              <AlertCircle size={28} className="text-rose-500" />
            </span>
            <p className="font-semibold text-brand-900">Das hat nicht geklappt</p>
            <p className="text-sm text-gray-500">{message ?? "Unbekannter Fehler bei der Bestätigung."}</p>
            <button onClick={() => router.replace("/login")} className="btn-secondary w-full mt-1">
              Zur Anmeldung
            </button>
          </>
        )}
      </div>
    </div>
  );
}
