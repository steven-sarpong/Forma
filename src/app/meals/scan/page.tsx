"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, Flame, Beef, Wheat, Droplet } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import CameraCapture from "@/components/CameraCapture";
import { MealScanItem } from "@/types";
import { addMeal } from "@/lib/storage";

type Step = "capture" | "analyzing" | "review" | "error";

export default function MealScanPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("capture");
  const [image, setImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [items, setItems] = useState<MealScanItem[]>([]);

  // Editierbare Felder, die der Nutzer vor dem Speichern anpassen kann
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

      if (!res.ok) {
        throw new Error(data?.error || "Unbekannter Fehler bei der Mahlzeiten-Analyse.");
      }

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
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Die Analyse ist fehlgeschlagen. Bitte versuche es erneut."
      );
      setStep("error");
    }
  }

  function handleSave() {
    addMeal({
      name: mealName.trim() || "Mahlzeit",
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
      eatenAt: new Date().toISOString(),
      source: "scan",
    });
    router.push("/meals");
  }

  function reset() {
    setStep("capture");
    setImage(null);
    setErrorMsg(null);
    setItems([]);
  }

  return (
    <div>
      <PageHeader
        title="Mahlzeit scannen"
        subtitle="Foto vom Essen machen – Kalorien & Makros werden automatisch geschätzt"
      />

      <div className="px-5">
        {step === "capture" && <CameraCapture onCapture={handleCapture} />}

        {step === "analyzing" && (
          <div className="space-y-3">
            {image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="Aufnahme" className="w-full aspect-[3/4] object-cover rounded-xl2" />
            )}
            <div className="card p-6 flex flex-col items-center text-center">
              <Loader2 size={28} className="animate-spin text-brand-600 mb-2" />
              <p className="text-sm font-medium text-brand-900">KI berechnet Kalorien & Makros…</p>
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

        {step === "review" && (
          <div className="space-y-4">
            {modelUsed && (
              <p className="text-[11px] text-gray-400 text-center">
                Analysiert mit: {modelUsed} · Sicherheit: {Math.round(confidence * 100)}%
              </p>
            )}

            {image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="Mahlzeit" className="w-full aspect-[3/4] object-cover rounded-xl2" />
            )}

            <div className="card p-4 space-y-3">
              <div>
                <label className="text-xs text-gray-500">Name der Mahlzeit</label>
                <input
                  className="input-field mt-1"
                  value={mealName}
                  onChange={(e) => setMealName(e.target.value)}
                />
              </div>

              {items.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Erkannte Bestandteile</p>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((it, i) => (
                      <span key={i} className="pill bg-brand-50 text-brand-700">
                        {it.name}
                        {it.estimated_quantity ? ` · ${it.estimated_quantity}` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  icon={Flame}
                  color="text-accent-500"
                  label="Kalorien (kcal)"
                  value={calories}
                  onChange={setCalories}
                />
                <NumberField
                  icon={Beef}
                  color="text-rose-500"
                  label="Protein (g)"
                  value={protein}
                  onChange={setProtein}
                />
                <NumberField
                  icon={Wheat}
                  color="text-amber-600"
                  label="Kohlenhydrate (g)"
                  value={carbs}
                  onChange={setCarbs}
                />
                <NumberField
                  icon={Droplet}
                  color="text-sky-500"
                  label="Fett (g)"
                  value={fat}
                  onChange={setFat}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={reset} className="btn-secondary flex-1">
                Neuer Scan
              </button>
              <button onClick={handleSave} className="btn-primary flex-1">
                Als Mahlzeit speichern
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NumberField({
  icon: Icon,
  color,
  label,
  value,
  onChange,
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
      <input
        type="number"
        className="input-field mt-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
