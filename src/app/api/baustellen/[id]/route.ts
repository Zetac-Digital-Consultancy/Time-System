import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAction } from "@/lib/api-auth";
import { baustelleSchema } from "@/lib/validations";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  const { id } = await params;
  const body = await request.json();
  const parsed = baustelleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const baustelle = await prisma.baustelle.update({
    where: { id },
    data: parsed.data,
  });

  await logAdminAction(
    authResult.user.id,
    "UPDATE",
    "Baustelle",
    id,
    `Baustelle ${baustelle.name} aktualisiert`
  );

  return NextResponse.json(baustelle);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  const { id } = await params;
  await prisma.baustelle.delete({ where: { id } });

  await logAdminAction(authResult.user.id, "DELETE", "Baustelle", id, "Baustelle gelöscht");

  return NextResponse.json({ success: true });
}
