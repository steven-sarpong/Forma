"use client";

import { useEffect } from "react";

// Registriert den Service Worker für Offline-Unterstützung. Network-first-
// Strategie im SW macht das auch in der Entwicklung unproblematisch (Cache
// wird nur als Fallback genutzt, nie bevorzugt vor frischen Daten).
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("[sw] Registrierung fehlgeschlagen:", err);
    });
  }, []);

  return null;
}
