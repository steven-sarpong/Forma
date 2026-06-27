// Visuelles Platzhalter-System für Trainingsübungen. Solange keine echten
// Foto-/GIF-Assets pro Übung vorhanden sind, zeigen wir ein konsistentes
// Icon + Farbverlauf pro Muskelgruppe. Sobald echte Medien existieren, reicht
// es, `imageUrl`/`gifUrl` auf der jeweiligen WorkoutExercise zu setzen –
// ExerciseVisual rendert diese automatisch bevorzugt (siehe training/page.tsx).

export interface ExerciseVisualStyle {
  icon: string; // lucide-react Icon-Name, in training/page.tsx auf Komponente gemappt
  gradient: string; // Tailwind-Gradient-Klassen
}

const MUSCLE_GROUP_VISUALS: { match: RegExp; style: ExerciseVisualStyle }[] = [
  { match: /brust|chest|push/i, style: { icon: "Sparkle", gradient: "from-rose-400 to-rose-600" } },
  { match: /rücken|lat|row|zug/i, style: { icon: "MoveVertical", gradient: "from-blue-400 to-blue-600" } },
  { match: /schulter|shoulder|delt/i, style: { icon: "Circle", gradient: "from-amber-400 to-amber-600" } },
  { match: /bizeps|trizeps|arm/i, style: { icon: "Dumbbell", gradient: "from-purple-400 to-purple-600" } },
  { match: /bein|quad|hamstring|leg|wade/i, style: { icon: "Footprints", gradient: "from-emerald-400 to-emerald-600" } },
  { match: /gesäß|glute|hüfte/i, style: { icon: "Circle", gradient: "from-pink-400 to-pink-600" } },
  { match: /bauch|core|abs/i, style: { icon: "Hexagon", gradient: "from-orange-400 to-orange-600" } },
  { match: /cardio|ausdauer|hiit/i, style: { icon: "HeartPulse", gradient: "from-red-400 to-red-600" } },
];

const DEFAULT_VISUAL: ExerciseVisualStyle = { icon: "Dumbbell", gradient: "from-brand-500 to-brand-700" };

export function getExerciseVisual(muscleGroup: string): ExerciseVisualStyle {
  const found = MUSCLE_GROUP_VISUALS.find((entry) => entry.match.test(muscleGroup));
  return found?.style ?? DEFAULT_VISUAL;
}
