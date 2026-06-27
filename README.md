# Forma – KI-gestützter Fitness- & Ernährungscoach

Mobile-first Progressive Web App (PWA) für Ernährungs- und Fitness-Tracking mit KI-gestütztem
Kamera-Scan, persönlichem AI-Coach, Trainingsplänen, Gewichtsverlauf, Gamification und
Social-Features. Nutzer fotografieren ihren Kühlschrank oder ihr Essen, die KI erkennt
Lebensmittel und schätzt Kalorien/Makros, und das Onboarding berechnet daraus persönliche
Ernährungs- und Trainingsziele.

## Features

- **Onboarding & Ziele**: Profil-Erfassung (Geschlecht, Alter, Gewicht, Aktivitätslevel, Ziel)
  und automatische Berechnung von Grundumsatz, Gesamtumsatz, Kalorienziel, Makros, Wasserbedarf
  und Schrittziel (Mifflin-St-Jeor-Formel).
- **KI-Kühlschrank-Scan**: Foto vom Kühlschrank → automatische Lebensmittel-Erkennung inkl.
  Kategorie, Menge und Haltbarkeitsschätzung.
- **KI-Mahlzeiten-Scan**: Foto vom Essen → automatische Kalorien-/Makro-Schätzung.
- **Mahlzeiten-Tracking**: Manuelle Erfassung mit Nährwert-Autovervollständigung, Scan- und
  Rezept-Übernahme, Tagesübersicht.
- **Rezeptvorschläge**: KI-generierte Rezepte basierend auf vorhandenen Kühlschrank-Zutaten.
- **AI-Coach**: Personalisierte Tages-Nachrichten und Tipps basierend auf Profil, Zielen und
  aktuellem Fortschritt.
- **Training**: KI-generierte Trainingspläne nach Fitnessziel, Trainings-Logging mit
  geschätztem Kalorienverbrauch (MET-basiert).
- **Gewicht & Statistik**: Gewichtsverlauf, BMI, Trend-Analyse und realistische Prognose bis
  zum Zielgewicht.
- **Gamification**: XP, Level, Tages-Streaks und Achievements/Badges für Aktivitäten (Scan,
  Mahlzeit, Gewicht, Training).
- **Social**: Freunde per E-Mail hinzufügen, Leaderboard, gemeinsame XP-Challenges mit
  Fortschrittsanzeige, Freundes-Aktivitäts-Feed (Level-Ups, Badge-Unlocks).
- **PWA & Offline**: Installierbar auf dem Homescreen, Service Worker mit Offline-Fallback.
- **Cloud-Sync**: Mit Supabase-Konfiguration läuft die App vollständig über die Cloud
  (Auth + Postgres mit Row Level Security) inkl. Migration lokal gespeicherter Daten beim
  ersten Login. Ohne Supabase-Konfiguration funktioniert die App weiterhin lokal
  (`localStorage`) – Social-Features setzen allerdings einen Account voraus.

## Tech-Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** für ein modernes, mobile-first UI
- **Supabase** (Auth + Postgres + Row Level Security) für Cloud-Sync und Social-Features
- **OpenRouter** als KI-Provider (multimodale Vision-Modelle, Text-Modelle, je mit Fallback)
- **lucide-react** für Icons
- Eigener PWA-Stack: handgeschriebener Service Worker und ein minimaler PNG-Icon-Generator
  (kein zusätzliches Build-Tool nötig)

## Setup

### 1. Voraussetzungen

- [Node.js](https://nodejs.org) (Version 18 oder höher) und npm

### 2. Abhängigkeiten installieren

```bash
npm install
```

### 3. Umgebungsvariablen konfigurieren

`.env.example` nach `.env.local` kopieren:

```bash
cp .env.example .env.local        # macOS/Linux
```

```powershell
Copy-Item .env.example .env.local # Windows PowerShell
```

**OpenRouter** (Pflicht für Scan/Rezepte/Coach – kostenloser Key unter
https://openrouter.ai/keys):

```env
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_PRIMARY_MODEL=google/gemini-2.5-flash
OPENROUTER_FALLBACK_MODEL=google/gemma-4-26b-a4b-it:free
OPENROUTER_TEXT_MODEL=openai/gpt-4o-mini
OPENROUTER_COACH_MODEL=anthropic/claude-3.5-sonnet
OPENROUTER_COACH_FREE_MODEL=nvidia/nemotron-nano-9b-v2:free
```

`OPENROUTER_PRIMARY_MODEL` und `OPENROUTER_FALLBACK_MODEL` müssen multimodale
(bild-fähige) Modelle sein, da sie für die Foto-Scans genutzt werden. Die aktuelle Liste
verfügbarer Modelle inkl. Modalitäten gibt es unter https://openrouter.ai/api/v1/models
(Feld `architecture.input_modalities` muss `image` enthalten).

**Supabase** (optional, aber Voraussetzung für Cloud-Sync, Mehrgeräte-Nutzung und
Social-Features):

1. Projekt unter https://supabase.com erstellen.
2. [`supabase/schema.sql`](supabase/schema.sql) komplett im Supabase SQL-Editor ausführen
   (Tabellen, Row-Level-Security-Policies, Funktionen für Profile, Kühlschrank, Mahlzeiten,
   Gewicht, Training, Gamification, Freunde, Challenges und Aktivitäts-Feed).
3. Unter „Project Settings → API" `Project URL` und `anon public` Key kopieren:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ey...
```

Ohne diese beiden Variablen läuft die App im lokalen Modus (kein Login, alle Daten im
Browser) – Onboarding, Tracking, Training und Gamification funktionieren dann weiterhin,
nur eben ohne Cloud-Sync und ohne Freunde/Challenges.

### 4. Entwicklungsserver starten

```bash
npm run dev
```

Die App läuft anschließend unter http://localhost:3000.

> **Kamera-Hinweis:** Browser erlauben Kamera-Zugriff (`getUserMedia`) nur über `https://`
> oder `localhost`. Für Tests auf einem echten Smartphone wird daher ein Deployment mit HTTPS
> (siehe unten) oder ein Tunnel-Dienst (z. B. `ngrok`) benötigt.

### 5. Production-Build

```bash
npm run build
npm run start
```

## Deployment (Netlify)

Das Projekt enthält eine [`netlify.toml`](netlify.toml) mit `@netlify/plugin-nextjs`, sodass
sowohl statische Seiten als auch die API-Routes (als Netlify Functions) automatisch
funktionieren.

```bash
npx netlify-cli login
npx netlify-cli init        # oder: sites:create, falls noch kein Projekt verknüpft ist
npx netlify-cli env:set OPENROUTER_API_KEY ...
npx netlify-cli env:set NEXT_PUBLIC_SUPABASE_URL ...
npx netlify-cli env:set NEXT_PUBLIC_SUPABASE_ANON_KEY ...
# ... restliche Variablen aus .env.local analog setzen
npx netlify-cli deploy --prod
```

Genauso funktioniert ein Deployment über jeden anderen Next.js-fähigen Host (Vercel,
selbst-gehostet etc.) – die o.g. Umgebungsvariablen müssen dort identisch gesetzt werden.

## Projektstruktur

```
src/
  app/
    page.tsx                  → Dashboard (Tagesübersicht, AI-Coach, Gamification-Card)
    onboarding/page.tsx       → Profil-Erfassung & Zielberechnung
    login/page.tsx            → Auth (Supabase E-Mail/Passwort)
    scan/page.tsx             → Kühlschrank-Kamera-Scan & KI-Analyse
    fridge/page.tsx           → Digitale Kühlschrank-Liste
    recipes/page.tsx          → Rezeptvorschläge
    meals/page.tsx            → Mahlzeiten-Tracker
    meals/scan/page.tsx       → Mahlzeiten-Kamera-Scan & KI-Analyse
    training/page.tsx         → Trainingsplan & Trainings-Logging
    weight/page.tsx           → Gewichtsverlauf, BMI, Prognose
    achievements/page.tsx     → Level/XP, Streak, Badges
    social/page.tsx           → Freunde, Leaderboard, Challenges, Aktivitäts-Feed
    settings/page.tsx         → Account, API-Key-Hinweis, Datenschutz, Reset
    offline/page.tsx          → PWA-Offline-Fallback
    api/
      scan/route.ts           → Kühlschrank-Bildanalyse über OpenRouter
      meal-scan/route.ts      → Mahlzeiten-Bildanalyse über OpenRouter
      recipes/route.ts        → Rezeptgenerierung über OpenRouter
      coach/route.ts          → AI-Coach-Nachrichten über OpenRouter
      workout/route.ts        → Trainingsplan-Generierung über OpenRouter
    layout.tsx, globals.css
  components/
    CameraCapture.tsx          → Kamera-Zugriff + Foto-Upload-Fallback
    AuthGuard.tsx               → Schützt App-Routen, leitet zu /login um
    ServiceWorkerRegister.tsx   → Registriert den PWA-Service-Worker
    XpToastHost.tsx              → Globale XP-/Level-Up-/Badge-Toasts
    BottomNav.tsx, PageHeader.tsx, DetailSheet.tsx, WeightChart.tsx
  lib/
    ai-service.ts               → Zentrale OpenRouter-Anbindung inkl. Fallback-Logik
    auth.ts                     → Supabase-Auth-Helper
    profile.ts / profile-local.ts → Profil-Persistenz (Cloud + lokaler Fallback) & Zielberechnung
    storage.ts / storage-local.ts → Kühlschrank/Mahlzeiten/Gewicht/Training (Cloud + lokal)
    gamification.ts / gamification-local.ts → XP, Level, Streaks, Badges
    friends.ts                  → Freundschaften, Anfragen, Leaderboard
    challenges.ts                → Gruppen-Challenges (XP-Ziele, Einladungen, Fortschritt)
    activity-feed.ts             → Freundes-Aktivitäts-Feed
    coach.ts                     → AI-Coach-Anbindung
    migrate-local-data.ts        → Einmalige Migration lokaler Daten beim ersten Cloud-Login
    weight-stats.ts, workout-stats.ts → BMI/Trend/Prognose- bzw. Kalorienverbrauch-Berechnung
    supabase/client.ts            → Lazy Supabase-Client + Konfigurationsprüfung
  types/
    index.ts                      → Zentrale TypeScript-Typen
public/
  manifest.json, sw.js, icons/     → PWA-Manifest, Service Worker, generierte App-Icons
scripts/
  generate-icons.js                → Erzeugt PWA-Icons ohne externe Bildbibliothek
supabase/
  schema.sql                       → Vollständiges Datenbankschema inkl. RLS-Policies
```

## Wie die KI-Integration funktioniert

Alle Aufrufe an OpenRouter laufen ausschließlich über Server-seitige API-Routes
([`src/lib/ai-service.ts`](src/lib/ai-service.ts), [`src/lib/coach.ts`](src/lib/coach.ts)) –
der API-Key verlässt nie den Browser.

1. **Kühlschrank-/Mahlzeiten-Scan**: Das Foto wird als Base64-Data-URL an ein multimodales
   Modell (`OPENROUTER_PRIMARY_MODEL`) gesendet. Schlägt die Anfrage fehl (Timeout, Modell
   nicht verfügbar, Rate-Limit), wird automatisch `OPENROUTER_FALLBACK_MODEL` verwendet.
2. **Rezeptvorschläge & Trainingspläne**: Reine Text-Prompts an `OPENROUTER_TEXT_MODEL`, mit
   demselben Fallback-Mechanismus.
3. **AI-Coach**: Dreistufige Fallback-Kette (`OPENROUTER_COACH_MODEL` → Gemini Flash →
   kostenloses `OPENROUTER_COACH_FREE_MODEL`), damit der Coach auch ohne Kontingent auf dem
   Hauptmodell weiter funktioniert.
4. Alle Funktionen fordern strukturierte **JSON-Antworten** an (`response_format: json_object`)
   und parsen das Ergebnis defensiv (inkl. Recovery, falls ein Modell zusätzlichen Text um das
   JSON herum liefert).

## Datenmodell & Datenschutz

- **Ohne Supabase-Konfiguration** läuft die App vollständig lokal: alle Daten liegen
  ausschließlich im `localStorage` des Browsers, es gibt keine Server-Datenbank.
- **Mit Supabase-Konfiguration** werden Profil, Kühlschrank, Mahlzeiten, Gewicht, Training und
  Gamification-Stats pro Account in Postgres gespeichert. Jede Tabelle ist per Row Level
  Security (RLS) so abgesichert, dass Nutzer ausschließlich ihre eigenen Daten lesen/schreiben
  können; Freunde sehen – nur nach gegenseitiger Bestätigung – Anzeigename, Level und XP.
- Fotos werden ausschließlich zur Analyse an OpenRouter übertragen und nicht dauerhaft
  gespeichert.
- Der OpenRouter-API-Key wird ausschließlich serverseitig verwendet.

## Bekannte Grenzen

- **Kein Apple Health / Google Fit / Wearable-Sync**: Als reine Web-App (PWA) hat Forma
  keinen Zugriff auf native Gesundheits-APIs. Das wäre nur mit einem nativen Wrapper (z. B.
  Capacitor) möglich.
- Mengenangaben und Haltbarkeitsdaten aus dem KI-Scan sind Schätzungen und können im
  Scan-Review manuell korrigiert werden.
- Challenges unterstützen aktuell ausschließlich XP-Ziele über einen festen Zeitraum.
