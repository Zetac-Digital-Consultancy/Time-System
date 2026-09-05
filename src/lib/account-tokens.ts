import { createHash, randomBytes } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";

export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export async function issueAccountToken(tx: Prisma.TransactionClient, userId: string) {
  const token = randomBytes(32).toString("base64url");
  await tx.accountToken.deleteMany({ where: { userId } });
  await tx.accountToken.create({ data: {
    userId, tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
  } });
  const origin = process.env.AUTH_URL;
  if (!origin) throw new Error("AUTH_URL is required to create activation links");
  // Fragment avoids sending the token in HTTP requests, access logs, or referrers.
  return new URL(`/activate#${token}`, origin).toString();
}
