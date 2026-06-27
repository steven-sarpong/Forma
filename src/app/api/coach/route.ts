import { NextRequest, NextResponse } from "next/server";
import { generateCoachMessage, AIServiceError, CoachContext } from "@/lib/ai-service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<CoachContext>;

    const required: (keyof CoachContext)[] = [
      "goal",
      "calorieGoal",
      "caloriesSoFar",
      "proteinGoalG",
      "proteinSoFar",
      "carbsGoalG",
      "carbsSoFar",
      "fatGoalG",
      "fatSoFar",
      "waterGoalMl",
      "weeklyWeightChangeKg",
      "currentWeightKg",
      "targetWeightKg",
      "timeOfDay",
    ];
    const missing = required.filter((key) => body[key] === undefined || body[key] === null);
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Fehlende Felder: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    const result = await generateCoachMessage({
      ...body,
      weeksToGoal: body.weeksToGoal ?? null,
    } as CoachContext);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[/api/coach] Fehler:", error);
    const message =
      error instanceof AIServiceError
        ? error.message
        : "Die Coach-Nachricht konnte nicht erstellt werden.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
