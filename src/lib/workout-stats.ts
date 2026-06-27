// Schätzt den Kalorienverbrauch eines Krafttrainings auf Basis von MET-Werten
// (Metabolic Equivalent of Task). MET 5.0 entspricht moderatem Krafttraining
// mit freien Gewichten/Maschinen laut Compendium of Physical Activities.
const STRENGTH_TRAINING_MET = 5.0;

export function estimateCaloriesBurned(durationMinutes: number, weightKg: number): number {
  const hours = durationMinutes / 60;
  return Math.round(STRENGTH_TRAINING_MET * weightKg * hours);
}
