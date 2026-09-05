import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import bcrypt from "bcryptjs";
import { Workbook } from "exceljs";
import { encryptMfa, createTotp } from "../src/lib/mfa";

const migrations = readdirSync("prisma/migrations").filter(p => /^\d/.test(p)).sort()
  .map(p => readFileSync(`prisma/migrations/${p}/migration.sql`, "utf8"));
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function freePort() {
  const server = createServer();
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  await new Promise<void>(resolve => server.close(() => resolve()));
  return port;
}

test("migration preserves existing records and disables demo access", async () => {
  const db = await PGlite.create();
  try {
    for (const sql of migrations.slice(0, 4)) await db.exec(sql);
    await db.exec("INSERT INTO users(id,name,email,password,role) VALUES ('old','Existing Admin','admin@bauunternehmen.de','old-hash','ADMIN'); INSERT INTO baustellen(id,name) VALUES ('old-site','Existing Site'); INSERT INTO time_entries(id,user_id,work_date,start_time,end_time,total_hours,baustelle_id) VALUES ('old-entry','old','2026-09-01','08:00','16:00',8,'old-site');");
    for (const sql of migrations.slice(4)) await db.exec(sql);
    assert.equal((await db.query<{ status: string }>("SELECT status FROM companies WHERE id='legacy-company'")).rows[0].status, "INACTIVE");
    assert.equal((await db.query<{ status: string }>("SELECT status FROM users WHERE id='old'")).rows[0].status, "INACTIVE");
    assert.equal((await db.query<{ n: number }>("SELECT count(*)::int AS n FROM time_entries")).rows[0].n, 1);
  } finally { await db.close(); }
});

test("real HTTP auth, tenant isolation, account lifecycle and timers", { timeout: 240000 }, async t => {
  const db = await PGlite.create();
  let app: ChildProcess | undefined;
  let socket: PGLiteSocketServer | undefined;
  let logs = "";
  const secret = "integration-only-secret-never-used-in-production";
  const mfaKey = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
  process.env.AUTH_SECRET = secret;
  try {
    socket = new PGLiteSocketServer({ db, port: 0, host: "127.0.0.1", maxConnections: 30 });
    await socket.start();
    const databaseUrl = `postgresql://postgres:postgres@${socket.getServerConn()}/postgres`;
    const migrationResult = await new Promise<{ code: number | null; output: string }>(resolve => {
      const migration = spawn(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], {
        env: { ...process.env, DATABASE_URL: databaseUrl }, windowsHide: true,
      });
      let output = "";
      migration.stdout.on("data", chunk => { output += chunk; });
      migration.stderr.on("data", chunk => { output += chunk; });
      migration.on("exit", code => resolve({ code, output }));
    });
    assert.equal(migrationResult.code, 0, migrationResult.output);
    const password = "integration-only password 123";
    const hash = await bcrypt.hash(password, 4);
    await db.exec("INSERT INTO companies(id,name) VALUES ('a','Company A'),('b','Company B');");
    for (const [id, role, company] of [["aa", "ADMIN", "a"], ["ae", "EMPLOYEE", "a"], ["ab", "EMPLOYEE", "a"], ["ba", "ADMIN", "b"], ["be", "EMPLOYEE", "b"]]) {
      await db.query("INSERT INTO users(id,name,email,password,role,company_id) VALUES ($1,$1,$2,$3,$4,$5)", [id, `${id}@test.invalid`, hash, role, company]);
    }
    await db.query("INSERT INTO users(id,name,email,password,role,mfa_secret) VALUES ('platform','Platform','platform@test.invalid',$1,'PLATFORM_ADMIN',$2)", [hash, encryptMfa(mfaKey)]);
    await db.exec("INSERT INTO baustellen(id,name,company_id) VALUES ('as','Site A','a'),('bs','PRIVATE SITE B','b'); INSERT INTO time_entries(id,user_id,work_date,start_time,end_time,total_hours,baustelle_id,notes) VALUES ('at','ae','2026-09-05','08:00','16:00',8,'as','A entry'),('bt','be','2026-09-05','08:00','16:00',8,'bs','PRIVATE B'); INSERT INTO work_timers(id,user_id,work_date,status,updated_at) VALUES ('b-timer','be','2026-09-05','STOPPED',now()); INSERT INTO notifications(id,user_id,title,message) VALUES ('bn','be','PRIVATE B','PRIVATE B'); INSERT INTO audit_logs(id,admin_id,action,entity_type,entity_id,details) VALUES ('bl','ba','CREATE','Test','bt','PRIVATE B');");
    const port = await freePort();
    const base = `http://127.0.0.1:${port}`;
    app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", String(port)], {
      env: { ...process.env, NODE_ENV: "production", AUTH_URL: base, AUTH_SECRET: secret, DATABASE_URL: `postgresql://postgres:postgres@${socket.getServerConn()}/postgres`, NEXT_TELEMETRY_DISABLED: "1" },
      stdio: ["ignore", "pipe", "pipe"], windowsHide: true,
    });
    app.stdout?.on("data", chunk => { logs = (logs + chunk).slice(-16000); });
    app.stderr?.on("data", chunk => { logs = (logs + chunk).slice(-16000); });
    let ready = false;
    for (let i = 0; i < 100; i++) {
      try { if ((await fetch(base + "/api/health", { signal: AbortSignal.timeout(3000) })).ok) { ready = true; break; } } catch {}
      if (app.exitCode !== null) break;
      await wait(300);
    }
    assert.ok(ready, "Server did not start: " + logs);
    async function login(email: string, otp = "", pass = password) {
      const csrf = await fetch(base + "/api/auth/csrf");
      const cookies = csrf.headers.getSetCookie().map(c => c.split(";")[0]);
      const { csrfToken } = await csrf.json();
      const res = await fetch(base + "/api/auth/callback/credentials", { method: "POST", redirect: "manual",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookies.join("; "), "X-Auth-Return-Redirect": "1" },
        body: new URLSearchParams({ csrfToken, email, password: pass, otp }),
      });
      return [...cookies, ...res.headers.getSetCookie().map(c => c.split(";")[0])].join("; ");
    }
    async function request(cookie: string, path: string, method = "GET", body?: object) {
      return fetch(base + path, { method, redirect: "manual", headers: { Cookie: cookie, "Content-Type": "application/json", Origin: base }, body: body ? JSON.stringify(body) : undefined });
    }
    const admin = await login("aa@test.invalid");
    const employee = await login("ae@test.invalid");
    const otp = createTotp(mfaKey).generate();
    const platform = await login("platform@test.invalid", otp);

    await t.test("company lists, dashboards and exports never disclose company B", async () => {
      for (const path of ["/api/users", "/api/baustellen", "/api/time-entries", "/api/work-timers", "/api/audit-logs", "/api/dashboard/admin"]) {
        const res = await request(admin, path);
        assert.equal(res.status, 200, path + " " + await res.clone().text());
        const text = await res.text();
        assert.ok(!text.includes("PRIVATE") && !text.includes("be@test.invalid") && !text.includes("ba@test.invalid"), path);
      }
      const excel = await request(admin, "/api/reports/export?format=excel&userId=be");
      assert.equal(excel.status, 200);
      const workbook = new Workbook();
      await workbook.xlsx.load(await excel.arrayBuffer());
      assert.equal(workbook.worksheets[0].rowCount, 1);
      const pdf = await request(admin, "/api/reports/export?format=pdf");
      assert.equal(pdf.status, 200);
      assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0, 4).toString(), "%PDF");
    });
    await t.test("foreign IDs cannot be read or assigned", async () => {
      for (const path of ["/api/time-entries/bt", "/api/work-timers/b-timer", "/api/users/be", "/api/baustellen/bs"]) assert.equal((await request(admin, path)).status, 404, path);
      assert.equal((await request(admin, "/api/time-entries/at", "PATCH", { baustelleId: "bs" })).status, 404);
      assert.equal((await request(admin, "/api/time-entries/bt", "DELETE")).status, 404);
      assert.equal((await request(admin, "/api/users/be", "PATCH", { name: "Changed", email: "changed@test.invalid", status: "INACTIVE" })).status, 404);
      assert.equal((await request(admin, "/api/baustellen/bs", "PATCH", { name: "Changed" })).status, 404);
      assert.equal((await request(admin, "/api/baustellen/bs", "DELETE")).status, 404);
      assert.equal((await request(employee, "/api/notifications/bn", "PATCH", {})).status, 404);
      assert.equal((await request(employee, "/api/users")).status, 403);
      const crossOrigin = await fetch(base + "/api/time-entries/at", { method: "DELETE", headers: { Cookie: admin, Origin: "https://untrusted.invalid" } });
      assert.equal(crossOrigin.status, 403);
      await assert.rejects(db.query("UPDATE time_entries SET baustelle_id='bs' WHERE id='at'"));
      await assert.rejects(db.query("UPDATE users SET company_id='b' WHERE id='ae'"));
    });
    await t.test("platform access requires MFA and excludes company records", async () => {
      assert.equal((await request(platform, "/api/platform/companies")).status, 200);
      assert.equal((await request(platform, "/api/time-entries")).status, 403);
      assert.equal((await request(admin, "/api/platform/companies")).status, 403);
      const missing = await login("platform@test.invalid");
      assert.equal((await request(missing, "/api/platform/companies")).status, 401);
      const reused = await login("platform@test.invalid", otp);
      assert.equal((await request(reused, "/api/platform/companies")).status, 401);
    });
    await t.test("one-time activation links create usable company admin access", async () => {
      const created = await request(platform, "/api/platform/companies", "POST", { name: "Company C", adminName: "Admin C", email: "c@test.invalid" });
      assert.equal(created.status, 201, await created.clone().text());
      const { activationUrl } = await created.json();
      const token = new URL(activationUrl).hash.slice(1);
      const body = { token, password };
      assert.equal((await request("", "/api/account/activate", "POST", body)).status, 200);
      assert.equal((await request("", "/api/account/activate", "POST", body)).status, 400);
      assert.equal((await request(await login("c@test.invalid"), "/api/users")).status, 200);
    });
    await t.test("overnight timer can be paused, resumed and stopped", async () => {
      assert.equal((await request(employee, "/api/work-timer", "POST", { action: "start" })).status, 200);
      const active = (await db.query<{ id: string }>("SELECT id FROM work_timers WHERE user_id='ae' AND status='RUNNING'")).rows[0];
      await db.query("UPDATE work_timers SET work_date='2026-09-04' WHERE id=$1", [active.id]);
      await db.query("UPDATE timer_segments SET created_at=$2 WHERE work_timer_id=$1", [active.id, new Date(Date.now() - 90 * 60000).toISOString()]);
      assert.equal((await request(employee, "/api/work-timer", "POST", { action: "start" })).status, 400);
      assert.equal((await request(employee, "/api/work-timer", "POST", { action: "pause" })).status, 200);
      assert.equal((await request(employee, "/api/work-timer", "POST", { action: "resume" })).status, 200);
      assert.equal((await request(employee, "/api/work-timer", "POST", { action: "stop" })).status, 200);
      assert.equal((await request(employee, "/api/work-timer", "POST", { action: "stop" })).status, 400);
      const entry = (await db.query<{ day: string; total_hours: number }>("SELECT work_date::text AS day,total_hours FROM time_entries WHERE user_id='ae' AND source='TIMER'")).rows[0];
      assert.equal(entry.day, "2026-09-04"); assert.ok(entry.total_hours >= 1.5, JSON.stringify(entry));
    });
    await t.test("password change and deactivation revoke existing sessions", async () => {
      const otherEmployee = await login("ab@test.invalid");
      const change = await request(employee, "/api/account/password", "POST", { currentPassword: password, password: "a different secure password 123" });
      assert.equal(change.status, 200);
      assert.equal((await request(employee, "/api/time-entries")).status, 401);
      const updated = await request(admin, "/api/users/ab", "PATCH", { name: "Employee AB", email: "ab@test.invalid", status: "INACTIVE" });
      assert.equal(updated.status, 200);
      assert.equal((await request(otherEmployee, "/api/time-entries")).status, 401);
      assert.equal((await request(await login("ab@test.invalid"), "/api/time-entries")).status, 401);
      assert.equal((await request(platform, "/api/platform/companies/a", "PATCH", { status: "INACTIVE" })).status, 200);
      assert.equal((await request(admin, "/api/users")).status, 401);
    });
    await t.test("login throttling rejects a correct password after repeated failures", async () => {
      for (let i = 0; i < 10; i++) await login("ba@test.invalid", "", "incorrect");
      assert.equal((await request(await login("ba@test.invalid"), "/api/users")).status, 401);
    });
  } catch (error) { console.error(logs); throw error; }
  finally {
    if (app && app.exitCode === null) {
      app.kill();
      await Promise.race([new Promise(resolve => app!.once("exit", resolve)), wait(3000)]);
    }
    await socket?.stop();
    await db.close();
  }
});
