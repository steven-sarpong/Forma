import { NextRequest, NextResponse } from "next/server";
import { generateCoachChatReply, AIServiceError } from "@/lib/ai-service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, context } = body as {
      question: string;
      context?: Record<string, unknown>;
    };

    if (!question?.trim()) {
      return NextResponse.json({ error: "Frage fehlt." }, { status: 400 });
    }

    const result = await generateCoachChatReply(question.trim(), context ?? {});
    return NextResponse.json(result);
  } catch (error) {
    console.error("[/api/coach-chat] Fehler:", error);
    const message =
      error instanceof AIServiceError
        ? error.message
        : "Die Antwort konnte nicht generiert werden.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
