type AuthLogContext = Record<string, unknown>;

export function logAuthEvent(event: string, context: AuthLogContext = {}) {
  if (process.env.NODE_ENV === "production") {
    console.info(`[auth] ${event}`, context);
    return;
  }

  console.info(`[auth] ${event}`, context);
}

export function logAuthError(event: string, error: unknown, context: AuthLogContext = {}) {
  console.error(`[auth] ${event}`, {
    ...context,
    error: error instanceof Error ? error.message : String(error),
  });
}
