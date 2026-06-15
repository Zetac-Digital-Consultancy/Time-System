import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { getStartOfWeek, getStartOfMonth, getEndOfDay } from "@/lib/time-utils";
import { formatHours } from "@/lib/utils";

export async function GET() {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  if (authResult.user.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
  }

  const userId = authResult.user.id;
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = getStartOfWeek(now);
  const monthStart = getStartOfMonth(now);

  const [todayEntries, weekEntries, monthEntries] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { userId, workDate: { gte: todayStart, lte: getEndOfDay(now) } },
      include: { baustelle: { select: { name: true } } },
      orderBy: { startTime: "asc" },
    }),
    prisma.timeEntry.findMany({
      where: { userId, workDate: { gte: weekStart } },
    }),
    prisma.timeEntry.findMany({
      where: { userId, workDate: { gte: monthStart } },
    }),
  ]);

  const todayHours = todayEntries.reduce((sum, e) => sum + e.totalHours, 0);
  const weekHours = weekEntries.reduce((sum, e) => sum + e.totalHours, 0);
  const monthHours = monthEntries.reduce((sum, e) => sum + e.totalHours, 0);

  return NextResponse.json({
    todayEntries,
    todayHours: formatHours(todayHours),
    todayHoursRaw: todayHours,
    weekHours: formatHours(weekHours),
    weekHoursRaw: weekHours,
    monthHours: formatHours(monthHours),
    monthHoursRaw: monthHours,
  });
}
