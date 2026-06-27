"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Dumbbell,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Flame,
  Clock,
  Trash2,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import DetailSheet from "@/components/DetailSheet";
import { getProfile } from "@/lib/profile";
import {
  getWorkoutPlan,
  saveWorkoutPlan,
  clearWorkoutPlan,
  getWorkoutLogs,
  addWorkoutLog,
  deleteWorkoutLog,
  getWorkoutLogsThisWeek,
} from "@/lib/storage";
import { recordActivity } from "@/lib/gamification";
import { showXpToast } from "@/lib/xp-toast";
import { estimateCaloriesBurned } from "@/lib/workout-stats";
import { FITNESS_GOAL_LABELS, UserProfile, WorkoutDay, WorkoutLog, WorkoutPlan } from "@/types";

export default function TrainingPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logDay, setLogDay] = useState<WorkoutDay | null>(null);
  const [durationInput, setDurationInput] = useState("45");

  const [weekLogs, setWeekLogs] = useState<WorkoutLog[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const p = await getProfile();
      if (!active) return;
      if (!p) {
        router.replace("/onboarding");
        return;
      }
      setProfile(p);
      const [workoutPlan, workoutLogs, weekly] = await Promise.all([
        getWorkoutPlan(),
        getWorkoutLogs(),
        getWorkoutLogsThisWeek(),
      ]);
      if (!active) return;
      setPlan(workoutPlan);
      setLogs(workoutLogs);
      setWeekLogs(weekly);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function generatePlan(p: UserProfile) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: FITNESS_GOAL_LABELS[p.goal],
          daysPerWeek: p.trainingFrequency || 3,
          activityLevel: p.activityLevel,
          age: p.age,
          gender: p.gender,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Trainingsplan konnte nicht erstellt werden.");

      const newPlan: WorkoutPlan = {
        id: crypto.randomUUID(),
        goal: p.goal,
        daysPerWeek: p.trainingFrequency || 3,
        days: data.days,
        createdAt: new Date().toISOString(),
        modelUsed: data.modelUsed,
      };
      await saveWorkoutPlan(newPlan);
      setPlan(newPlan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Trainingsplan konnte nicht erstellt werden.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegenerate() {
    if (!profile) return;
    await clearWorkoutPlan();
    setPlan(null);
    generatePlan(profile);
  }

  function openLogSheet(day: WorkoutDay) {
    setLogDay(day);
    setDurationInput("45");
  }

  async function handleSaveLog() {
    if (!logDay || !profile) return;
    const duration = Number(durationInput) || 45;
    await addWorkoutLog({
      dayName: logDay.name,
      durationMinutes: duration,
      caloriesBurned: estimateCaloriesBurned(duration, profile.weightKg),
      completedAt: new Date().toISOString(),
    });
    showXpToast(await recordActivity("workout"));
    setLogs(await getWorkoutLogs());
    setWeekLogs(await getWorkoutLogsThisWeek());
    setLogDay(null);
  }

  async function handleDeleteLog(id: string) {
    await deleteWorkoutLog(id);
    setLogs(await getWorkoutLogs());
    setWeekLogs(await getWorkoutLogsThisWeek());
  }

  if (!profile) {
    return <div className="px-5 pt-10 text-center text-sm text-gray-400">Lade...</div>;
  }

  return (
    <div>
      <PageHeader title="Training" subtitle="Dein Plan, deine Fortschritte" />

      <div className="px-5 space-y-5 pb-6">
        {/* Wochenstatus */}
        <div className="card p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-brand-900">Diese Woche</p>
            <p className="text-xs text-gray-400">
              Ziel: {profile.trainingFrequency}x / Woche
            </p>
          </div>
          <p className="text-2xl font-bold text-brand-700">
            {weekLogs.length}/{profile.trainingFrequency}
          </p>
        </div>

        {/* Plan-Status */}
        {!plan && !loading && (
          <div className="card p-6 flex flex-col items-center text-center gap-3">
            <Dumbbell size={32} className="text-brand-600" />
            <div>
              <p className="font-semibold text-brand-900">Noch kein Trainingsplan</p>
              <p className="text-sm text-gray-500 mt-1">
                Lass dir einen individuellen Plan basierend auf deinem Ziel &quot;
                {FITNESS_GOAL_LABELS[profile.goal]}&quot; erstellen.
              </p>
            </div>
            <button onClick={() => generatePlan(profile)} className="btn-primary w-full">
              Trainingsplan erstellen
            </button>
          </div>
        )}

        {loading && (
          <div className="card p-8 flex flex-col items-center text-center">
            <Loader2 size={28} className="animate-spin text-brand-600 mb-2" />
            <p className="text-sm font-medium text-brand-900">KI erstellt deinen Trainingsplan…</p>
          </div>
        )}

        {!loading && error && (
          <div className="card p-5 flex flex-col items-center text-center gap-3">
            <AlertCircle size={28} className="text-rose-500" />
            <p className="text-sm text-gray-600">{error}</p>
            <button onClick={() => generatePlan(profile)} className="btn-primary w-full">
              Erneut versuchen
            </button>
          </div>
        )}

        {!loading && plan && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-500">
                Dein Plan ({plan.daysPerWeek}x / Woche)
              </p>
              <button
                onClick={handleRegenerate}
                className="text-xs text-brand-600 font-medium flex items-center gap-1"
              >
                <RefreshCw size={13} /> Neu generieren
              </button>
            </div>
            <div className="space-y-3">
              {plan.days.map((day, i) => (
                <WorkoutDayCard key={i} day={day} onLog={() => openLogSheet(day)} />
              ))}
            </div>
          </>
        )}

        {/* Historie */}
        <div>
          <p className="text-sm font-semibold text-gray-500 mb-2">Trainingshistorie</p>
          {logs.length === 0 ? (
            <div className="card p-4 text-sm text-gray-400 text-center">
              Noch keine Trainingseinheiten protokolliert
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="card p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-brand-900">{log.dayName}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> {log.durationMinutes} Min
                      </span>
                      <span className="flex items-center gap-1">
                        <Flame size={11} /> {log.caloriesBurned} kcal
                      </span>
                      <span>
                        {new Date(log.completedAt).toLocaleDateString("de-DE", {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteLog(log.id)}
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

      {logDay && (
        <DetailSheet title={`${logDay.name} abschließen`} onClose={() => setLogDay(null)}>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-500">Dauer (Minuten)</label>
              <input
                type="number"
                inputMode="numeric"
                className="input-field mt-1"
                value={durationInput}
                onChange={(e) => setDurationInput(e.target.value)}
                autoFocus
              />
            </div>
            <p className="text-xs text-gray-400">
              Geschätzter Kalorienverbrauch:{" "}
              <span className="font-semibold text-brand-700">
                {estimateCaloriesBurned(Number(durationInput) || 0, profile.weightKg)} kcal
              </span>
            </p>
            <button onClick={handleSaveLog} className="btn-primary w-full flex items-center justify-center gap-2">
              <CheckCircle2 size={18} /> Training abschließen
            </button>
          </div>
        </DetailSheet>
      )}
    </div>
  );
}

function WorkoutDayCard({ day, onLog }: { day: WorkoutDay; onLog: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full p-4 flex items-start justify-between text-left"
      >
        <div>
          <p className="font-semibold text-brand-900">{day.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">{day.focus}</p>
        </div>
        {expanded ? (
          <ChevronUp size={18} className="text-gray-400 shrink-0 mt-1" />
        ) : (
          <ChevronDown size={18} className="text-gray-400 shrink-0 mt-1" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2 border-t border-brand-50 pt-3">
          {day.exercises.map((ex, i) => (
            <div key={i} className="bg-gray-50 rounded-lg px-3 py-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-brand-900">{ex.name}</p>
                <span className="pill bg-brand-50 text-brand-700">{ex.muscleGroup}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {ex.sets} Sätze × {ex.reps} Wdh. · {ex.restSeconds}s Pause
              </p>
              {ex.notes && <p className="text-[11px] text-gray-400 mt-1">{ex.notes}</p>}
            </div>
          ))}
          <button onClick={onLog} className="btn-primary w-full mt-2">
            Training abschließen
          </button>
        </div>
      )}
    </div>
  );
}
