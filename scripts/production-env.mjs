export function validateProductionEnv(env) {
  for (const key of ["DATABASE_URL", "AUTH_SECRET", "AUTH_URL"]) {
    if (!env[key] || /change-me|replace-with|localhost|example\.com/.test(env[key])) throw new Error(`Set a real production ${key}`);
  }
  if (env.AUTH_SECRET.length < 32) throw new Error("AUTH_SECRET must contain at least 32 random characters");
  const url = new URL(env.AUTH_URL);
  if (url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash || url.username || url.password) throw new Error("AUTH_URL must be a public HTTPS origin");
  if (env.RUN_SEED === "true") throw new Error("Demo seeding is forbidden in production");
}
