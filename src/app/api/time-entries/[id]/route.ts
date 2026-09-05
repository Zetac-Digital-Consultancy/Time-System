import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, logAdminAction } from "@/lib/api-auth";
import { adminTimeEntrySchema, employeeTimeEntrySchema } from "@/lib/validations";
import { calculateTotalHours } from "@/lib/time-utils";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const { id } = await params;
  const entry = await prisma.timeEntry.findUnique({
    where: { id, user: { companyId: authResult.user.companyId } },
    include: {
      user: { select: { id: true, name: true, email: true } },
      baustelle: { select: { id: true, name: true } },
      workTimer: {
        include: {
          segments: { orderBy: { segmentOrder: "asc" } },
          events: { orderBy: { occurredAt: "asc" } },
        },
      },
    },
  });

  if (!entry) {
    return NextResponse.json({ error: "Eintrag nicht gefunden" }, { status: 404 });
  }

  if (authResult.user.role === "EMPLOYEE" && entry.userId !== authResult.user.id) {
    return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
  }

  return NextResponse.json(entry);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const { id } = await params;
  const existing = await prisma.timeEntry.findUnique({ where: { id, user: { companyId: authResult.user.companyId } } });

  if (!existing) {
    return NextResponse.json({ error: "Eintrag nicht gefunden" }, { status: 404 });
  }

  const isAdmin = authResult.user.role === "ADMIN";
  if (!isAdmin && existing.userId !== authResult.user.id) {
    return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
  }

  const body = await request.json();
  const bodyKeys = Object.keys(body);

  if (!isAdmin && existing.status === "APPROVED") {
    return NextResponse.json({ error: "Freigegebene Einträge können nicht geändert werden" }, { status: 403 });
  }
  if (isAdmin && body.baustelleId != null && (
    typeof body.baustelleId !== "string" || !(await prisma.baustelle.findFirst({
      where: { id: body.baustelleId, companyId: authResult.user.companyId }, select: { id: true },
    }))
  )) return NextResponse.json({ error: "Baustelle nicht gefunden" }, { status: 404 });
  if (isAdmin && body.userId != null && (
    typeof body.userId !== "string" || !(await prisma.user.findFirst({
      where: { id: body.userId, companyId: authResult.user.companyId, role: "EMPLOYEE" }, select: { id: true },
    }))
  )) return NextResponse.json({ error: "Mitarbeiter nicht gefunden" }, { status: 404 });
  if (body.userId && body.userId !== existing.userId && existing.source === "TIMER") {
    return NextResponse.json({ error: "Timer-Einträge können nicht übertragen werden" }, { status: 400 });
  }

  // Baustelle-only assignment: admin sends { baustelleId } without the full entry fields.
  if (isAdmin && bodyKeys.length === 1 && "baustelleId" in body) {
    const entry = await prisma.timeEntry.update({
      where: { id, user: { companyId: authResult.user.companyId } },
      data: { baustelleId: body.baustelleId ?? null },
      include: {
        user: { select: { id: true, name: true, email: true } },
        baustelle: { select: { id: true, name: true } },
      },
    });
    await logAdminAction(
      authResult.user.id,
      "UPDATE",
      "TimeEntry",
      id,
      `Baustelle zugewiesen: ${entry.baustelle?.name ?? "keine"} für ${entry.user.name}`
    );
    return NextResponse.json(entry);
  }

  // Full update (edit form).
  const schema = isAdmin ? adminTimeEntrySchema : employeeTimeEntrySchema;
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const totalHours = calculateTotalHours(
    data.startTime,
    data.endTime,
    data.breakMinutes
  );

  const updateData: Record<string, unknown> = {
    workDate: new Date(data.workDate),
    startTime: data.startTime,
    endTime: data.endTime,
    breakMinutes: data.breakMinutes,
    totalHours,
    notes: data.notes,
  };

  if (isAdmin) {
    const adminData = data as { baustelleId?: string | null; userId?: string };
    updateData.baustelleId = adminData.baustelleId ?? null;
    if (adminData.userId) {
      updateData.userId = adminData.userId;
    }
  }

  const entry = await prisma.timeEntry.update({
    where: { id, user: { companyId: authResult.user.companyId } },
    data: updateData,
    include: {
      user: { select: { id: true, name: true, email: true } },
      baustelle: { select: { id: true, name: true } },
    },
  });

  if (isAdmin) {
    await logAdminAction(
      authResult.user.id,
      "UPDATE",
      "TimeEntry",
      id,
      `Zeiteintrag aktualisiert für ${entry.user.name}`
    );
  }

  return NextResponse.json(entry);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const { id } = await params;
  const existing = await prisma.timeEntry.findUnique({ where: { id, user: { companyId: authResult.user.companyId } } });

  if (!existing) {
    return NextResponse.json({ error: "Eintrag nicht gefunden" }, { status: 404 });
  }

  const isAdmin = authResult.user.role === "ADMIN";
  if (!isAdmin && existing.userId !== authResult.user.id) {
    return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
  }

  if (!isAdmin && existing.status === "APPROVED") {
    return NextResponse.json({ error: "Freigegebene Einträge können nicht gelöscht werden" }, { status: 403 });
  }
  await prisma.timeEntry.delete({ where: { id, user: { companyId: authResult.user.companyId } } });

  if (isAdmin) {
    await logAdminAction(authResult.user.id, "DELETE", "TimeEntry", id, "Zeiteintrag gelöscht");
  }

  return NextResponse.json({ success: true });
}
