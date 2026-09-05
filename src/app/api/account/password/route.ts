import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { passwordSchema } from "@/lib/validations";
import { consumeAttempt } from "@/lib/login-limiter";
import bcrypt from "bcryptjs";
import { z } from "zod";

export async function POST(request: Request) {
  const result = await requireSession();
  if ("error" in result) return result.error;
  if (!(await consumeAttempt(`password:${result.user.id}`, 5))) return NextResponse.json({ error: "Bitte in 15 Minuten erneut versuchen" }, { status: 429 });
  const parsed = z.object({ currentPassword: z.string().max(256), password: passwordSchema }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Neues Passwort: mindestens 15 Zeichen, maximal 72 UTF-8-Bytes" }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { id: result.user.id } });
  if (!user || !(await bcrypt.compare(parsed.data.currentPassword, user.password))) return NextResponse.json({ error: "Aktuelles Passwort ist falsch" }, { status: 400 });
  if (await bcrypt.compare(parsed.data.password, user.password)) return NextResponse.json({ error: "Bitte ein anderes Passwort wählen" }, { status: 400 });
  const password = await bcrypt.hash(parsed.data.password, 12);
  const changed = await prisma.$transaction(async tx => {
    const updated = await tx.user.updateMany({ where: { id: user.id, sessionVersion: result.user.sessionVersion }, data: { password, mustChangePassword: false, sessionVersion: { increment: 1 } } });
    if (updated.count === 1) await tx.accountToken.deleteMany({ where: { userId: user.id } });
    return updated.count;
  });
  return changed ? NextResponse.json({ success: true }) : NextResponse.json({ error: "Bitte erneut anmelden" }, { status: 401 });
}
