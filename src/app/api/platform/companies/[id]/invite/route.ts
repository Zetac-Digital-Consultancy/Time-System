import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { issueAccountToken } from "@/lib/account-tokens";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requirePlatformAdmin();
  if ("error" in result) return result.error;
  const { id } = await params;
  const parsed = z.union([
    z.object({ userId: z.string(), reason: z.string().trim().min(10).max(500) }),
    z.object({ adminName: z.string().trim().min(2).max(150), email: z.string().trim().toLowerCase().email().max(254) }),
  ]).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Admin fehlt" }, { status: 400 });
  const input = parsed.data;
  if (!(await prisma.company.findFirst({ where: { id, status: "ACTIVE" } }))) return NextResponse.json({ error: "Aktive Firma nicht gefunden" }, { status: 404 });
  const admin = "userId" in input ? await prisma.user.findFirst({ where: { id: input.userId, companyId: id, role: "ADMIN", status: "ACTIVE" } }) : null;
  if ("userId" in input && !admin) return NextResponse.json({ error: "Aktiver Firmenadmin nicht gefunden" }, { status: 404 });
  if ("email" in input && await prisma.user.findUnique({ where: { email: input.email } })) return NextResponse.json({ error: "E-Mail bereits vergeben" }, { status: 409 });
  const password = "email" in input ? await bcrypt.hash(randomBytes(32).toString("hex"), 12) : "";
  const activationUrl = await prisma.$transaction(async tx => {
    const target = admin ?? await tx.user.create({ data: { name: (input as { adminName: string }).adminName, email: (input as { email: string }).email, role: "ADMIN", companyId: id, password } });
    const url = await issueAccountToken(tx, target.id);
    await tx.auditLog.create({ data: { adminId: result.user.id, action: admin ? "ADMIN_RECOVERY_LINK" : "CREATE_COMPANY_ADMIN", entityType: "Company", entityId: id, details: "reason" in input ? input.reason : target.email } });
    return url;
  });
  return NextResponse.json({ activationUrl }, { headers: { "Cache-Control": "no-store" } });
}
