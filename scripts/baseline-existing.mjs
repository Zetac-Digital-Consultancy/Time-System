import "dotenv/config";
import { spawnSync } from "node:child_process";

const cli = "node_modules/prisma/build/index.js";
function prisma(args) {
  const result = spawnSync(process.execPath, [cli, ...args], { stdio: "inherit", env: process.env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
// Read-only drift check must succeed before any migration is marked applied.
prisma(["migrate", "diff", "--from-config-datasource", "--to-schema", "prisma/legacy-schema.prisma", "--exit-code"]);
for (const migration of [
  "20250614000000_initial", "20250615120000_remove_overtime_hours",
  "20250616120000_add_work_timer", "20250616140000_allow_multiple_timer_sessions_per_day",
]) prisma(["migrate", "resolve", "--applied", migration]);
console.log("Legacy baseline recorded. Now run prisma migrate deploy.");
