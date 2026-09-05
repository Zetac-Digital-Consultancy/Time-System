import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { passwordSchema } from "@/lib/validations";
import { tokenHash } from "@/lib/account-tokens";
import { consumeAttempt } from "@/lib/login-limiter";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/), password: passwordSchema });
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültiger Link oder Passwort (mindestens 15 Zeichen)" }, { status: 400 });
  if (!(await consumeAttempt("activate:global", 100, 60))) return NextResponse.json({ error: "Bitte später erneut versuchen" }, { status: 429 });
  const password = await bcrypt.hash(parsed.data.password, 12);
  const changed = await prisma.$transaction(async tx => {
    const token = await tx.accountToken.findUnique({ where: { tokenHash: tokenHash(parsed.data.token) }, include: { user: { include: { company: true } } } });
    if (!token || token.expiresAt <= new Date() || token.user.role === "PLATFORM_ADMIN" ||
      token.user.status !== "ACTIVE" || token.user.company?.status !== "ACTIVE") return false;
    const used = await tx.accountToken.deleteMany({ where: { id: token.id, expiresAt: { gt: new Date() } } });
    if (used.count !== 1) return false;
    await tx.user.update({ where: { id: token.userId }, data: { password, mustChangePassword: false, sessionVersion: { increment: 1 } } });
    return true;
  });
  return changed ? NextResponse.json({ success: true }) : NextResponse.json({ error: "Link ungültig oder abgelaufen. Bitte einen neuen Link anfordern." }, { status: 400 });
}
