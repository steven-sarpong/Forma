"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, X, RefreshCw, Send, Loader2 } from "lucide-react";
import { CoachMessage } from "@/lib/coach";

interface ChatMsg {
  role: "coach" | "user";
  text: string;
}

interface CoachContext {
  goal?: string;
  calorieGoal?: number;
  caloriesSoFar?: number;
  proteinGoalG?: number;
  proteinSoFar?: number;
  currentWeightKg?: number;
  targetWeightKg?: number;
}

interface Props {
  coachMessage: CoachMessage | null;
  coachLoading: boolean;
  onRefresh: () => void;
  context?: CoachContext;
}

const FAB_SIZE = 52;
const NAV_HEIGHT = 72; // bottom nav clearance
const TOP_OFFSET = 100; // initial top offset (below header)

export default function CoachFab({ coachMessage, coachLoading, onRefresh, context }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number }>({ top: TOP_OFFSET, right: 16 });
  const [dragging, setDragging] = useState(false);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startTop: number; startRight: number; moved: boolean } | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Seed chat with daily message when it arrives
  useEffect(() => {
    if (coachMessage && chat.length === 0) {
      setChat([{ role: "coach", text: `${coachMessage.message}\n\n💡 ${coachMessage.tip}` }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachMessage]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  // ── Drag (touch) ──────────────────────────────────────────────────────────

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    dragRef.current = {
      startX: t.clientX,
      startY: t.clientY,
      startTop: pos.top,
      startRight: pos.right,
      moved: false,
    };
    setDragging(false);
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!dragRef.current) return;
    const t = e.touches[0];
    const dx = t.clientX - dragRef.current.startX;
    const dy = t.clientY - dragRef.current.startY;

    if (!dragging && Math.hypot(dx, dy) > 6) {
      setDragging(true);
      dragRef.current.moved = true;
    }

    if (dragRef.current.moved) {
      e.preventDefault();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const newRight = Math.max(8, Math.min(vw - FAB_SIZE - 8, dragRef.current.startRight - dx));
      const newTop = Math.max(8, Math.min(vh - FAB_SIZE - NAV_HEIGHT, dragRef.current.startTop + dy));
      setPos({ top: newTop, right: newRight });
    }
  }

  function onTouchEnd() {
    const moved = dragRef.current?.moved ?? false;
    dragRef.current = null;
    setDragging(false);
    if (!moved) {
      setOpen((v) => !v);
    }
  }

  // ── Drag (mouse, desktop) ─────────────────────────────────────────────────

  function onMouseDown(e: React.MouseEvent) {
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startTop: pos.top,
      startRight: pos.right,
      moved: false,
    };

    function onMouseMove(ev: MouseEvent) {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      if (!dragRef.current.moved && Math.hypot(dx, dy) > 4) dragRef.current.moved = true;
      if (dragRef.current.moved) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const newRight = Math.max(8, Math.min(vw - FAB_SIZE - 8, dragRef.current.startRight - dx));
        const newTop = Math.max(8, Math.min(vh - FAB_SIZE - NAV_HEIGHT, dragRef.current.startTop + dy));
        setPos({ top: newTop, right: newRight });
      }
    }

    function onMouseUp() {
      const moved = dragRef.current?.moved ?? false;
      dragRef.current = null;
      setDragging(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      if (!moved) setOpen((v) => !v);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  // ── Chat send ─────────────────────────────────────────────────────────────

  async function handleSend() {
    const q = input.trim();
    if (!q || sending) return;
    setInput("");
    setChat((prev) => [...prev, { role: "user", text: q }]);
    setSending(true);

    try {
      const res = await fetch("/api/coach-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, context }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fehler");
      setChat((prev) => [...prev, { role: "coach", text: data.reply }]);
    } catch {
      setChat((prev) => [...prev, { role: "coach", text: "Ich konnte deine Frage leider nicht beantworten. Bitte versuch es erneut." }]);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // ── Quick questions ───────────────────────────────────────────────────────

  const QUICK_QUESTIONS = [
    "Was soll ich heute essen?",
    "Wie viel Protein fehlt mir noch?",
    "Was kann ich aus meinem Kühlschrank kochen?",
    "Warum stagniert mein Gewicht?",
  ];

  function sendQuick(q: string) {
    setInput(q);
    setTimeout(() => handleSend(), 0);
  }

  // Force input state then send
  function sendQuickSafe(q: string) {
    const msg = q;
    setChat((prev) => [...prev, { role: "user", text: msg }]);
    setSending(true);
    fetch("/api/coach-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: msg, context }),
    })
      .then((r) => r.json())
      .then((data) => {
        setChat((prev) => [...prev, { role: "coach", text: data.reply || "Keine Antwort erhalten." }]);
      })
      .catch(() => {
        setChat((prev) => [...prev, { role: "coach", text: "Fehler beim Laden der Antwort." }]);
      })
      .finally(() => setSending(false));
  }

  return (
    <>
      {/* FAB */}
      <div
        style={{ position: "fixed", top: pos.top, right: pos.right, zIndex: 50, touchAction: "none" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        className="select-none"
        aria-label="AI Coach"
      >
        <div
          className={`w-[${FAB_SIZE}px] h-[${FAB_SIZE}px] w-[52px] h-[52px] rounded-full bg-brand-600 shadow-cardHover flex items-center justify-center text-white transition-transform ${dragging ? "scale-110" : "active:scale-95"}`}
        >
          {coachLoading && !open ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Sparkles size={20} />
          )}
        </div>
      </div>

      {/* Bottom Sheet */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setOpen(false)}>
          <div className="fixed inset-0 bg-black/40" />
          <div
            className="relative bg-white rounded-t-2xl w-full max-w-md mx-auto flex flex-col"
            style={{ maxHeight: "80vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-brand-50 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center">
                  <Sparkles size={15} className="text-white" />
                </span>
                <p className="font-semibold text-brand-900">AI Coach</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onRefresh(); }}
                  disabled={coachLoading}
                  className="text-gray-400 hover:text-brand-600 disabled:opacity-40 p-1"
                  aria-label="Neue Tagesnachricht"
                  title="Neue Tagesnachricht laden"
                >
                  <RefreshCw size={16} className={coachLoading ? "animate-spin" : ""} />
                </button>
                <button onClick={() => setOpen(false)} className="text-gray-400 p-1" aria-label="Schließen">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 0 }}>
              {chat.length === 0 && coachLoading && (
                <div className="flex justify-start">
                  <div className="bg-brand-50 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                    <Loader2 size={16} className="animate-spin text-brand-500" />
                  </div>
                </div>
              )}
              {chat.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`px-4 py-3 rounded-2xl max-w-[85%] text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-brand-600 text-white rounded-tr-sm"
                        : "bg-brand-50 text-gray-800 rounded-tl-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-brand-50 rounded-2xl rounded-tl-sm px-4 py-3">
                    <span className="flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Quick questions (only when chat is empty or just the greeting) */}
            {chat.length <= 1 && !sending && (
              <div className="px-4 pb-2 shrink-0">
                <div className="flex flex-wrap gap-2">
                  {QUICK_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendQuickSafe(q)}
                      className="text-xs bg-brand-50 text-brand-700 px-3 py-1.5 rounded-full border border-brand-100 active:scale-95 transition-transform text-left"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-brand-50 shrink-0 pb-[env(safe-area-inset-bottom)]">
              <div className="flex items-center gap-2 bg-brand-50 rounded-xl px-3 py-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Stell deinem Coach eine Frage…"
                  className="flex-1 bg-transparent text-sm text-brand-900 placeholder:text-gray-400 outline-none"
                  disabled={sending}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center disabled:opacity-40 shrink-0 active:scale-95 transition-transform"
                  aria-label="Senden"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
