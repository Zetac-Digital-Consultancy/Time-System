#!/usr/bin/env node
/**
 * Starts the Next.js dev server for this project only.
 * Stops a previous instance (via Next.js lockfile) to prevent duplicate-server errors.
 */
import { readFileSync, unlinkSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawn, execSync } from "child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const lockPath = join(root, ".next/dev/lock");
const port = process.env.PORT ?? "3000";
const hostname = process.env.HOSTNAME ?? "localhost";

function readLock() {
  if (!existsSync(lockPath)) return null;
  try {
    return JSON.parse(readFileSync(lockPath, "utf-8"));
  } catch {
    return null;
  }
}

function isRunning(pid) {
  if (!pid || typeof pid !== "number") return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getListenersOnPort(targetPort) {
  try {
    const output = execSync(`lsof -t -iTCP:${targetPort} -sTCP:LISTEN 2>/dev/null || true`, {
      encoding: "utf-8",
    });
    return output
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((value) => Number(value))
      .filter((pid) => Number.isInteger(pid) && pid > 0);
  } catch {
    return [];
  }
}

function isNextDevProcess(pid) {
  try {
    const command = execSync(`ps -p ${pid} -o command= 2>/dev/null || true`, {
      encoding: "utf-8",
    }).trim();
    return /next(\s+|-)dev|next\/dist\/bin\/next/.test(command);
  } catch {
    return false;
  }
}

async function terminatePid(pid, { label } = {}) {
  if (!isRunning(pid)) return;

  if (label) {
    console.log(label);
  }

  try {
    process.kill(pid, "SIGTERM");
  } catch {
    return;
  }

  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (!isRunning(pid)) return;
    await sleep(100);
  }

  if (isRunning(pid)) {
    try {
      process.kill(pid, "SIGKILL");
      await sleep(200);
    } catch {
      // Process already exited.
    }
  }
}

function removeStaleLock() {
  if (!existsSync(lockPath)) return;
  try {
    unlinkSync(lockPath);
  } catch {
    // Another process may be releasing the lock.
  }
}

async function stopDevServer() {
  const lock = readLock();
  let stopped = false;

  if (lock?.pid && isRunning(lock.pid)) {
    await terminatePid(lock.pid, {
      label: `Stopping existing Next.js dev server (PID ${lock.pid})...`,
    });
    stopped = true;
  } else if (lock?.pid) {
    console.log(`Removing stale dev server lock (PID ${lock.pid} is no longer running)...`);
  }

  removeStaleLock();

  const listeners = getListenersOnPort(port);
  for (const pid of listeners) {
    if (pid === process.pid) continue;
    if (!isNextDevProcess(pid)) continue;

    await terminatePid(pid, {
      label: `Freeing port ${port} from orphaned Next.js process (PID ${pid})...`,
    });
    stopped = true;
  }

  return stopped;
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: "inherit",
      env: process.env,
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${command} ${args.join(" ")} failed` +
            (code != null ? ` (exit ${code})` : "") +
            (signal ? ` (signal ${signal})` : "")
        )
      );
    });
  });
}

const mode = process.argv[2];

if (mode === "stop") {
  const stopped = await stopDevServer();
  console.log(stopped ? "Dev server stopped." : "No running dev server found.");
  process.exit(0);
}

await stopDevServer();
await run("npx", ["prisma", "generate"]);

const nextArgs = ["dev", "-p", port, "-H", hostname];
const next = spawn("npx", ["next", ...nextArgs], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

next.on("exit", (code) => {
  process.exit(code ?? 0);
});
