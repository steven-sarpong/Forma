"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, X, Flame, Beef, Wheat, Droplet, ScanLine, Search } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import DetailSheet from "@/components/DetailSheet";
import { getMeals, addMeal, deleteMeal, getTodaysTotals } from "@/lib/storage";
import { recordActivity } from "@/lib/gamification";
import { showXpToast } from "@/lib/xp-toast";
import { Meal } from "@/types";
import { FoodDbEntry, searchFoodDatabase } from "@/lib/food-database";
import { CATEGORY_EMOJI } from "@/lib/category-style";

type Tab = "heute" | "verlauf";

const MEAL_TYPES: { label: string; emoji: string; hourRange: [number, number] }[] = [
  { label: "Frühstück", emoji: "🌅", hourRange: [5, 10] },
  { label: "Mittagessen", emoji: "☀️", hourRange: [11, 14] },
  { label: "Abendessen", emoji: "🌙", hourRange: [17, 22] },
  { label: "Snacks", emoji: "🍎", hourRange: [0, 24] }, // catch-all
];

function getMealType(dateStr: string): string {
  const hour = new Date(dateStr).getHours();
  for (const t of MEAL_TYPES.slice(0, 3)) {
    if (hour >= t.hourRange[0] && hour <= t.hourRange[1]) return t.label;
  }
  return "Snacks";
}

function isToday(dateStr: string): boolean {
  return new Date(dateStr).toLocaleDateString("de-DE") === new Date().toLocaleDateString("de-DE");
}

export default function MealsPage() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [totals, setTotals] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [showAdd, setShowAdd] = useState(false);
  const [detailMeal, setDetailMeal] = useState<Meal | null>(null);
  const [tab, setTab] = useState<Tab>("heute");

  async function reload() {
    setMeals(await getMeals());
    setTotals(await getTodaysTotals());
  }

  useEffect(() => { reload(); }, []);

  const sorted = [...meals].sort((a, b) => new Date(b.eatenAt).getTime() - new Date(a.eatenAt).getTime());
  const todayMeals = sorted.filter((m) => isToday(m.eatenAt));
  const historyMeals = sorted.filter((m) => !isToday(m.eatenAt));
  const groupedByDay = groupByDay(historyMeals);

  const todayByType = MEAL_TYPES.map((t) => ({
    ...t,
    meals: todayMeals.filter((m) => getMealType(m.eatenAt) === t.label),
  })).filter((t) => t.meals.length > 0);

  return (
    <div>
      <PageHeader
        title="Mahlzeiten"
        subtitle="Dein Essen im Überblick"
        right={
          <div className="flex items-center gap-2">
            <Link
              href="/scan"
              className="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-card"
              aria-label="Mahlzeit scannen"
            >
              <ScanLine size={20} />
            </Link>
            <button
              onClick={() => setShowAdd(true)}
              className="w-10 h-10 rounded-full bg-white text-brand-700 border border-brand-200 flex items-center justify-center shadow-card"
              aria-label="Mahlzeit hinzufügen"
            >
              <Plus size={20} />
            </button>
          </div>
        }
      />

      <div className="px-5">
        {/* Tab Bar */}
        <div className="flex p-1 bg-brand-50 rounded-xl mb-5 border border-brand-100">
          {(["heute", "verlauf"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t ? "bg-white text-brand-700 shadow-sm" : "text-gray-400"
              }`}
            >
              {t === "heute" ? "Heute" : "Verlauf"}
            </button>
          ))}
        </div>

        {/* Tagesübersicht immer sichtbar */}
        <div className="card p-4 mb-5">
          <p className="text-xs font-semibold text-gray-500 mb-3">Heute</p>
          <div className="grid grid-cols-4 gap-2 text-center">
            <Stat icon={Flame} color="text-accent-500" bg="bg-accent-100" value={Math.round(totals.calories)} label="kcal" />
            <Stat icon={Beef} color="text-rose-500" bg="bg-rose-100" value={`${Math.round(totals.protein)}g`} label="Protein" />
            <Stat icon={Wheat} color="text-amber-600" bg="bg-amber-100" value={`${Math.round(totals.carbs)}g`} label="Kohlenh." />
            <Stat icon={Droplet} color="text-sky-500" bg="bg-sky-100" value={`${Math.round(totals.fat)}g`} label="Fett" />
          </div>
        </div>

        {/* Heute-Tab: nach Mahlzeittyp gruppiert */}
        {tab === "heute" && (
          <>
            {todayMeals.length === 0 ? (
              <div className="card p-6 text-center text-sm text-gray-400">
                Noch keine Mahlzeiten heute. Füge eine hinzu oder scanne dein Essen.
              </div>
            ) : (
              <div className="space-y-5">
                {todayByType.map(({ label, emoji, meals: typeMeals }) => (
                  <div key={label}>
                    <p className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
                      <span>{emoji}</span> {label}
                    </p>
                    <div className="space-y-2">
                      {typeMeals.map((m) => (
                        <MealRow
                          key={m.id}
                          meal={m}
                          onChanged={reload}
                          onOpenDetail={() => setDetailMeal(m)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Verlauf-Tab: nach Datum gruppiert */}
        {tab === "verlauf" && (
          <>
            {historyMeals.length === 0 ? (
              <div className="card p-6 text-center text-sm text-gray-400">
                Kein Verlauf vorhanden.
              </div>
            ) : (
              <div className="space-y-5">
                {Array.from(groupedByDay.entries()).map(([day, dayMeals]) => (
                  <div key={day}>
                    <p className="text-sm font-semibold text-gray-500 mb-2">{day}</p>
                    <div className="space-y-2">
                      {dayMeals.map((m) => (
                        <MealRow
                          key={m.id}
                          meal={m}
                          onChanged={reload}
                          onOpenDetail={() => setDetailMeal(m)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showAdd && <AddMealModal onClose={() => setShowAdd(false)} onAdded={reload} />}
      {detailMeal && (
        <MealDetailSheet
          meal={detailMeal}
          onClose={() => setDetailMeal(null)}
          onDeleted={() => { setDetailMeal(null); reload(); }}
        />
      )}
    </div>
  );
}

function Stat({
  icon: Icon, color, bg, value, label,
}: {
  icon: typeof Flame;
  color: string;
  bg: string;
  value: string | number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center mb-1`}>
        <Icon size={18} className={color} />
      </div>
      <p className="text-sm font-bold text-brand-900">{value}</p>
      <p className="text-[10px] text-gray-400">{label}</p>
    </div>
  );
}

function MealRow({ meal, onChanged, onOpenDetail }: { meal: Meal; onChanged: () => void; onOpenDetail: () => void }) {
  return (
    <div className="card p-3 flex items-center gap-3">
      <button onClick={onOpenDetail} className="flex-1 min-w-0 text-left" type="button">
        <p className="text-sm font-semibold text-brand-900 truncate">{meal.name}</p>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
          <span>{new Date(meal.eatenAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</span>
          <span>· {meal.calories} kcal</span>
          {meal.source === "recipe" && <span className="pill bg-brand-50 text-brand-700">Rezept</span>}
          {meal.source === "scan" && <span className="pill bg-accent-100 text-accent-600">KI-Scan</span>}
        </div>
      </button>
      <button
        onClick={async () => { await deleteMeal(meal.id); onChanged(); }}
        className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:bg-rose-50 hover:text-rose-500 shrink-0"
        aria-label="Löschen"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function MealDetailSheet({ meal, onClose, onDeleted }: { meal: Meal; onClose: () => void; onDeleted: () => void }) {
  return (
    <DetailSheet title={meal.name} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-1.5 flex-wrap">
          {meal.source === "recipe" && <span className="pill bg-brand-50 text-brand-700">Aus Rezept</span>}
          {meal.source === "scan" && <span className="pill bg-accent-100 text-accent-600">KI-Scan</span>}
          {meal.source === "manual" && <span className="pill bg-gray-100 text-gray-500">Manuell</span>}
          {typeof meal.confidence === "number" && (
            <span className="pill bg-gray-100 text-gray-500">Sicherheit: {Math.round(meal.confidence * 100)}%</span>
          )}
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-500 mb-2">Nährwerte (gesamte Portion)</p>
          <div className="grid grid-cols-4 gap-2 text-center">
            <NutritionMini label="kcal" value={meal.calories} />
            <NutritionMini label="Protein" value={`${meal.protein}g`} />
            <NutritionMini label="Kohlenh." value={`${meal.carbs}g`} />
            <NutritionMini label="Fett" value={`${meal.fat}g`} />
          </div>
        </div>
        {meal.items && meal.items.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1.5">Erkannte Bestandteile</p>
            <div className="flex flex-wrap gap-1.5">
              {meal.items.map((it, i) => (
                <span key={i} className="pill bg-brand-50 text-brand-700">
                  {it.name}{it.estimated_quantity ? ` · ${it.estimated_quantity}` : ""}
                </span>
              ))}
            </div>
          </div>
        )}
        {meal.recipeTitle && <DetailField label="Aus Rezept" value={meal.recipeTitle} />}
        <DetailField
          label="Erfasst am"
          value={new Date(meal.eatenAt).toLocaleString("de-DE", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit",
          })}
        />
        {meal.modelUsed && <DetailField label="Analysiert mit" value={meal.modelUsed} />}
        <button
          onClick={async () => { await deleteMeal(meal.id); onDeleted(); }}
          className="btn-secondary w-full text-rose-600 border-rose-200 hover:bg-rose-50 flex items-center justify-center gap-2"
          type="button"
        >
          <Trash2 size={16} /> Löschen
        </button>
      </div>
    </DetailSheet>
  );
}

function NutritionMini({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg py-2 bg-white">
      <p className="text-sm font-bold text-brand-900">{value}</p>
      <p className="text-[10px] text-gray-400">{label}</p>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-[11px] text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-brand-900 mt-0.5">{value}</p>
    </div>
  );
}

function AddMealModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [suggestions, setSuggestions] = useState<FoodDbEntry[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  function applyEntry(entry: FoodDbEntry) {
    setName(entry.name);
    setCalories(String(entry.nutritionPer100g.calories));
    setProtein(String(entry.nutritionPer100g.protein));
    setCarbs(String(entry.nutritionPer100g.carbs));
    setFat(String(entry.nutritionPer100g.fat));
    setShowSuggestions(false);
  }

  function handleNameChange(value: string) {
    setName(value);
    const results = searchFoodDatabase(value);
    setSuggestions(results);
    setShowSuggestions(results.length > 0);
    setHighlightIndex(0);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlightIndex((i) => (i + 1) % suggestions.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlightIndex((i) => (i - 1 + suggestions.length) % suggestions.length); }
    else if (e.key === "Enter") { e.preventDefault(); applyEntry(suggestions[highlightIndex]); }
    else if (e.key === "Escape") { setShowSuggestions(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await addMeal({
      name: name.trim(),
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
      eatenAt: new Date().toISOString(),
      source: "manual",
    });
    showXpToast(await recordActivity("meal"));
    onAdded();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center">
      <div className="bg-white rounded-t-2xl w-full max-w-md p-5 pb-8">
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold text-brand-900">Mahlzeit hinzufügen</p>
          <button onClick={onClose} className="text-gray-400"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <label className="text-xs text-gray-500">Bezeichnung *</label>
            <div className="relative mt-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
              <input
                className="input-field pl-9"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => setShowSuggestions(false)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="z. B. Hähnchen mit Reis"
                autoComplete="off"
                required
              />
            </div>
            {showSuggestions && (
              <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-brand-100 rounded-lg shadow-cardHover max-h-56 overflow-y-auto">
                {suggestions.map((entry, i) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applyEntry(entry)}
                      className={`w-full text-left px-3 py-2 flex items-center gap-2 text-sm ${i === highlightIndex ? "bg-brand-50" : "hover:bg-gray-50"}`}
                    >
                      <span>{CATEGORY_EMOJI[entry.category]}</span>
                      <span className="font-medium text-brand-900">{entry.name}</span>
                      <span className="text-xs text-gray-400 ml-auto">{entry.nutritionPer100g.calories} kcal/100g</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[11px] text-gray-400 mt-1">Wähle einen Vorschlag, um Nährwerte automatisch zu übernehmen.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-500">Kalorien (kcal)</label><input type="number" className="input-field mt-1" value={calories} onChange={(e) => setCalories(e.target.value)} /></div>
            <div><label className="text-xs text-gray-500">Protein (g)</label><input type="number" className="input-field mt-1" value={protein} onChange={(e) => setProtein(e.target.value)} /></div>
            <div><label className="text-xs text-gray-500">Kohlenhydrate (g)</label><input type="number" className="input-field mt-1" value={carbs} onChange={(e) => setCarbs(e.target.value)} /></div>
            <div><label className="text-xs text-gray-500">Fett (g)</label><input type="number" className="input-field mt-1" value={fat} onChange={(e) => setFat(e.target.value)} /></div>
          </div>
          <button type="submit" className="btn-primary w-full mt-2">Hinzufügen</button>
        </form>
      </div>
    </div>
  );
}

function groupByDay(meals: Meal[]): Map<string, Meal[]> {
  const map = new Map<string, Meal[]>();
  meals.forEach((m) => {
    const day = new Date(m.eatenAt).toLocaleDateString("de-DE", {
      weekday: "long", day: "2-digit", month: "2-digit",
    });
    const arr = map.get(day) || [];
    arr.push(m);
    map.set(day, arr);
  });
  return map;
}
