import { businessDate } from "@/lib/business-date";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { getStartOfWeek, getStartOfMonth, getEndOfDay } from "@/lib/time-utils";
import { formatHours } from "@/lib/utils";

export async function GET() {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  const now = new Date();
  const todayStart = businessDate(now);
  const weekStart = getStartOfWeek(now);
  const monthStart = getStartOfMonth(now);

  const [
    totalEmployees,
    todayEntries,
    weekEntries,
    recentEntries,
    hoursByEmployee,
    hoursByBaustelle,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "EMPLOYEE", status: "ACTIVE", companyId: authResult.user.companyId } }),
    prisma.timeEntry.findMany({
      where: { user: { companyId: authResult.user.companyId }, workDate: { gte: todayStart, lte: getEndOfDay(now) } },
    }),
    prisma.timeEntry.findMany({
      where: { user: { companyId: authResult.user.companyId }, workDate: { gte: weekStart } },
    }),
    prisma.timeEntry.findMany({
      where: { user: { companyId: authResult.user.companyId } },
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true } },
        baustelle: { select: { name: true } },
      },
    }),
    prisma.timeEntry.groupBy({
      by: ["userId"],
      _sum: { totalHours: true },
      where: { user: { companyId: authResult.user.companyId }, workDate: { gte: monthStart } },
    }),
    prisma.timeEntry.groupBy({
      by: ["baustelleId"],
      _sum: { totalHours: true },
      where: { user: { companyId: authResult.user.companyId }, workDate: { gte: monthStart }, baustelleId: { not: null } },
    }),
  ]);

  const employeeIds = hoursByEmployee.map((h) => h.userId);
  const employees = await prisma.user.findMany({
    where: { id: { in: employeeIds }, companyId: authResult.user.companyId },
    select: { id: true, name: true },
  });

  const baustelleIds = hoursByBaustelle
    .map((h) => h.baustelleId)
    .filter((id): id is string => id !== null);
  const baustellen = await prisma.baustelle.findMany({
    where: { id: { in: baustelleIds }, companyId: authResult.user.companyId },
    select: { id: true, name: true },
  });

  const todayHours = todayEntries.reduce((sum, e) => sum + e.totalHours, 0);
  const weekHours = weekEntries.reduce((sum, e) => sum + e.totalHours, 0);

  return NextResponse.json({
    totalEmployees,
    todayHours: formatHours(todayHours),
    todayHoursRaw: todayHours,
    weekHours: formatHours(weekHours),
    weekHoursRaw: weekHours,
    recentEntries,
    hoursByEmployee: hoursByEmployee.map((h) => ({
      name: employees.find((e) => e.id === h.userId)?.name ?? "Unbekannt",
      hours: h._sum.totalHours ?? 0,
      formatted: formatHours(h._sum.totalHours ?? 0),
    })),
    hoursByBaustelle: hoursByBaustelle.map((h) => ({
      name: baustellen.find((b) => b.id === h.baustelleId)?.name ?? "Unbekannt",
      hours: h._sum.totalHours ?? 0,
      formatted: formatHours(h._sum.totalHours ?? 0),
    })),
  });
}
