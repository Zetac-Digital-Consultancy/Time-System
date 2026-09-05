import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin, logAdminAction } from "@/lib/api-auth";
import { baustelleSchema } from "@/lib/validations";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const { id } = await params;
  const baustelle = await prisma.baustelle.findUnique({
    where: { id, companyId: authResult.user.companyId },
    include: {
      _count: { select: { timeEntries: true } },
    },
  });

  if (!baustelle) {
    return NextResponse.json({ error: "Baustelle nicht gefunden" }, { status: 404 });
  }

  return NextResponse.json(baustelle);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  const { id } = await params;
  const body = await request.json();
  if (!(await prisma.baustelle.findFirst({ where: { id, companyId: authResult.user.companyId }, select: { id: true } }))) {
    return NextResponse.json({ error: "Baustelle nicht gefunden" }, { status: 404 });
  }
  const parsed = baustelleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const baustelle = await prisma.baustelle.update({
    where: { id, companyId: authResult.user.companyId },
    data: parsed.data,
  });

  await logAdminAction(
    authResult.user.id,
    "UPDATE",
    "Baustelle",
    baustelle.id,
    `Baustelle ${baustelle.name} aktualisiert`
  );

  return NextResponse.json(baustelle);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  const { id } = await params;
  if (!(await prisma.baustelle.findFirst({ where: { id, companyId: authResult.user.companyId }, select: { id: true } }))) {
    return NextResponse.json({ error: "Baustelle nicht gefunden" }, { status: 404 });
  }
  const baustelle = await prisma.baustelle.delete({ where: { id, companyId: authResult.user.companyId } });

  await logAdminAction(
    authResult.user.id,
    "DELETE",
    "Baustelle",
    baustelle.id,
    `Baustelle ${baustelle.name} gelöscht`
  );

  return NextResponse.json({ success: true });
}
