"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Check, X, Pencil, AlertCircle, CheckCircle2,
  Flame, Beef, Wheat, Droplet,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import CameraCapture from "@/components/CameraCapture";
import { DetectedItem, FOOD_CATEGORIES, FoodCategory, MealScanItem } from "@/types";
import { addFridgeItem, addMeal } from "@/lib/storage";
import { recordActivity } from "@/lib/gamification";
import { showXpToast } from "@/lib/xp-toast";
import { CATEGORY_EMOJI } from "@/lib/category-style";

type Mode = "mahlzeit" | "kuehlschrank";
type FridgeStep = "capture" | "analyzing" | "review" | "error" | "saved";
type MealStep = "capture" | "analyzing" | "review" | "error" | "saved";

// ── Shared helpers ──────────────────────────────────────────────────────────

function SegmentControl({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="flex p-1 bg-brand-50 rounded-xl mb-5 border border-brand-100">
      {(["mahlzeit", "kuehlschrank"] as Mode[]).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
            mode === m
              ? "bg-white text-brand-700 shadow-sm"
              : "text-gray-400"
          }`}
        >
          {m === "mahlzeit" ? "Mahlzeit scannen" : "Kühlschrank scannen"}
        </button>
      ))}
    </div>
  );
}

// ── Fridge scan ─────────────────────────────────────────────────────────────

interface ReviewItem extends DetectedItem {
  keep: boolean;
}

function FridgeScan() {
  const router = useRouter();
  const [step, setStep] = useState<FridgeStep>("capture");
  const [image, setImage] = useState<string | null>(null);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string | null>(null);

  async function handleCapture(dataUrl: string) {
    setImage(dataUrl);
    setStep("analyzing");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Unbekannter Fehler bei der Bildanalyse.");
      const detected: DetectedItem[] = data.detected_items || [];
      setItems(detected.map((d) => ({ ...d, keep: true })));
      setModelUsed(data.modelUsed || null);
      setStep("review");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Die Analyse ist fehlgeschlagen.");
      setStep("error");
    }
  }

  function updateItem(index: number, updates: Partial<ReviewItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...updates } : it)));
  }

  async function handleConfirmAll() {
    await Promise.all(
      items
        .filter((it) => it.keep)
        .map((it) =>
          addFridgeItem({
            name: it.name,
            category: it.category,
            quantity: it.estimated_quantity,
            confidence: it.confidence,
            source: "scan",
          })
        )
    );
    showXpToast(await recordActivity("scan"));
    setStep("saved");
    setTimeout(() => router.push("/fridge"), 900);
  }

  function reset() {
    setStep("capture");
    setImage(null);
    setItems([]);
    setErrorMsg(null);
  }

  if (step === "capture") return <CameraCapture onCapture={handleCapture} onError={(m) => { setErrorMsg(m); setStep("error"); }} />;

  if (step === "analyzing") return (
    <div className="space-y-3">
      {image && <img src={image} alt="Aufnahme" className="w-full aspect-[3/4] object-cover rounded-xl2" />}
      <div className="card p-6 flex flex-col items-center text-center">
        <Loader2 size={28} className="animate-spin text-brand-600 mb-2" />
        <p className="text-sm font-medium text-brand-900">KI analysiert dein Foto…</p>
        <p className="text-xs text-gray-400 mt-1">Das kann ein paar Sekunden dauern</p>
      </div>
    </div>
  );

  if (step === "error") return (
    <div className="card p-5 flex flex-col items-center text-center gap-3">
      <AlertCircle size={28} className="text-rose-500" />
      <p className="text-sm text-gray-600">{errorMsg}</p>
      <button onClick={reset} className="btn-primary w-full">Erneut versuchen</button>
    </div>
  );

  if (step === "saved") return (
    <div className="card p-8 flex flex-col items-center text-center gap-2">
      <CheckCircle2 size={36} className="text-brand-600" />
      <p className="text-sm font-medium text-brand-900">Gespeichert!</p>
      <p className="text-xs text-gray-400">Du wirst zu deinem Kühlschrank weitergeleitet…</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {modelUsed && <p className="text-[11px] text-gray-400 text-center">Analysiert mit: {modelUsed}</p>}
      {items.length === 0 ? (
        <div className="card p-5 text-center text-sm text-gray-500">
          Es wurden keine Lebensmittel erkannt. Versuche ein anderes Foto.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <FridgeReviewRow
              key={index}
              item={item}
              onChange={(u) => updateItem(index, u)}
              onRemove={() => setItems((prev) => prev.filter((_, i) => i !== index))}
            />
          ))}
        </div>
      )}
      <div className="flex gap-3 pt-2">
        <button onClick={reset} className="btn-secondary flex-1">Neuer Scan</button>
        <button
          onClick={handleConfirmAll}
          disabled={items.filter((i) => i.keep).length === 0}
          className="btn-primary flex-1"
        >
          {items.filter((i) => i.keep).length} übernehmen
        </button>
      </div>
    </div>
  );
}

function FridgeReviewRow({
  item, onChange, onRemove,
}: {
  item: ReviewItem & { keep: boolean };
  onChange: (u: Partial<ReviewItem>) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <div className={`card p-3 ${!item.keep ? "opacity-40" : ""}`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{CATEGORY_EMOJI[item.category]}</span>
        <div className="flex-1 min-w-0">
          {editing ? (
            <input autoFocus className="input-field mb-1" value={item.name} onChange={(e) => onChange({ name: e.target.value })} />
          ) : (
            <p className="text-sm font-semibold text-brand-900 truncate">{item.name}</p>
          )}
          <div className="flex items-center gap-2 mt-0.5">
            {editing ? (
              <select className="input-field text-xs py-1" value={item.category} onChange={(e) => onChange({ category: e.target.value as FoodCategory })}>
                {FOOD_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            ) : (
              <span className="text-xs text-gray-400">{item.category}</span>
            )}
            {item.estimated_quantity && <span className="text-xs text-gray-400">· {item.estimated_quantity}</span>}
            <span className="text-xs text-gray-300 ml-auto">{Math.round(item.confidence * 100)}%</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setEditing((v) => !v)} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100" aria-label="Bearbeiten"><Pencil size={15} /></button>
          <button onClick={() => onChange({ keep: !item.keep })} className={`w-8 h-8 rounded-full flex items-center justify-center ${item.keep ? "text-brand-600 hover:bg-brand-50" : "text-gray-300"}`} aria-label="Übernehmen"><Check size={16} /></button>
          <button onClick={onRemove} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-rose-50 hover:text-rose-500" aria-label="Entfernen"><X size={16} /></button>
        </div>
      </div>
    </div>
  );
}

// ── Meal scan ────────────────────────────────────────────────────────────────

function MealScan() {
  const router = useRouter();
  const [step, setStep] = useState<MealStep>("capture");
  const [image, setImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [items, setItems] = useState<MealScanItem[]>([]);
  const [mealName, setMealName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  async function handleCapture(dataUrl: string) {
    setImage(dataUrl);
    setStep("analyzing");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/meal-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Unbekannter Fehler bei der Mahlzeiten-Analyse.");
      setMealName(data.meal_name || "Mahlzeit");
      setConfidence(data.confidence ?? 0);
      setItems(data.items || []);
      setCalories(String(data.calories_estimate ?? 0));
      setProtein(String(parseFloat(data.macros?.protein) || 0));
      setCarbs(String(parseFloat(data.macros?.carbs) || 0));
      setFat(String(parseFloat(data.macros?.fat) || 0));
      setModelUsed(data.modelUsed || null);
      setStep("review");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Die Analyse ist fehlgeschlagen.");
      setStep("error");
    }
  }

  async function handleSave() {
    await addMeal({
      name: mealName.trim() || "Mahlzeit",
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
      eatenAt: new Date().toISOString(),
      source: "scan",
      confidence,
      items,
      modelUsed: modelUsed || undefined,
    });
    showXpToast(await recordActivity("meal"));
    setStep("saved");
    setTimeout(() => router.push("/meals"), 900);
  }

  function reset() {
    setStep("capture");
    setImage(null);
    setErrorMsg(null);
    setItems([]);
  }

  if (step === "capture") return <CameraCapture onCapture={handleCapture} onError={(m) => { setErrorMsg(m); setStep("error"); }} />;

  if (step === "analyzing") return (
    <div className="space-y-3">
      {image && <img src={image} alt="Aufnahme" className="w-full aspect-[3/4] object-cover rounded-xl2" />}
      <div className="card p-6 flex flex-col items-center text-center">
        <Loader2 size={28} className="animate-spin text-brand-600 mb-2" />
        <p className="text-sm font-medium text-brand-900">KI berechnet Kalorien & Makros…</p>
        <p className="text-xs text-gray-400 mt-1">Das kann ein paar Sekunden dauern</p>
      </div>
    </div>
  );

  if (step === "error") return (
    <div className="card p-5 flex flex-col items-center text-center gap-3">
      <AlertCircle size={28} className="text-rose-500" />
      <p className="text-sm text-gray-600">{errorMsg}</p>
      <button onClick={reset} className="btn-primary w-full">Erneut versuchen</button>
    </div>
  );

  if (step === "saved") return (
    <div className="card p-8 flex flex-col items-center text-center gap-2">
      <CheckCircle2 size={36} className="text-brand-600" />
      <p className="text-sm font-medium text-brand-900">Gespeichert!</p>
      <p className="text-xs text-gray-400">Du wirst zu deinen Mahlzeiten weitergeleitet…</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {modelUsed && (
        <p className="text-[11px] text-gray-400 text-center">
          Analysiert mit: {modelUsed} · Sicherheit: {Math.round(confidence * 100)}%
        </p>
      )}
      {image && <img src={image} alt="Mahlzeit" className="w-full aspect-[3/4] object-cover rounded-xl2" />}
      <div className="card p-4 space-y-3">
        <div>
          <label className="text-xs text-gray-500">Name der Mahlzeit</label>
          <input className="input-field mt-1" value={mealName} onChange={(e) => setMealName(e.target.value)} />
        </div>
        {items.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Erkannte Bestandteile</p>
            <div className="flex flex-wrap gap-1.5">
              {items.map((it, i) => (
                <span key={i} className="pill bg-brand-50 text-brand-700">
                  {it.name}{it.estimated_quantity ? ` · ${it.estimated_quantity}` : ""}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <NumberField icon={Flame} color="text-accent-500" label="Kalorien (kcal)" value={calories} onChange={setCalories} />
          <NumberField icon={Beef} color="text-rose-500" label="Protein (g)" value={protein} onChange={setProtein} />
          <NumberField icon={Wheat} color="text-amber-600" label="Kohlenhydrate (g)" value={carbs} onChange={setCarbs} />
          <NumberField icon={Droplet} color="text-sky-500" label="Fett (g)" value={fat} onChange={setFat} />
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={reset} className="btn-secondary flex-1">Neuer Scan</button>
        <button onClick={handleSave} className="btn-primary flex-1">Als Mahlzeit speichern</button>
      </div>
    </div>
  );
}

function NumberField({
  icon: Icon, color, label, value, onChange,
}: {
  icon: typeof Flame;
  color: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 flex items-center gap-1">
        <Icon size={12} className={color} /> {label}
      </label>
      <input type="number" className="input-field mt-1" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ScanPage() {
  const [mode, setMode] = useState<Mode>("mahlzeit");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "kuehlschrank") setMode("kuehlschrank");
  }, []);

  return (
    <div>
      <PageHeader
        title="Scannen"
        subtitle={mode === "mahlzeit" ? "Foto vom Essen → Kalorien & Makros" : "Foto vom Kühlschrank → Lebensmittel"}
      />
      <div className="px-5">
        <SegmentControl mode={mode} onChange={setMode} />
        {mode === "mahlzeit" ? <MealScan key="meal" /> : <FridgeScan key="fridge" />}
      </div>
    </div>
  );
}
