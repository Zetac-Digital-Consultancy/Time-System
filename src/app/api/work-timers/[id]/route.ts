import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const { id } = await params;

  const timer = await prisma.workTimer.findUnique({
    where: { id, user: { companyId: authResult.user.companyId } },
    include: {
      user: { select: { id: true, name: true, email: true } },
      segments: { orderBy: { segmentOrder: "asc" } },
      events: { orderBy: { occurredAt: "asc" } },
      timeEntry: {
        include: {
          baustelle: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!timer) {
    return NextResponse.json({ error: "Timer nicht gefunden" }, { status: 404 });
  }

  if (authResult.user.role === "EMPLOYEE" && timer.userId !== authResult.user.id) {
    return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
  }

  return NextResponse.json(timer);
}
