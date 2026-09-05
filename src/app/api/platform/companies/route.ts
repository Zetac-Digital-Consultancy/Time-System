import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { issueAccountToken } from "@/lib/account-tokens";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";

export async function GET() {
  const result = await requirePlatformAdmin();
  if ("error" in result) return result.error;
  return NextResponse.json(await prisma.company.findMany({
    select: { id: true, name: true, status: true, createdAt: true, users: {
      where: { role: "ADMIN" }, select: { id: true, name: true, email: true, status: true },
    } }, orderBy: { createdAt: "desc" },
  }));
}
export async function POST(request: Request) {
  const result = await requirePlatformAdmin();
  if ("error" in result) return result.error;
  const parsed = z.object({ name: z.string().trim().min(2).max(150), adminName: z.string().trim().min(2).max(150), email: z.string().trim().toLowerCase().email().max(254) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bitte Firmenname, Admin-Name und gültige E-Mail angeben" }, { status: 400 });
  if (await prisma.user.findUnique({ where: { email: parsed.data.email } })) return NextResponse.json({ error: "E-Mail bereits vergeben" }, { status: 409 });
  const password = await bcrypt.hash(randomBytes(32).toString("hex"), 12);
  const created = await prisma.$transaction(async tx => {
    const company = await tx.company.create({ data: { name: parsed.data.name } });
    const admin = await tx.user.create({ data: { name: parsed.data.adminName, email: parsed.data.email, role: "ADMIN", companyId: company.id, password } });
    const activationUrl = await issueAccountToken(tx, admin.id);
    await tx.auditLog.create({ data: { adminId: result.user.id, action: "CREATE_COMPANY", entityType: "Company", entityId: company.id, details: company.name } });
    return { company, activationUrl };
  });
  return NextResponse.json(created, { status: 201, headers: { "Cache-Control": "no-store" } });
}
