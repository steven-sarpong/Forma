"use client";

import { useEffect, useState } from "react";
import { Sparkles, Trophy, Zap } from "lucide-react";
import { RecordActivityResult } from "@/lib/gamification";
import { XP_TOAST_EVENT } from "@/lib/xp-toast";

interface ToastItem {
  id: number;
  result: RecordActivityResult;
}

let nextId = 0;

// Rendert XP-/Level-Up-/Badge-Toasts oben auf der Seite. Einmal global in
// layout.tsx eingebunden, lauscht auf das xp-toast Custom-Event.
export default function XpToastHost() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    function handle(e: Event) {
      const detail = (e as CustomEvent<RecordActivityResult>).detail;
      const id = nextId++;
      setToasts((prev) => [...prev, { id, result: detail }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    }
    window.addEventListener(XP_TOAST_EVENT, handle);
    return () => window.removeEventListener(XP_TOAST_EVENT, handle);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-3 left-0 right-0 z-50 flex flex-col items-center gap-2 px-5 pointer-events-none">
      <div className="w-full max-w-md space-y-2">
        {toasts.map(({ id, result }) => (
          <div key={id} className="space-y-2">
            <div className="bg-brand-900 text-white rounded-xl px-4 py-2.5 shadow-cardHover flex items-center gap-2">
              <Zap size={16} className="text-accent-400 shrink-0" />
              <p className="text-sm font-medium">+{result.xpGained} XP</p>
            </div>
            {result.leveledUp && (
              <div className="bg-gradient-to-r from-brand-600 to-brand-700 text-white rounded-xl px-4 py-2.5 shadow-cardHover flex items-center gap-2">
                <Trophy size={16} className="text-accent-300 shrink-0" />
                <p className="text-sm font-semibold">Level {result.newLevel} erreicht!</p>
              </div>
            )}
            {result.newBadges.map((badge) => (
              <div
                key={badge.id}
                className="bg-white border border-brand-200 rounded-xl px-4 py-2.5 shadow-cardHover flex items-center gap-2"
              >
                <Sparkles size={16} className="text-brand-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-brand-900">Neues Achievement: {badge.name}</p>
                  <p className="text-xs text-gray-500">{badge.description}</p>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
