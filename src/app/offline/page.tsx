import { WifiOff } from "lucide-react";

// Wird vom Service Worker ausgeliefert, wenn eine Seite offline ist und nicht
// im Cache liegt. Keine Client-Logik nötig, rein statisch.
export default function OfflinePage() {
  return (
    <div className="px-5 pt-16 flex flex-col items-center text-center gap-4">
      <span className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center">
        <WifiOff size={28} className="text-brand-600" />
      </span>
      <div>
        <p className="font-semibold text-brand-900 text-lg">Keine Internetverbindung</p>
        <p className="text-sm text-gray-500 mt-1">
          Diese Seite wurde noch nicht offline gespeichert. Bereits besuchte Seiten und deine
          zuletzt geladenen Daten bleiben verfügbar, sobald du wieder online bist.
        </p>
      </div>
    </div>
  );
}
