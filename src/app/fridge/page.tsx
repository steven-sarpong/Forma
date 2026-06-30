"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, AlertTriangle, X, Search, CheckCircle2, Pencil, ScanLine, ChefHat, ChevronRight } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import DetailSheet from "@/components/DetailSheet";
import {
  getFridgeItems,
  addFridgeItem,
  updateFridgeItem,
  deleteFridgeItem,
} from "@/lib/storage";
import { FOOD_CATEGORIES, FoodCategory, FridgeItem, NutritionPer100g } from "@/types";
import { CATEGORY_EMOJI, CATEGORY_COLOR, daysUntil } from "@/lib/category-style";
import { FoodDbEntry, findFoodByName, getFallbackNutrition, searchFoodDatabase } from "@/lib/food-database";

export default function FridgePage() {
  const [items, setItems] = useState<FridgeItem[]>([]);
  const [filter, setFilter] = useState<FoodCategory | "Alle">("Alle");
  const [showAdd, setShowAdd] = useState(false);
  const [detailItem, setDetailItem] = useState<FridgeItem | null>(null);

  function reload() {
    getFridgeItems().then(setItems);
  }

  useEffect(() => {
    reload();
  }, []);

  const filtered = useMemo(
    () => (filter === "Alle" ? items : items.filter((i) => i.category === filter)),
    [items, filter]
  );

  const grouped = useMemo(() => {
    const map = new Map<FoodCategory, FridgeItem[]>();
    filtered.forEach((item) => {
      const arr = map.get(item.category) || [];
      arr.push(item);
      map.set(item.category, arr);
    });
    return map;
  }, [filtered]);

  return (
    <div>
      <PageHeader
        title="Meine Lebensmittel"
        subtitle={`${items.length} Einträge im Kühlschrank`}
        right={
          <div className="flex items-center gap-2">
            <Link
              href="/scan?mode=kuehlschrank"
              className="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-card"
              aria-label="Kühlschrank scannen"
            >
              <ScanLine size={20} />
            </Link>
            <button
              onClick={() => setShowAdd(true)}
              className="w-10 h-10 rounded-full bg-white text-brand-700 border border-brand-200 flex items-center justify-center shadow-card"
              aria-label="Lebensmittel hinzufügen"
            >
              <Plus size={20} />
            </button>
          </div>
        }
      />

      <div className="px-5">
        {/* Schneller Scan-Hinweis */}
        <Link
          href="/scan?mode=kuehlschrank"
          className="block bg-gradient-to-br from-brand-600 to-brand-700 rounded-xl2 p-4 text-white shadow-card active:scale-[0.98] transition-transform mb-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Kühlschrank per Foto erfassen</p>
              <p className="text-xs text-brand-100 mt-0.5">KI erkennt deine Zutaten automatisch</p>
            </div>
            <span className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              <ScanLine size={22} />
            </span>
          </div>
        </Link>

        {/* Rezeptvorschläge */}
        <Link href="/recipes" className="card p-4 flex items-center gap-3 mb-5">
          <span className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
            <ChefHat size={18} className="text-brand-600" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium text-brand-900">Rezeptvorschläge</p>
            <p className="text-xs text-gray-400">KI-Rezepte aus deinen vorhandenen Zutaten</p>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </Link>

        {/* Kategorie-Filter */}
        <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1">
          {(["Alle", ...FOOD_CATEGORIES] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`pill whitespace-nowrap shrink-0 border ${
                filter === cat
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-gray-500 border-gray-200"
              }`}
            >
              {cat !== "Alle" && CATEGORY_EMOJI[cat]} {cat}
            </button>
          ))}
        </div>

        {items.length === 0 ? (
          <div className="card p-6 text-center text-sm text-gray-400 mt-2">
            Noch keine Lebensmittel erfasst. Scanne deinen Kühlschrank oder füge manuell hinzu.
          </div>
        ) : (
          <div className="space-y-5 mt-1">
            {Array.from(grouped.entries()).map(([category, catItems]) => (
              <div key={category}>
                <p className="text-sm font-semibold text-gray-500 mb-2">
                  {CATEGORY_EMOJI[category]} {category} ({catItems.length})
                </p>
                <div className="space-y-2">
                  {catItems.map((item) => (
                    <FridgeRow
                      key={item.id}
                      item={item}
                      onChanged={reload}
                      onOpenDetail={() => setDetailItem(item)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && <AddItemModal onClose={() => setShowAdd(false)} onAdded={reload} />}
      {detailItem && (
        <FridgeDetailSheet
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onDeleted={() => {
            setDetailItem(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function FridgeRow({
  item,
  onChanged,
  onOpenDetail,
}: {
  item: FridgeItem;
  onChanged: () => void;
  onOpenDetail: () => void;
}) {
  const expiresIn = item.expiryDate ? daysUntil(item.expiryDate) : null;
  const isSoon = expiresIn !== null && expiresIn <= 3;
  const totalCalories =
    item.nutritionPer100g && item.quantityValue
      ? Math.round((item.nutritionPer100g.calories * item.quantityValue) / 100)
      : null;

  return (
    <div className="card p-3 flex items-center gap-3">
      <button
        onClick={onOpenDetail}
        className="flex items-center gap-3 flex-1 min-w-0 text-left"
        type="button"
      >
        <span className="text-2xl">{CATEGORY_EMOJI[item.category]}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-brand-900 truncate">{item.name}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {item.quantity && <span className="text-xs text-gray-400">{item.quantity}</span>}
            {totalCalories !== null && (
              <span className="pill bg-accent-100 text-accent-600">{totalCalories} kcal</span>
            )}
            {expiresIn !== null && (
              <span
                className={`pill ${
                  isSoon ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"
                } flex items-center gap-1`}
              >
                {isSoon && <AlertTriangle size={11} />}
                {expiresIn >= 0 ? `noch ${expiresIn}d` : `${Math.abs(expiresIn)}d abgelaufen`}
              </span>
            )}
            {item.source === "scan" && (
              <span className={`pill ${CATEGORY_COLOR[item.category]}`}>KI-Scan</span>
            )}
          </div>
        </div>
      </button>
      <button
        onClick={async () => {
          await deleteFridgeItem(item.id);
          onChanged();
        }}
        className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:bg-rose-50 hover:text-rose-500 shrink-0"
        aria-label="Löschen"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function FridgeDetailSheet({
  item,
  onClose,
  onDeleted,
}: {
  item: FridgeItem;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const expiresIn = item.expiryDate ? daysUntil(item.expiryDate) : null;
  const isSoon = expiresIn !== null && expiresIn <= 3;
  const totals =
    item.nutritionPer100g && item.quantityValue
      ? {
          calories: Math.round((item.nutritionPer100g.calories * item.quantityValue) / 100),
          protein: Math.round((item.nutritionPer100g.protein * item.quantityValue) / 100),
          carbs: Math.round((item.nutritionPer100g.carbs * item.quantityValue) / 100),
          fat: Math.round((item.nutritionPer100g.fat * item.quantityValue) / 100),
        }
      : null;

  return (
    <DetailSheet title={item.name} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{CATEGORY_EMOJI[item.category]}</span>
          <div>
            <p className="text-sm font-semibold text-brand-900">{item.category}</p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {item.source === "scan" && (
                <span className={`pill ${CATEGORY_COLOR[item.category]}`}>KI-Scan</span>
              )}
              {item.source === "manual" && <span className="pill bg-gray-100 text-gray-500">Manuell</span>}
              {typeof item.confidence === "number" && (
                <span className="pill bg-gray-100 text-gray-500">
                  Sicherheit: {Math.round(item.confidence * 100)}%
                </span>
              )}
              {item.nutritionEstimated && (
                <span className="pill bg-amber-100 text-amber-700">Nährwerte geschätzt</span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <DetailField label="Menge" value={item.quantity || "—"} />
          <DetailField
            label="Haltbar bis"
            value={
              item.expiryDate
                ? `${new Date(item.expiryDate).toLocaleDateString("de-DE")}${
                    expiresIn !== null
                      ? isSoon
                        ? ` (noch ${expiresIn}d)`
                        : expiresIn < 0
                          ? ` (${Math.abs(expiresIn)}d abgelaufen)`
                          : ""
                      : ""
                  }`
                : "—"
            }
            warn={isSoon}
          />
        </div>

        {item.nutritionPer100g && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-500 mb-2">
              Nährwerte pro 100{item.quantityUnit === "ml" ? "ml" : "g"}
            </p>
            <div className="grid grid-cols-4 gap-2 text-center">
              <NutritionMini label="kcal" value={item.nutritionPer100g.calories} />
              <NutritionMini label="Protein" value={`${item.nutritionPer100g.protein}g`} />
              <NutritionMini label="Kohlenh." value={`${item.nutritionPer100g.carbs}g`} />
              <NutritionMini label="Fett" value={`${item.nutritionPer100g.fat}g`} />
            </div>
            {(item.nutritionPer100g.fiber !== undefined || item.nutritionPer100g.sugar !== undefined) && (
              <div className="grid grid-cols-2 gap-2 text-center mt-2">
                {item.nutritionPer100g.fiber !== undefined && (
                  <NutritionMini label="Ballaststoffe" value={`${item.nutritionPer100g.fiber}g`} />
                )}
                {item.nutritionPer100g.sugar !== undefined && (
                  <NutritionMini label="Zucker" value={`${item.nutritionPer100g.sugar}g`} />
                )}
              </div>
            )}

            {totals && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs font-semibold text-gray-500 mb-2">
                  Gesamt für {item.quantityValue} {item.quantityUnit}
                </p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <NutritionMini label="kcal" value={totals.calories} accent />
                  <NutritionMini label="Protein" value={`${totals.protein}g`} accent />
                  <NutritionMini label="Kohlenh." value={`${totals.carbs}g`} accent />
                  <NutritionMini label="Fett" value={`${totals.fat}g`} accent />
                </div>
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-gray-400 text-center">
          Hinzugefügt am {new Date(item.addedAt).toLocaleDateString("de-DE")}
        </p>

        <button
          onClick={async () => {
            await deleteFridgeItem(item.id);
            onDeleted();
          }}
          className="btn-secondary w-full text-rose-600 border-rose-200 hover:bg-rose-50 flex items-center justify-center gap-2"
          type="button"
        >
          <Trash2 size={16} /> Löschen
        </button>
      </div>
    </DetailSheet>
  );
}

function DetailField({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-[11px] text-gray-400">{label}</p>
      <p className={`text-sm font-semibold mt-0.5 ${warn ? "text-amber-700" : "text-brand-900"}`}>
        {value}
      </p>
    </div>
  );
}

const UNITS = ["g", "ml", "Stück", "Packung"];

function AddItemModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<FoodCategory>("Sonstiges");
  const [quantityValue, setQuantityValue] = useState("");
  const [quantityUnit, setQuantityUnit] = useState("g");
  const [expiryDate, setExpiryDate] = useState("");
  const [nutrition, setNutrition] = useState<NutritionPer100g | null>(null);
  const [nutritionEstimated, setNutritionEstimated] = useState(false);
  const [editingNutrition, setEditingNutrition] = useState(false);

  const [suggestions, setSuggestions] = useState<FoodDbEntry[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [saved, setSaved] = useState(false);
  const skipNextSearch = useRef(false);

  const [existingNames, setExistingNames] = useState<string[]>([]);
  useEffect(() => {
    getFridgeItems().then((items) => setExistingNames(items.map((i) => i.name)));
  }, []);

  function applyEntry(entry: FoodDbEntry) {
    skipNextSearch.current = true;
    setName(entry.name);
    setCategory(entry.category);
    setQuantityUnit(entry.defaultUnit);
    setNutrition(entry.nutritionPer100g);
    setNutritionEstimated(false);
    setShowSuggestions(false);
    setDuplicateWarning(existingNames.some((n) => n.toLowerCase() === entry.name.toLowerCase()));
  }

  function handleNameChange(value: string) {
    setName(value);
    setNutrition(null);
    setDuplicateWarning(existingNames.some((n) => n.toLowerCase() === value.trim().toLowerCase()));

    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }

    const results = searchFoodDatabase(value, existingNames);
    setSuggestions(results);
    setShowSuggestions(results.length > 0);
    setHighlightIndex(0);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      applyEntry(suggestions[highlightIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }

  function ensureNutrition(): NutritionPer100g {
    if (nutrition) return nutrition;
    const dbMatch = findFoodByName(name);
    if (dbMatch) {
      setNutritionEstimated(false);
      return dbMatch.nutritionPer100g;
    }
    setNutritionEstimated(true);
    return getFallbackNutrition(category);
  }

  function handleNameBlur() {
    setShowSuggestions(false);
    if (!name.trim()) return;
    if (!nutrition) {
      const value = ensureNutrition();
      setNutrition(value);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    const finalNutrition = nutrition ?? ensureNutrition();
    const numericQuantity = quantityValue ? Number(quantityValue) : undefined;

    await addFridgeItem({
      name: trimmed,
      category,
      quantity: numericQuantity ? `${numericQuantity} ${quantityUnit}` : undefined,
      quantityValue: numericQuantity,
      quantityUnit: numericQuantity ? quantityUnit : undefined,
      expiryDate: expiryDate || undefined,
      source: "manual",
      nutritionPer100g: finalNutrition,
      nutritionEstimated,
    });

    setSaved(true);
    setTimeout(() => {
      onAdded();
      onClose();
    }, 800);
  }

  const numericQty = Number(quantityValue) || 0;
  const totals =
    nutrition && numericQty > 0
      ? {
          calories: Math.round((nutrition.calories * numericQty) / 100),
          protein: Math.round((nutrition.protein * numericQty) / 100),
          carbs: Math.round((nutrition.carbs * numericQty) / 100),
          fat: Math.round((nutrition.fat * numericQty) / 100),
        }
      : null;

  if (saved) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center">
        <div className="bg-white rounded-t-2xl w-full max-w-md p-8 pb-10 flex flex-col items-center text-center gap-2">
          <CheckCircle2 size={36} className="text-brand-600" />
          <p className="text-sm font-medium text-brand-900">{name.trim()} gespeichert!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center">
      <div className="bg-white rounded-t-2xl w-full max-w-md p-5 pb-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold text-brand-900">Lebensmittel hinzufügen</p>
          <button onClick={onClose} className="text-gray-400" type="button">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <label className="text-xs text-gray-500">Name *</label>
            <div className="relative mt-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
              <input
                className="input-field pl-9"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleNameBlur}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="z. B. Tomate, Hähnchenbrust, Reis…"
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
                      className={`w-full text-left px-3 py-2 flex items-center gap-2 text-sm ${
                        i === highlightIndex ? "bg-brand-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <span>{CATEGORY_EMOJI[entry.category]}</span>
                      <span className="font-medium text-brand-900">{entry.name}</span>
                      <span className="text-xs text-gray-400 ml-auto">{entry.category}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {duplicateWarning && (
              <p className="text-xs text-amber-600 mt-1">
                Dieses Lebensmittel ist bereits in deinem Kühlschrank erfasst.
              </p>
            )}
          </div>

          <div>
            <label className="text-xs text-gray-500">Kategorie</label>
            <select
              className="input-field mt-1"
              value={category}
              onChange={(e) => setCategory(e.target.value as FoodCategory)}
            >
              {FOOD_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_EMOJI[c]} {c}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Menge (optional)</label>
              <input
                type="number"
                min="0"
                step="any"
                className="input-field mt-1"
                value={quantityValue}
                onChange={(e) => setQuantityValue(e.target.value)}
                placeholder="z. B. 500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Einheit</label>
              <select
                className="input-field mt-1"
                value={quantityUnit}
                onChange={(e) => setQuantityUnit(e.target.value)}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500">Haltbar bis (optional)</label>
            <input
              type="date"
              className="input-field mt-1"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>

          {/* Nährwerte */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500">
                Nährwerte pro 100{quantityUnit === "ml" ? "ml" : "g"}
                {nutritionEstimated && name.trim() && (
                  <span className="ml-1.5 pill bg-amber-100 text-amber-700">geschätzt</span>
                )}
              </p>
              {name.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    if (!nutrition) ensureNutrition();
                    setEditingNutrition((v) => !v);
                  }}
                  className="text-xs text-brand-600 font-medium flex items-center gap-1"
                >
                  <Pencil size={12} /> {editingNutrition ? "Fertig" : "Anpassen"}
                </button>
              )}
            </div>

            {!name.trim() ? (
              <p className="text-xs text-gray-400 py-2 text-center">
                Gib einen Namen ein, um Nährwerte zu sehen.
              </p>
            ) : (
              (() => {
                const display = nutrition ?? findFoodByName(name)?.nutritionPer100g ?? getFallbackNutrition(category);
                if (!editingNutrition) {
                  return (
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <NutritionMini label="kcal" value={display.calories} />
                      <NutritionMini label="Protein" value={`${display.protein}g`} />
                      <NutritionMini label="Kohlenh." value={`${display.carbs}g`} />
                      <NutritionMini label="Fett" value={`${display.fat}g`} />
                    </div>
                  );
                }
                return (
                  <div className="grid grid-cols-4 gap-2">
                    <NutritionEditField
                      label="kcal"
                      value={display.calories}
                      onChange={(v) => setNutrition({ ...display, calories: v })}
                    />
                    <NutritionEditField
                      label="Protein"
                      value={display.protein}
                      onChange={(v) => setNutrition({ ...display, protein: v })}
                    />
                    <NutritionEditField
                      label="Kohlenh."
                      value={display.carbs}
                      onChange={(v) => setNutrition({ ...display, carbs: v })}
                    />
                    <NutritionEditField
                      label="Fett"
                      value={display.fat}
                      onChange={(v) => setNutrition({ ...display, fat: v })}
                    />
                  </div>
                );
              })()
            )}

            {totals && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs font-semibold text-gray-500 mb-2">
                  Gesamt für {numericQty} {quantityUnit}
                </p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <NutritionMini label="kcal" value={totals.calories} accent />
                  <NutritionMini label="Protein" value={`${totals.protein}g`} accent />
                  <NutritionMini label="Kohlenh." value={`${totals.carbs}g`} accent />
                  <NutritionMini label="Fett" value={`${totals.fat}g`} accent />
                </div>
              </div>
            )}
          </div>

          <button type="submit" className="btn-primary w-full mt-2">
            Hinzufügen
          </button>
        </form>
      </div>
    </div>
  );
}

function NutritionMini({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-lg py-2 ${accent ? "bg-brand-50" : "bg-white"}`}>
      <p className={`text-sm font-bold ${accent ? "text-brand-700" : "text-brand-900"}`}>
        {value}
      </p>
      <p className="text-[10px] text-gray-400">{label}</p>
    </div>
  );
}

function NutritionEditField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <input
        type="number"
        min="0"
        step="any"
        className="input-field text-center text-sm py-1.5"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
      <p className="text-[10px] text-gray-400 text-center mt-0.5">{label}</p>
    </div>
  );
}
