import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import {
  getWorkTimerState,
  runTimerAction,
} from "@/lib/work-timer-service";

export async function GET() {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  if (authResult.user.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Nur für Mitarbeiter verfügbar" }, { status: 403 });
  }

  try {
    const state = await getWorkTimerState(authResult.user.id);
    return NextResponse.json(state);
  } catch (error) {
    console.error("[work-timer] GET", error);
    const message = error instanceof Error ? error.message : "Timer konnte nicht geladen werden";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  if (authResult.user.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Nur für Mitarbeiter verfügbar" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const action = body.action as string;

  try {
    const result = await runTimerAction(authResult.user.id, authResult.user.companyId, action);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[work-timer]", action, error);
    const message = error instanceof Error ? error.message : "Timer-Aktion fehlgeschlagen";
    const isConfigError =
      message.includes("Prisma") ||
      message.includes("Datenbankmodelle") ||
      message.includes("DATABASE_URL");
    return NextResponse.json(
      { error: message },
      { status: isConfigError ? 503 : 400 }
    );
  }
}
