import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requirePlatformAdmin();
  if ("error" in result) return result.error;
  const { id } = await params;
  const parsed = z.object({ status: z.enum(["ACTIVE", "INACTIVE"]) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültiger Status" }, { status: 400 });
  if (!(await prisma.company.findUnique({ where: { id } }))) return NextResponse.json({ error: "Firma nicht gefunden" }, { status: 404 });
  await prisma.$transaction(async tx => {
    await tx.company.update({ where: { id }, data: parsed.data });
    await tx.user.updateMany({ where: { companyId: id }, data: { sessionVersion: { increment: 1 } } });
    await tx.auditLog.create({ data: { adminId: result.user.id, action: "COMPANY_STATUS", entityType: "Company", entityId: id, details: parsed.data.status } });
  });
  return NextResponse.json({ success: true });
}
