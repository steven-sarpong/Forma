"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Clock, Flame, ChevronDown, ChevronUp, Plus, AlertCircle } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { getFridgeItems, addMeal } from "@/lib/storage";
import { recordActivity } from "@/lib/gamification";
import { showXpToast } from "@/lib/xp-toast";
import { Recipe, RECIPE_CATEGORIES, RecipeCategory } from "@/types";
import { RECIPE_CATEGORY_COLOR } from "@/lib/category-style";

export default function RecipesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [activeCategory, setActiveCategory] = useState<RecipeCategory | "Alle">("Alle");
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [hasFridgeItems, setHasFridgeItems] = useState(true);

  async function fetchRecipes(category?: RecipeCategory) {
    setLoading(true);
    setError(null);
    try {
      const fridgeItems = await getFridgeItems();
      setHasFridgeItems(fridgeItems.length > 0);
      const ingredientNames = fridgeItems.map((i) => i.name);

      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: ingredientNames, category }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Rezeptvorschläge konnten nicht geladen werden.");
      }

      setRecipes(data.recipes || []);
      setModelUsed(data.modelUsed || null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Rezeptvorschläge konnten nicht geladen werden."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRecipes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCategoryClick(cat: RecipeCategory | "Alle") {
    setActiveCategory(cat);
    fetchRecipes(cat === "Alle" ? undefined : cat);
  }

  async function handleAddAsMeal(recipe: Recipe) {
    const protein = parseFloat(recipe.macros.protein) || 0;
    const carbs = parseFloat(recipe.macros.carbs) || 0;
    const fat = parseFloat(recipe.macros.fat) || 0;
    await addMeal({
      name: recipe.title,
      calories: recipe.calories_estimate,
      protein,
      carbs,
      fat,
      eatenAt: new Date().toISOString(),
      source: "recipe",
      recipeTitle: recipe.title,
    });
    showXpToast(await recordActivity("meal"));
    router.push("/meals");
  }

  return (
    <div>
      <PageHeader title="Rezeptvorschläge" subtitle="Basierend auf deinem Kühlschrank-Inhalt" />

      <div className="px-5">
        <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1">
          {(["Alle", ...RECIPE_CATEGORIES] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              className={`pill whitespace-nowrap shrink-0 border ${
                activeCategory === cat
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-gray-500 border-gray-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {!hasFridgeItems && !loading && (
          <div className="card p-3 mb-3 text-xs text-amber-700 bg-amber-50 border-amber-200">
            Dein Kühlschrank ist leer – die KI schlägt allgemeine Rezepte vor. Scanne Zutaten für
            passgenauere Vorschläge.
          </div>
        )}

        {loading && (
          <div className="card p-8 flex flex-col items-center text-center">
            <Loader2 size={28} className="animate-spin text-brand-600 mb-2" />
            <p className="text-sm font-medium text-brand-900">KI erstellt Rezeptideen…</p>
          </div>
        )}

        {!loading && error && (
          <div className="card p-5 flex flex-col items-center text-center gap-3">
            <AlertCircle size={28} className="text-rose-500" />
            <p className="text-sm text-gray-600">{error}</p>
            <button onClick={() => fetchRecipes()} className="btn-primary w-full">
              Erneut versuchen
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {modelUsed && (
              <p className="text-[11px] text-gray-400 text-center mb-2">
                Generiert mit: {modelUsed}
              </p>
            )}
            <div className="space-y-3">
              {recipes.map((recipe, i) => (
                <RecipeCard key={i} recipe={recipe} onAddAsMeal={() => handleAddAsMeal(recipe)} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RecipeCard({ recipe, onAddAsMeal }: { recipe: Recipe; onAddAsMeal: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full p-4 flex items-start justify-between text-left"
      >
        <div className="flex-1 min-w-0">
          <span className={`pill ${RECIPE_CATEGORY_COLOR[recipe.category]}`}>
            {recipe.category}
          </span>
          <p className="font-semibold text-brand-900 mt-2">{recipe.title}</p>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Clock size={13} /> {recipe.prep_time}
            </span>
            <span className="flex items-center gap-1">
              <Flame size={13} /> {recipe.calories_estimate} kcal
            </span>
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={18} className="text-gray-400 shrink-0 mt-1" />
        ) : (
          <ChevronDown size={18} className="text-gray-400 shrink-0 mt-1" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-brand-50 pt-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Macro label="Protein" value={recipe.macros.protein} />
            <Macro label="Kohlenhydrate" value={recipe.macros.carbs} />
            <Macro label="Fett" value={recipe.macros.fat} />
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">Vorhandene Zutaten</p>
            <div className="flex flex-wrap gap-1.5">
              {recipe.available_ingredients.map((ing, i) => (
                <span key={i} className="pill bg-brand-50 text-brand-700">
                  {ing}
                </span>
              ))}
            </div>
          </div>

          {recipe.missing_ingredients.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">Fehlende Zutaten</p>
              <div className="flex flex-wrap gap-1.5">
                {recipe.missing_ingredients.map((ing, i) => (
                  <span key={i} className="pill bg-rose-50 text-rose-600">
                    {ing}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">Zubereitung</p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
              {recipe.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>

          <button
            onClick={onAddAsMeal}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Als Mahlzeit übernehmen
          </button>
        </div>
      )}
    </div>
  );
}

function Macro({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg py-2">
      <p className="text-sm font-bold text-brand-900">{value}</p>
      <p className="text-[10px] text-gray-400">{label}</p>
    </div>
  );
}
