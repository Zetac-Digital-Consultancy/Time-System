import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { Secret } from "otpauth";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { passwordSchema } from "../src/lib/validations";
import { encryptMfa, validMfaStep } from "../src/lib/mfa";
import { z } from "zod";

async function main() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error("Run interactively in a private terminal; redirected output is not allowed.");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) throw new Error("Set a random AUTH_SECRET of at least 32 characters first");
  const reset = process.argv.includes("--recover");
  let hidden = false;
  const output = new Writable({ write(chunk, _encoding, callback) { if (!hidden) process.stdout.write(chunk); callback(); } });
  const rl = createInterface({ input: process.stdin, output, terminal: true });
  const askSecret = async (label: string) => {
    process.stdout.write(label); hidden = true;
    try { return await rl.question(""); } finally { hidden = false; process.stdout.write("\n"); }
  };
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const email = z.string().trim().toLowerCase().email().parse(await rl.question("Platform admin email: "));
    const existing = await db.user.findUnique({ where: { email } });
    if (existing && !reset) throw new Error("Account already exists. No changes made.");
    if (reset && (!existing || existing.role !== "PLATFORM_ADMIN")) throw new Error("Recovery requires an existing platform admin; company accounts cannot be promoted.");
    const name = reset ? existing!.name : z.string().trim().min(2).parse(await rl.question("Full name: "));
    const password = passwordSchema.parse(await askSecret("New password (15+ characters, hidden): "));
    if (password !== await askSecret("Confirm password: ")) throw new Error("Passwords do not match");
    const secret = new Secret({ size: 20 }).base32;
    console.log("Add a time-based account in your authenticator (ZeitTrack, " + email + ").");
    console.log("Setup key (shown only in this private terminal): " + secret);
    const step = validMfaStep(secret, (await askSecret("Authenticator code: ")).trim());
    if (step === null) throw new Error("Invalid authenticator code. Account was not changed.");
    const data = { name, password: await bcrypt.hash(password, 12), mfaSecret: encryptMfa(secret), mfaLastStep: step, status: "ACTIVE" as const, mustChangePassword: false };
    await db.$transaction(async tx => {
      const user = reset
        ? await tx.user.update({ where: { id: existing!.id }, data: { ...data, sessionVersion: { increment: 1 } } })
        : await tx.user.create({ data: { ...data, email, role: "PLATFORM_ADMIN", companyId: null } });
      await tx.auditLog.create({ data: { adminId: user.id, action: reset ? "PLATFORM_RECOVERY" : "PLATFORM_BOOTSTRAP", entityType: "User", entityId: user.id } });
    });
    console.log("Platform administrator saved. Wait for the next authenticator code before logging in.");
  } finally { rl.close(); await db.$disconnect(); }
}
main().catch(() => { console.error("Setup failed. Check the inputs, database, and environment. No credentials are logged."); process.exitCode = 1; });
