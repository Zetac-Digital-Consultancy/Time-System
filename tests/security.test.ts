import test from "node:test";
import assert from "node:assert/strict";
import { sessionIsCurrent, tenantId, dashboardPath } from "../src/lib/access-policy";
import { passwordSchema, employeeTimeEntrySchema } from "../src/lib/validations";
import { businessDate, businessTime, elapsedMinutes } from "../src/lib/business-date";
import { computeTimeEntryFromTimer } from "../src/lib/timer-utils";
import { encryptMfa, decryptMfa, validMfaStep, createTotp } from "../src/lib/mfa";
import { validateProductionEnv } from "../scripts/production-env.mjs";
import { spawnSync } from "node:child_process";

test("revocation, company suspension, and company changes invalidate sessions", () => {
  const user = { role: "ADMIN", companyId: "a", status: "ACTIVE", company: { status: "ACTIVE" }, sessionVersion: 3 };
  const token = { role: "ADMIN", companyId: "a", sessionVersion: 3 };
  assert.equal(sessionIsCurrent(token, user), true);
  for (const changed of [{ ...user, status: "INACTIVE" }, { ...user, sessionVersion: 4 }, { ...user, companyId: "b" }, { ...user, company: { status: "INACTIVE" } }]) assert.equal(sessionIsCurrent(token, changed), false);
  assert.equal(sessionIsCurrent({ role: "ADMIN" }, user), false);
  assert.throws(() => tenantId({ role: "PLATFORM_ADMIN", companyId: null }));
  assert.throws(() => tenantId({ role: "ADMIN", companyId: null }));
  assert.equal(dashboardPath("PLATFORM_ADMIN"), "/platform/companies");
});
test("passwords reject defaults and bcrypt truncation", () => {
  assert.equal(passwordSchema.safeParse("admin123").success, false);
  assert.equal(passwordSchema.safeParse("a sufficiently long passphrase").success, true);
  assert.equal(passwordSchema.safeParse("ä".repeat(37)).success, false);
});
test("manual entries reject impossible dates, clock times and excessive breaks", () => {
  const entry = { workDate: "2026-09-05", startTime: "22:00", endTime: "02:00", breakMinutes: 30 };
  assert.equal(employeeTimeEntrySchema.safeParse(entry).success, true);
  for (const change of [{ workDate: "2026-02-30" }, { startTime: "99:99" }, { endTime: "22:00" }, { breakMinutes: 300 }, { breakMinutes: 0.5 }]) {
    assert.equal(employeeTimeEntrySchema.safeParse({ ...entry, ...change }).success, false);
  }
});
test("Berlin dates and elapsed timestamps survive midnight and DST", () => {
  assert.equal(businessDate(new Date("2026-09-05T22:30:00Z")).toISOString(), "2026-09-06T00:00:00.000Z");
  assert.equal(businessTime(new Date("2026-09-05T22:30:00Z")), "00:30");
  assert.equal(elapsedMinutes("2026-03-29T00:30:00Z", "2026-03-29T01:30:00Z"), 60);
  assert.equal(elapsedMinutes("2026-10-25T00:30:00Z", "2026-10-25T01:30:00Z"), 60);
  const entry = computeTimeEntryFromTimer([
    { segmentOrder: 1, startTime: "01:30", endTime: "03:30", durationMinutes: 60, createdAt: "2026-03-29T00:30:00Z", endedAt: "2026-03-29T01:30:00Z" },
    { segmentOrder: 2, startTime: "04:00", endTime: "05:00", durationMinutes: 60, createdAt: "2026-03-29T02:00:00Z", endedAt: "2026-03-29T03:00:00Z" },
  ], "05:00");
  assert.equal(entry.totalHours, 2);
  assert.equal(entry.breakMinutes, 30);
});
test("MFA encryption authenticates data; TOTP rejects invalid codes", () => {
  process.env.AUTH_SECRET = "test-only-secret-with-at-least-32-characters";
  const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
  const encrypted = encryptMfa(secret);
  assert.equal(decryptMfa(encrypted), secret);
  const parts = encrypted.split("."); parts[1] = Buffer.alloc(16).toString("base64url");
  assert.throws(() => decryptMfa(parts.join(".")));
  assert.equal(createTotp(secret).generate({ timestamp: 59000 }), "287082");
  assert.equal(validMfaStep(secret, "287082", 59000), 1);
  assert.equal(validMfaStep(secret, "abcdef", 59000), null);
});
test("production startup refuses HTTP, placeholder secrets, and demo seeds", () => {
  const env = { AUTH_URL: "https://time-system.zetac.de", AUTH_SECRET: "random-test-secret-of-more-than-32-characters", DATABASE_URL: "postgresql://user:password@db:5432/zeittrack" };
  assert.doesNotThrow(() => validateProductionEnv(env));
  for (const change of [{ AUTH_URL: "http://time-system.zetac.de" }, { AUTH_SECRET: "short" }, { RUN_SEED: "true" }]) assert.throws(() => validateProductionEnv({ ...env, ...change }));
});

test("production demo reset and non-interactive admin creation fail before connecting", () => {
  const seed = spawnSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "prisma/seed.ts"], {
    env: { ...process.env, NODE_ENV: "production", ALLOW_DEMO_RESET: "true", DATABASE_URL: "postgresql://invalid:invalid@127.0.0.1:1/invalid" }, encoding: "utf8", windowsHide: true,
  });
  assert.notEqual(seed.status, 0);
  assert.match(seed.stderr, /Demo reset is allowed only/);
  const admin = spawnSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "scripts/platform-admin.ts"], { encoding: "utf8", windowsHide: true });
  assert.notEqual(admin.status, 0);
  assert.ok(!admin.stdout.includes("Setup key"));
});
