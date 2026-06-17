import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: pg.Pool | undefined;
};

/** Timer models added after initial client creation — stale dev singletons lack these delegates. */
const REQUIRED_TIMER_DELEGATES = ["workTimer", "timerSegment", "timerEvent"] as const;

function isPrismaClientReady(client: PrismaClient): boolean {
  return REQUIRED_TIMER_DELEGATES.every((key) => {
    const delegate = (client as unknown as Record<string, unknown>)[key];
    return (
      delegate !== undefined &&
      typeof delegate === "object" &&
      typeof (delegate as { findUnique?: unknown }).findUnique === "function"
    );
  });
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const pool = globalForPrisma.pgPool ?? new pg.Pool({ connectionString });
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pgPool = pool;
  }

  const adapter = new PrismaPg(pool);

  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  if (!isPrismaClientReady(client)) {
    throw new Error(
      "Prisma client is missing timer models. Run `npx prisma generate` and restart the server."
    );
  }

  return client;
}

function getPrismaClient(): PrismaClient {
  const cached = globalForPrisma.prisma;
  if (cached && isPrismaClientReady(cached)) {
    return cached;
  }

  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

/**
 * Lazy Prisma singleton — defers client creation until the first query so the
 * Next.js process can start (and serve static/login shells) even when the DB is
 * temporarily unavailable. Stale dev singletons are recreated automatically.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
