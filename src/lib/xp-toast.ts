// Leichtgewichtiger Event-Bus, um XP-/Level-Up-/Badge-Toasts von beliebigen
// Seiten aus anzustoßen, ohne einen globalen State-Manager einzuführen.

import { RecordActivityResult } from "@/lib/gamification";

export const XP_TOAST_EVENT = "fridgeai:xp-toast";

export function showXpToast(result: RecordActivityResult) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<RecordActivityResult>(XP_TOAST_EVENT, { detail: result }));
}
