"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, AlertCircle, Sparkles } from "lucide-react";
import { signIn, signUp } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);

  if (!isSupabaseConfigured()) {
    return (
      <div className="px-5 pt-10 max-w-md mx-auto">
        <div className="card p-5 flex flex-col items-center text-center gap-3">
          <AlertCircle size={28} className="text-amber-500" />
          <p className="font-semibold text-brand-900">Cloud-Sync noch nicht eingerichtet</p>
          <p className="text-sm text-gray-500">
            Erstelle ein kostenloses Projekt auf{" "}
            <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-brand-600 underline">
              supabase.com
            </a>
            , führe <code className="bg-gray-100 px-1 rounded">supabase/schema.sql</code> im SQL-Editor
            aus und trage <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> sowie{" "}
            <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in{" "}
            <code className="bg-gray-100 px-1 rounded">.env.local</code> ein. Danach den Server neu
            starten.
          </p>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        await signUp(email, password);
        setSignupSuccess(true);
      } else {
        await signIn(email, password);
        router.replace("/");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Anmeldung fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-5 pt-12 max-w-md mx-auto">
      <div className="flex flex-col items-center mb-8">
        <span className="w-14 h-14 rounded-full bg-brand-600 flex items-center justify-center mb-3">
          <Sparkles size={26} className="text-white" />
        </span>
        <h1 className="text-2xl font-bold text-brand-900">FridgeAI</h1>
        <p className="text-sm text-gray-500 mt-1">Dein KI-gestützter Fitness- &amp; Ernährungscoach</p>
      </div>

      {signupSuccess ? (
        <div className="card p-5 text-center space-y-3">
          <p className="font-semibold text-brand-900">Fast geschafft!</p>
          <p className="text-sm text-gray-500">
            Wir haben dir eine Bestätigungs-E-Mail an <span className="font-medium">{email}</span>{" "}
            geschickt. Bestätige sie und melde dich danach an.
          </p>
          <button
            onClick={() => {
              setSignupSuccess(false);
              setMode("signin");
            }}
            className="btn-secondary w-full"
          >
            Zur Anmeldung
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card p-5 space-y-4">
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex-1 rounded-xl py-2 text-sm font-medium border transition-all ${
                mode === "signin"
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-brand-700 border-brand-200"
              }`}
            >
              Anmelden
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-xl py-2 text-sm font-medium border transition-all ${
                mode === "signup"
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-brand-700 border-brand-200"
              }`}
            >
              Registrieren
            </button>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-500">E-Mail</label>
            <div className="relative mt-1">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                required
                className="input-field pl-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="du@beispiel.de"
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-500">Passwort</label>
            <div className="relative mt-1">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                required
                minLength={6}
                className="input-field pl-9"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mindestens 6 Zeichen"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Bitte warten..." : mode === "signup" ? "Konto erstellen" : "Anmelden"}
          </button>
        </form>
      )}
    </div>
  );
}
