import { createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";

// Atomic, shared across replicas, and independent of untrusted proxy headers.
export async function consumeAttempt(identity: string, limit = 10, seconds = 900) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required");
  const key = createHmac("sha256", secret).update(identity).digest("hex");
  const rows = await prisma.$queryRaw<{ attempts: number }[]>`
    INSERT INTO login_attempts (key, attempts, window_start) VALUES (${key}, 1, NOW())
    ON CONFLICT (key) DO UPDATE SET
      attempts = CASE WHEN login_attempts.window_start < NOW() - ${seconds} * INTERVAL '1 second'
        THEN 1 ELSE login_attempts.attempts + 1 END,
      window_start = CASE WHEN login_attempts.window_start < NOW() - ${seconds} * INTERVAL '1 second'
        THEN NOW() ELSE login_attempts.window_start END
    RETURNING attempts`;
  await prisma.loginAttempt.deleteMany({ where: { windowStart: { lt: new Date(Date.now() - 86400000) } } });
  return rows[0].attempts <= limit;
}
