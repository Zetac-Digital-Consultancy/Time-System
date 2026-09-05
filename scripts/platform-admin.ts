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
import { AdminSetupError, adminSetupErrorMessage } from "./admin-setup-errors";

let stage = "startup";
let accountSaved = false;

async function main() {
  const check = process.argv.includes("--check");
  if (!check && (!process.stdin.isTTY || !process.stdout.isTTY)) throw new AdminSetupError("An interactive terminal is required. Run docker compose run --rm --interactive --tty migrate npx tsx scripts/platform-admin.ts from an interactive SSH shell (without -T or output redirection).");
  if (!process.env.DATABASE_URL) throw new AdminSetupError("DATABASE_URL is missing from the migrate container environment.");
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) throw new AdminSetupError("AUTH_SECRET must contain at least 32 characters in the migrate container environment.");
  if (check) {
    stage = "database/schema check";
    const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 }) });
    try {
      await db.user.findFirst({ select: { id: true, companyId: true, sessionVersion: true, mustChangePassword: true, mfaSecret: true, mfaLastStep: true } });
      await db.auditLog.findFirst({ select: { id: true } });
      console.log("Environment and database/schema checks passed. No accounts were changed; no credentials are displayed.");
    } finally { await db.$disconnect(); }
    return;
  }
  const reset = process.argv.includes("--recover");
  let hidden = false;
  const output = new Writable({ write(chunk, _encoding, callback) { if (!hidden) process.stdout.write(chunk); callback(); } });
  const rl = createInterface({ input: process.stdin, output, terminal: true });
  const askSecret = async (label: string) => {
    process.stdout.write(label); hidden = true;
    try { return await rl.question(""); } finally { hidden = false; process.stdout.write("\n"); }
  };
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 }) });
  try {
    stage = "email";
    const email = z.string().trim().toLowerCase().email().parse(await rl.question("Platform admin email: "));
    stage = "database account lookup";
    const existing = await db.user.findUnique({ where: { email } });
    if (existing && !reset) throw new AdminSetupError("Account already exists. Use a different individual email, or --recover only if this is already your platform-admin account. No account was overwritten.");
    if (reset && (!existing || existing.role !== "PLATFORM_ADMIN")) throw new AdminSetupError("Recovery requires an existing platform admin; company accounts cannot be promoted.");
    stage = "name";
    const name = reset ? existing!.name : z.string().trim().min(2).parse(await rl.question("Full name: "));
    stage = "password";
    const password = passwordSchema.parse(await askSecret("New password (15+ characters, hidden): "));
    stage = "password confirmation";
    if (password !== await askSecret("Confirm password: ")) throw new AdminSetupError("Passwords do not match. No account was changed.");
    const secret = new Secret({ size: 20 }).base32;
    console.log("Add a time-based account in your authenticator (ZeitTrack, " + email + ").");
    console.log("Setup key (shown only in this private terminal): " + secret);
    stage = "authenticator verification";
    let step: number | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      step = validMfaStep(secret, (await askSecret("Authenticator code: ")).trim());
      if (step !== null) break;
      if (attempt < 2) console.log("Code not accepted. Check the setup key from this run and enter the next six-digit code. The setup key has not changed.");
    }
    if (step === null) throw new AdminSetupError("Authenticator code is invalid or expired. Use the setup key from this run, enter a fresh six-digit code, and check automatic time synchronization on the server and phone. No account was changed.");
    stage = "credential preparation";
    const data = { name, password: await bcrypt.hash(password, 12), mfaSecret: encryptMfa(secret), mfaLastStep: step, status: "ACTIVE" as const, mustChangePassword: false };
    stage = "saving account";
    await db.$transaction(async tx => {
      const user = reset
        ? await tx.user.update({ where: { id: existing!.id }, data: { ...data, sessionVersion: { increment: 1 } } })
        : await tx.user.create({ data: { ...data, email, role: "PLATFORM_ADMIN", companyId: null } });
      await tx.auditLog.create({ data: { adminId: user.id, action: reset ? "PLATFORM_RECOVERY" : "PLATFORM_BOOTSTRAP", entityType: "User", entityId: user.id } });
    });
    accountSaved = true;
    stage = "connection cleanup";
    console.log("Platform administrator saved. Wait for the next authenticator code before logging in.");
  } finally { rl.close(); await db.$disconnect(); }
}
main().catch(error => {
  console.error(accountSaved
    ? "The account was saved, but connection cleanup failed. Try signing in before rerunning setup."
    : `Setup failed during ${stage}: ${adminSetupErrorMessage(error, stage)}`);
  process.exitCode = 1;
});
