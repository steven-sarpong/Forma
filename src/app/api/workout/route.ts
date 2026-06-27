import { NextRequest, NextResponse } from "next/server";
import { generateWorkoutPlan, AIServiceError, WorkoutPlanInput } from "@/lib/ai-service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<WorkoutPlanInput>;
    const { goal, daysPerWeek, activityLevel, age, gender } = body;

    if (!goal || !daysPerWeek || !activityLevel || !age || !gender) {
      return NextResponse.json(
        { error: "Bitte Ziel, Trainingstage, Aktivitätslevel, Alter und Geschlecht übermitteln." },
        { status: 400 }
      );
    }

    const result = await generateWorkoutPlan({ goal, daysPerWeek, activityLevel, age, gender });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[/api/workout] Fehler:", error);
    const message =
      error instanceof AIServiceError
        ? error.message
        : "Der Trainingsplan konnte nicht erstellt werden. Bitte versuche es erneut.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
