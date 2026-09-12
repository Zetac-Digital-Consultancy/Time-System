import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAction } from "@/lib/api-auth";
import { employeeSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;
  const { id } = await params;
  const deleted = await prisma.$transaction(async (tx) => {
    const result = await tx.user.deleteMany({
      where: { id, companyId: authResult.user.companyId, role: "EMPLOYEE" },
    });
    if (!result.count) return false;
    await tx.auditLog.create({ data: {
      adminId: authResult.user.id, action: "DELETE", entityType: "User", entityId: id,
      details: "Mitarbeiterkonto einschließlich Zeiteinträgen, Timern, Benachrichtigungen und Zugangstokens dauerhaft gelöscht",
    } });
    return true;
  });
  if (!deleted) return NextResponse.json({ error: "Mitarbeiter nicht gefunden" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id, companyId: authResult.user.companyId, role: "EMPLOYEE" },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  const { id } = await params;
  const body = await request.json();
  if (!(await prisma.user.findFirst({ where: { id, companyId: authResult.user.companyId, role: "EMPLOYEE" }, select: { id: true } }))) {
    return NextResponse.json({ error: "Mitarbeiter nicht gefunden" }, { status: 404 });
  }
  const parsed = employeeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {
    name: parsed.data.name,
    email: parsed.data.email.toLowerCase(),
    status: parsed.data.status,
    sessionVersion: { increment: 1 },
  };

  if (parsed.data.password) {
    updateData.password = await bcrypt.hash(parsed.data.password, 12);
    updateData.mustChangePassword = true;
  }

  const user = await prisma.user.update({
    where: { id, companyId: authResult.user.companyId, role: "EMPLOYEE" },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      createdAt: true,
    },
  });

  await logAdminAction(
    authResult.user.id,
    "UPDATE",
    "User",
    id,
    `Mitarbeiter ${user.name} aktualisiert`
  );

  return NextResponse.json(user);
}
