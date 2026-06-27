"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, X, Pencil, AlertCircle, CheckCircle2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import CameraCapture from "@/components/CameraCapture";
import { DetectedItem, FOOD_CATEGORIES, FoodCategory } from "@/types";
import { addFridgeItem } from "@/lib/storage";
import { recordActivity } from "@/lib/gamification";
import { showXpToast } from "@/lib/xp-toast";
import { CATEGORY_EMOJI } from "@/lib/category-style";

type Step = "capture" | "analyzing" | "review" | "error" | "saved";

interface ReviewItem extends DetectedItem {
  keep: boolean;
}

export default function ScanPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("capture");
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

      if (!res.ok) {
        throw new Error(data?.error || "Unbekannter Fehler bei der Bildanalyse.");
      }

      const detected: DetectedItem[] = data.detected_items || [];
      setItems(detected.map((d) => ({ ...d, keep: true })));
      setModelUsed(data.modelUsed || null);
      setStep("review");
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Die Analyse ist fehlgeschlagen. Bitte versuche es erneut."
      );
      setStep("error");
    }
  }

  function updateItem(index: number, updates: Partial<ReviewItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...updates } : it)));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
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

  function handleCaptureError(message: string) {
    setErrorMsg(message);
    setStep("error");
  }

  function reset() {
    setStep("capture");
    setImage(null);
    setItems([]);
    setErrorMsg(null);
  }

  return (
    <div>
      <PageHeader
        title="Kühlschrank scannen"
        subtitle="Fotografiere deinen Kühlschrank oder einzelne Lebensmittel"
      />

      <div className="px-5">
        {step === "capture" && (
          <CameraCapture onCapture={handleCapture} onError={handleCaptureError} />
        )}

        {step === "analyzing" && (
          <div className="space-y-3">
            {image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="Aufnahme" className="w-full aspect-[3/4] object-cover rounded-xl2" />
            )}
            <div className="card p-6 flex flex-col items-center text-center">
              <Loader2 size={28} className="animate-spin text-brand-600 mb-2" />
              <p className="text-sm font-medium text-brand-900">KI analysiert dein Foto…</p>
              <p className="text-xs text-gray-400 mt-1">Das kann ein paar Sekunden dauern</p>
            </div>
          </div>
        )}

        {step === "error" && (
          <div className="card p-5 flex flex-col items-center text-center gap-3">
            <AlertCircle size={28} className="text-rose-500" />
            <p className="text-sm text-gray-600">{errorMsg}</p>
            <button onClick={reset} className="btn-primary w-full">
              Erneut versuchen
            </button>
          </div>
        )}

        {step === "saved" && (
          <div className="card p-8 flex flex-col items-center text-center gap-2">
            <CheckCircle2 size={36} className="text-brand-600" />
            <p className="text-sm font-medium text-brand-900">Gespeichert!</p>
            <p className="text-xs text-gray-400">Du wirst zu deinem Kühlschrank weitergeleitet…</p>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            {modelUsed && (
              <p className="text-[11px] text-gray-400 text-center">Analysiert mit: {modelUsed}</p>
            )}

            {items.length === 0 ? (
              <div className="card p-5 text-center text-sm text-gray-500">
                Es wurden keine Lebensmittel erkannt. Versuche ein anderes Foto.
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, index) => (
                  <ReviewRow
                    key={index}
                    item={item}
                    onChange={(updates) => updateItem(index, updates)}
                    onRemove={() => removeItem(index)}
                  />
                ))}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={reset} className="btn-secondary flex-1">
                Neuer Scan
              </button>
              <button
                onClick={handleConfirmAll}
                disabled={items.filter((i) => i.keep).length === 0}
                className="btn-primary flex-1"
              >
                {items.filter((i) => i.keep).length} übernehmen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewRow({
  item,
  onChange,
  onRemove,
}: {
  item: ReviewItem;
  onChange: (updates: Partial<ReviewItem>) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className={`card p-3 ${!item.keep ? "opacity-40" : ""}`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{CATEGORY_EMOJI[item.category]}</span>
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              autoFocus
              className="input-field mb-1"
              value={item.name}
              onChange={(e) => onChange({ name: e.target.value })}
            />
          ) : (
            <p className="text-sm font-semibold text-brand-900 truncate">{item.name}</p>
          )}
          <div className="flex items-center gap-2 mt-0.5">
            {editing ? (
              <select
                className="input-field text-xs py-1"
                value={item.category}
                onChange={(e) => onChange({ category: e.target.value as FoodCategory })}
              >
                {FOOD_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-gray-400">{item.category}</span>
            )}
            {item.estimated_quantity && (
              <span className="text-xs text-gray-400">· {item.estimated_quantity}</span>
            )}
            <span className="text-xs text-gray-300 ml-auto">
              {Math.round(item.confidence * 100)}%
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setEditing((v) => !v)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100"
            aria-label="Bearbeiten"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => onChange({ keep: !item.keep })}
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              item.keep ? "text-brand-600 hover:bg-brand-50" : "text-gray-300"
            }`}
            aria-label="Übernehmen umschalten"
          >
            <Check size={16} />
          </button>
          <button
            onClick={onRemove}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-rose-50 hover:text-rose-500"
            aria-label="Entfernen"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
