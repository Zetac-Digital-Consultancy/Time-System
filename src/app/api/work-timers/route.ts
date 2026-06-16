import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  const { searchParams } = request.nextUrl;
  const where: Prisma.WorkTimerWhereInput = {};

  const userId = searchParams.get("userId");
  if (userId) where.userId = userId;

  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  if (dateFrom || dateTo) {
    where.workDate = {};
    if (dateFrom) where.workDate.gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      where.workDate.lte = end;
    }
  }

  const timers = await prisma.workTimer.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true } },
      segments: { orderBy: { segmentOrder: "asc" } },
      events: { orderBy: { occurredAt: "asc" } },
      timeEntry: {
        select: {
          id: true,
          totalHours: true,
          startTime: true,
          endTime: true,
          breakMinutes: true,
          baustelle: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ workDate: "desc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json(timers);
}
