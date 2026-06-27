// Berechnungen für die Gewichts-Statistikseite: BMI, Trend und Zielprognose.

import { BmiCategory, WeightEntry } from "@/types";

export function calculateBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function bmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return "Untergewicht";
  if (bmi < 25) return "Normalgewicht";
  if (bmi < 30) return "Übergewicht";
  return "Adipositas";
}

// Liefert den jüngsten Eintrag, der mindestens `daysAgo` Tage alt ist (für
// Vergleichszeiträume wie "vor 7 Tagen"). Fällt auf den ältesten Eintrag
// zurück, wenn die Historie kürzer ist.
function findEntryAround(entries: WeightEntry[], daysAgo: number): WeightEntry | null {
  if (entries.length === 0) return null;
  const targetTime = Date.now() - daysAgo * 24 * 60 * 60 * 1000;
  const sorted = [...entries].sort(
    (a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime()
  );
  let candidate = sorted[0];
  for (const entry of sorted) {
    if (new Date(entry.loggedAt).getTime() <= targetTime) {
      candidate = entry;
    } else {
      break;
    }
  }
  return candidate;
}

export interface WeightTrend {
  change7d: number | null;
  change30d: number | null;
  changeTotal: number | null;
  weeklyRateKg: number | null; // negativer Wert = Abnahme, basiert auf den letzten 30 Tagen
}

export function calculateWeightTrend(entries: WeightEntry[]): WeightTrend {
  if (entries.length === 0) {
    return { change7d: null, change30d: null, changeTotal: null, weeklyRateKg: null };
  }
  const sorted = [...entries].sort(
    (a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime()
  );
  const latest = sorted[sorted.length - 1];
  const first = sorted[0];

  const entry7d = findEntryAround(sorted, 7);
  const entry30d = findEntryAround(sorted, 30);

  const change7d = entry7d ? latest.weightKg - entry7d.weightKg : null;
  const change30d = entry30d ? latest.weightKg - entry30d.weightKg : null;
  const changeTotal = sorted.length > 1 ? latest.weightKg - first.weightKg : null;

  let weeklyRateKg: number | null = null;
  if (entry30d && entry30d.id !== latest.id) {
    const daysBetween =
      (new Date(latest.loggedAt).getTime() - new Date(entry30d.loggedAt).getTime()) /
      (1000 * 60 * 60 * 24);
    if (daysBetween > 0) {
      weeklyRateKg = ((latest.weightKg - entry30d.weightKg) / daysBetween) * 7;
    }
  }

  return { change7d, change30d, changeTotal, weeklyRateKg };
}

export function projectWeeksToGoal(
  currentWeightKg: number,
  targetWeightKg: number,
  weeklyRateKg: number | null
): number | null {
  if (!weeklyRateKg || weeklyRateKg === 0) return null;
  const diff = targetWeightKg - currentWeightKg;
  if (diff === 0) return 0;
  const sameDirection = Math.sign(diff) === Math.sign(weeklyRateKg);
  if (!sameDirection) return null;
  return Math.ceil(Math.abs(diff / weeklyRateKg));
}
