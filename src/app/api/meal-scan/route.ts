import { NextRequest, NextResponse } from "next/server";
import { analyzeMealImage, AIServiceError } from "@/lib/ai-service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image } = body as { image?: string };

    if (!image || typeof image !== "string" || !image.startsWith("data:image")) {
      return NextResponse.json(
        { error: "Bitte ein gültiges Bild als Base64-Data-URL übermitteln." },
        { status: 400 }
      );
    }

    const result = await analyzeMealImage(image);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[/api/meal-scan] Fehler:", error);
    const message =
      error instanceof AIServiceError
        ? error.message
        : "Die Mahlzeiten-Analyse ist fehlgeschlagen. Bitte versuche es erneut.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
