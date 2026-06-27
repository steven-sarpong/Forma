"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound, ShieldCheck, Trash2, Info, UserCog, ChevronRight, LogOut, Cloud, Users, Trophy } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { resetAllData } from "@/lib/storage";
import { clearProfile } from "@/lib/profile";
import { signOut } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export default function SettingsPage() {
  const [confirmReset, setConfirmReset] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleReset() {
    await resetAllData();
    await clearProfile();
    setConfirmReset(false);
    window.location.href = "/";
  }

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    window.location.href = "/login";
  }

  return (
    <div>
      <PageHeader title="Einstellungen" subtitle="API-Key, Datenschutz & Daten" />

      <div className="px-5 space-y-4">
        <Link href="/onboarding" className="card p-4 flex items-center gap-3">
          <UserCog size={18} className="text-brand-600 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-brand-900 text-sm">Profil & Ziele bearbeiten</p>
            <p className="text-xs text-gray-500">Gewicht, Aktivität, Ziel und Kalorienberechnung anpassen</p>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </Link>

        <Link href="/social" className="card p-4 flex items-center gap-3">
          <Users size={18} className="text-brand-600 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-brand-900 text-sm">Freunde</p>
            <p className="text-xs text-gray-500">Freunde hinzufügen und Aktivitäts-Feed ansehen</p>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </Link>

        <Link href="/challenges" className="card p-4 flex items-center gap-3">
          <Trophy size={18} className="text-brand-600 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-brand-900 text-sm">Challenges & Leaderboard</p>
            <p className="text-xs text-gray-500">XP vergleichen und gemeinsame Ziele starten</p>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </Link>

        <section className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Cloud size={18} className="text-brand-600" />
            <p className="font-semibold text-brand-900 text-sm">Account & Cloud-Sync</p>
          </div>
          {isSupabaseConfigured() ? (
            <>
              <p className="text-sm text-gray-500 mb-3">
                Dein Profil und deine Ziele sind mit deinem Account verknüpft und über Geräte
                hinweg synchron. Kühlschrank, Mahlzeiten, Gewicht und Training bleiben aktuell
                lokal auf diesem Gerät.
              </p>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="btn-secondary w-full flex items-center justify-center gap-2 text-rose-600 border-rose-200 hover:bg-rose-50"
              >
                <LogOut size={16} /> {signingOut ? "Wird abgemeldet..." : "Abmelden"}
              </button>
            </>
          ) : (
            <p className="text-sm text-gray-500">
              Cloud-Sync ist noch nicht eingerichtet. Siehe{" "}
              <code className="bg-gray-100 px-1 rounded">supabase/schema.sql</code> für die
              Einrichtung.
            </p>
          )}
        </section>

        <section className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <KeyRound size={18} className="text-brand-600" />
            <p className="font-semibold text-brand-900 text-sm">OpenRouter API-Key</p>
          </div>
          <p className="text-sm text-gray-500">
            Diese App nutzt <span className="font-medium">OpenRouter</span>, um KI-Modelle für
            Bildanalyse und Rezeptvorschläge anzusprechen. Der API-Key wird ausschließlich
            serverseitig verwendet und niemals an den Browser übertragen.
          </p>
          <ol className="text-sm text-gray-500 list-decimal list-inside mt-2 space-y-1">
            <li>
              Account auf{" "}
              <a
                href="https://openrouter.ai"
                target="_blank"
                rel="noreferrer"
                className="text-brand-600 underline"
              >
                openrouter.ai
              </a>{" "}
              erstellen
            </li>
            <li>API-Key unter „Keys“ generieren</li>
            <li>
              Key in der Datei <code className="bg-gray-100 px-1 rounded">.env.local</code> als{" "}
              <code className="bg-gray-100 px-1 rounded">OPENROUTER_API_KEY</code> eintragen
            </li>
            <li>Server neu starten</li>
          </ol>
        </section>

        <section className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Info size={18} className="text-brand-600" />
            <p className="font-semibold text-brand-900 text-sm">Verwendete Modelle</p>
          </div>
          <p className="text-sm text-gray-500">
            Hauptmodell für Bildanalyse und Rezepte sowie ein automatisches Fallback-Modell
            werden über Umgebungsvariablen konfiguriert (
            <code className="bg-gray-100 px-1 rounded">OPENROUTER_PRIMARY_MODEL</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">OPENROUTER_FALLBACK_MODEL</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">OPENROUTER_TEXT_MODEL</code>). Ist das
            Hauptmodell nicht erreichbar, wechselt die App automatisch zum Fallback.
          </p>
        </section>

        <section className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck size={18} className="text-brand-600" />
            <p className="font-semibold text-brand-900 text-sm">Datenschutz</p>
          </div>
          <p className="text-sm text-gray-500">
            {isSupabaseConfigured()
              ? "Dein Profil, Training, Gewicht und deine Social-Daten werden verschlüsselt und durch Row-Level-Security geschützt in deinem Supabase-Account gespeichert. Kühlschrank und Mahlzeiten bleiben lokal auf diesem Gerät."
              : "Alle Daten werden ausschließlich lokal in deinem Browser gespeichert (localStorage) – es gibt keine Server-Datenbank."}{" "}
            Fotos werden nur zur Analyse an OpenRouter gesendet und nicht dauerhaft gespeichert.
          </p>
        </section>

        <section className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Trash2 size={18} className="text-rose-500" />
            <p className="font-semibold text-brand-900 text-sm">Alle Daten löschen</p>
          </div>
          <p className="text-sm text-gray-500 mb-3">
            Entfernt alle gespeicherten Lebensmittel und Mahlzeiten unwiderruflich von diesem
            Gerät.
          </p>
          {confirmReset ? (
            <div className="flex gap-2">
              <button onClick={handleReset} className="btn-primary flex-1 bg-rose-600 hover:bg-rose-700">
                Wirklich löschen
              </button>
              <button onClick={() => setConfirmReset(false)} className="btn-secondary flex-1">
                Abbrechen
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmReset(true)}
              className="btn-secondary w-full text-rose-600 border-rose-200 hover:bg-rose-50"
            >
              Alle Daten zurücksetzen
            </button>
          )}
        </section>

        <p className="text-center text-xs text-gray-300 pt-2">Forma · Fitness- & Ernährungscoach</p>
      </div>
    </div>
  );
}
