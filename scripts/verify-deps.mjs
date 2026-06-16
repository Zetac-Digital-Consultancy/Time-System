#!/usr/bin/env node
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const requiredFiles = [
  "node_modules/oauth4webapi/build/index.js",
  "node_modules/next/dist/bin/next",
  "node_modules/@prisma/client/package.json",
];

const missing = requiredFiles.filter((file) => !existsSync(join(root, file)));

if (missing.length > 0) {
  console.error("Dependency install appears corrupted. Missing files:");
  for (const file of missing) {
    console.error(`  - ${file}`);
  }
  console.error("\nFix: rm -rf node_modules && npm install");
  process.exit(1);
}
