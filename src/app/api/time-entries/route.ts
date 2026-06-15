import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { employeeTimeEntrySchema } from "@/lib/validations";
import { calculateTotalHours } from "@/lib/time-utils";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const { user } = authResult;
  const { searchParams } = request.nextUrl;

  const where: Prisma.TimeEntryWhereInput = {};

  if (user.role === "EMPLOYEE") {
    where.userId = user.id;
  } else {
    const userId = searchParams.get("userId");
    if (userId) where.userId = userId;
  }

  const baustelleId = searchParams.get("baustelleId");
  if (baustelleId) where.baustelleId = baustelleId;

  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  if (dateFrom || dateTo) {
    where.workDate = {};
    if (dateFrom) where.workDate.gte = new Date(dateFrom);
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      where.workDate.lte = endDate;
    }
  }

  const search = searchParams.get("search");
  if (search) {
    where.OR = [
      { notes: { contains: search, mode: "insensitive" } },
      { user: { name: { contains: search, mode: "insensitive" } } },
      { baustelle: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  const entries = await prisma.timeEntry.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true } },
      baustelle: { select: { id: true, name: true } },
    },
    orderBy: [{ workDate: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(entries);
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const body = await request.json();
  const parsed = employeeTimeEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const totalHours = calculateTotalHours(
    parsed.data.startTime,
    parsed.data.endTime,
    parsed.data.breakMinutes
  );

  const entry = await prisma.timeEntry.create({
    data: {
      userId: authResult.user.id,
      workDate: new Date(parsed.data.workDate),
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      breakMinutes: parsed.data.breakMinutes,
      totalHours,
      notes: parsed.data.notes,
      baustelleId: null,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      baustelle: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
