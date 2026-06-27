"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, TrendingDown, TrendingUp, Minus } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import DetailSheet from "@/components/DetailSheet";
import WeightChart from "@/components/WeightChart";
import { getProfile } from "@/lib/profile";
import {
  addWeightEntry,
  deleteWeightEntry,
  getWeightEntries,
} from "@/lib/storage";
import { recordActivity } from "@/lib/gamification";
import { showXpToast } from "@/lib/xp-toast";
import { calculateBmi, bmiCategory, calculateWeightTrend, projectWeeksToGoal } from "@/lib/weight-stats";
import { UserProfile, WeightEntry } from "@/types";

export default function WeightPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [bodyFatInput, setBodyFatInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getProfile().then((p) => {
      if (!active) return;
      if (!p) {
        router.replace("/onboarding");
        return;
      }
      setProfile(p);
      refresh();
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function refresh() {
    setEntries(await getWeightEntries());
  }

  function openForm() {
    setWeightInput(profile ? String(profile.weightKg) : "");
    setBodyFatInput("");
    setNoteInput("");
    setFormError(null);
    setShowForm(true);
  }

  async function handleSave() {
    const weight = Number(weightInput);
    if (!weight || weight < 30 || weight > 300) {
      setFormError("Bitte gib ein gültiges Gewicht in kg ein.");
      return;
    }
    await addWeightEntry({
      weightKg: weight,
      bodyFatPercent: bodyFatInput ? Number(bodyFatInput) : undefined,
      note: noteInput || undefined,
      loggedAt: new Date().toISOString(),
    });
    showXpToast(await recordActivity("weight"));
    setShowForm(false);
    refresh();
  }

  async function handleDelete(id: string) {
    await deleteWeightEntry(id);
    refresh();
  }

  if (!profile) {
    return <div className="px-5 pt-10 text-center text-sm text-gray-400">Lade...</div>;
  }

  const chronological = [...entries].reverse();
  const latest = entries[0] ?? null;
  const currentWeight = latest?.weightKg ?? profile.weightKg;
  const bmi = calculateBmi(currentWeight, profile.heightCm);
  const category = bmiCategory(bmi);
  const trend = calculateWeightTrend(entries);
  const weeksToGoal = projectWeeksToGoal(currentWeight, profile.targetWeightKg, trend.weeklyRateKg);

  const categoryColor: Record<string, string> = {
    Untergewicht: "text-sky-600 bg-sky-50",
    Normalgewicht: "text-brand-700 bg-brand-50",
    Übergewicht: "text-amber-700 bg-amber-50",
    Adipositas: "text-rose-700 bg-rose-50",
  };

  function TrendBadge({ value }: { value: number | null }) {
    if (value === null) return <span className="text-gray-400 text-xs">–</span>;
    const rounded = Math.round(value * 10) / 10;
    if (Math.abs(rounded) < 0.05) {
      return (
        <span className="inline-flex items-center gap-1 text-gray-500 text-xs font-medium">
          <Minus size={12} /> {rounded.toFixed(1)} kg
        </span>
      );
    }
    const isLoss = rounded < 0;
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs font-medium ${
          isLoss ? "text-brand-700" : "text-rose-600"
        }`}
      >
        {isLoss ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
        {rounded > 0 ? "+" : ""}
        {rounded.toFixed(1)} kg
      </span>
    );
  }

  return (
    <div>
      <PageHeader
        title="Gewicht"
        subtitle="Verlauf, BMI & Prognose"
        right={
          <button
            onClick={openForm}
            className="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-card active:scale-95 transition-transform"
            aria-label="Gewicht eintragen"
          >
            <Plus size={20} />
          </button>
        }
      />

      <div className="px-5 space-y-5 pb-6">
        {/* Aktuelles Gewicht */}
        <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-xl2 p-5 text-white">
          <p className="text-sm text-brand-100">Aktuelles Gewicht</p>
          <p className="text-3xl font-bold mt-1">{currentWeight.toFixed(1)} kg</p>
          <p className="text-xs text-brand-100 mt-1">
            Ziel: {profile.targetWeightKg} kg ({(currentWeight - profile.targetWeightKg).toFixed(1)} kg zu gehen)
          </p>
        </div>

        {/* Verlauf */}
        <div className="card p-4">
          <p className="text-sm font-semibold text-gray-500 mb-2">Verlauf</p>
          <WeightChart entries={chronological} targetWeightKg={profile.targetWeightKg} />
        </div>

        {/* Trend */}
        <div className="card p-4">
          <p className="text-sm font-semibold text-gray-500 mb-3">Trend</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-[11px] text-gray-400 mb-1">7 Tage</p>
              <TrendBadge value={trend.change7d} />
            </div>
            <div>
              <p className="text-[11px] text-gray-400 mb-1">30 Tage</p>
              <TrendBadge value={trend.change30d} />
            </div>
            <div>
              <p className="text-[11px] text-gray-400 mb-1">Gesamt</p>
              <TrendBadge value={trend.changeTotal} />
            </div>
          </div>
        </div>

        {/* BMI */}
        <div className="card p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-brand-900">BMI</p>
            <p className="text-xs text-gray-400">basierend auf {profile.heightCm} cm</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-brand-900">{bmi.toFixed(1)}</p>
            <span className={`pill ${categoryColor[category]}`}>{category}</span>
          </div>
        </div>

        {/* Prognose */}
        <div className="card p-4">
          <p className="text-sm font-medium text-brand-900">Prognose</p>
          {weeksToGoal !== null ? (
            <p className="text-xs text-gray-500 mt-1">
              Mit deinem aktuellen Trend (
              {trend.weeklyRateKg !== null ? `${trend.weeklyRateKg.toFixed(2)} kg/Woche` : "–"}) erreichst
              du dein Zielgewicht in etwa <span className="font-semibold">{weeksToGoal} Wochen</span>.
            </p>
          ) : (
            <p className="text-xs text-gray-500 mt-1">
              Trage über mehrere Tage Gewichte ein, damit dein Trend berechnet werden kann.
            </p>
          )}
        </div>

        {/* Historie */}
        <div>
          <p className="text-sm font-semibold text-gray-500 mb-2">Einträge</p>
          {entries.length === 0 ? (
            <div className="card p-4 text-sm text-gray-400 text-center">
              Noch keine Gewichtseinträge vorhanden
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div key={entry.id} className="card p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-brand-900">{entry.weightKg.toFixed(1)} kg</p>
                    <p className="text-xs text-gray-400">
                      {new Date(entry.loggedAt).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                      {entry.bodyFatPercent ? ` · ${entry.bodyFatPercent}% KFA` : ""}
                      {entry.note ? ` · ${entry.note}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="text-gray-400 hover:text-rose-500"
                    aria-label="Eintrag löschen"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <DetailSheet title="Gewicht eintragen" onClose={() => setShowForm(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-500">Gewicht (kg)</label>
              <input
                type="number"
                inputMode="decimal"
                className="input-field mt-1"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                placeholder="z. B. 79.5"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-500">Körperfett % (optional)</label>
              <input
                type="number"
                inputMode="decimal"
                className="input-field mt-1"
                value={bodyFatInput}
                onChange={(e) => setBodyFatInput(e.target.value)}
                placeholder="z. B. 17"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-500">Notiz (optional)</label>
              <input
                type="text"
                className="input-field mt-1"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="z. B. nach dem Aufwachen"
              />
            </div>
            {formError && <p className="text-sm text-rose-600">{formError}</p>}
            <button onClick={handleSave} className="btn-primary w-full">
              Speichern
            </button>
          </div>
        </DetailSheet>
      )}
    </div>
  );
}
