const origin = process.env.AUTH_URL;
if (!origin) throw new Error("AUTH_URL is required");
try {
  const response = await fetch(new URL("/api/health", origin), { signal: AbortSignal.timeout(10000) });
  const body = await response.json();
  if (!response.ok || body.status !== "ok" || body.db !== "up") throw new Error("unhealthy");
  console.log("ZeitTrack is healthy");
} catch {
  console.error("ZeitTrack health check failed");
  process.exitCode = 1;
}
