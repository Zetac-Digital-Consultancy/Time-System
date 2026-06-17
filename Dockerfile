# syntax=docker/dockerfile:1

# ZeitTrack — production image for Linux hosts.
# Multi-stage build:
#   deps     -> install all deps + generate the Prisma client
#   builder  -> produce the Next.js standalone server bundle
#   runner   -> minimal runtime that serves the app (default target)
#   migrator -> one-shot image used to sync the DB schema (+ optional seed)

ARG NODE_VERSION=22

# ---------------------------------------------------------------------------
# deps: install dependencies and generate the Prisma client.
# The Prisma schema + config are copied first because `npm ci` runs the
# `postinstall` script (`prisma generate`), which needs them.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

# ---------------------------------------------------------------------------
# builder: build the Next.js app (standalone output).
# ---------------------------------------------------------------------------
FROM deps AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Build-time placeholder only: Next.js imports route modules to collect page
# data, and src/lib/prisma.ts instantiates the client at import time (throws if
# DATABASE_URL is unset). No real DB connection is made during the build; the
# real DATABASE_URL is injected at runtime via the container environment.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
COPY . .
RUN npm run build

# ---------------------------------------------------------------------------
# runner: lean runtime image. Runs the standalone server as a non-root user.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

# Standalone server + static assets + public files.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

# ---------------------------------------------------------------------------
# migrator: one-shot container that pushes the Prisma schema to the database
# and (optionally) seeds demo data. Reuses `deps`, which already contains the
# Prisma CLI, tsx, and the generated client.
#
# NOTE: this project's migration history is incomplete (no baseline), so we
# use `prisma db push` to create/sync the schema directly from schema.prisma
# instead of `prisma migrate deploy`.
# Set RUN_SEED=true to (re)load demo data — this is DESTRUCTIVE (seed wipes
# existing rows first).
# ---------------------------------------------------------------------------
FROM deps AS migrator
WORKDIR /app
ENV NODE_ENV=production
CMD ["sh", "-c", "npx prisma db push && if [ \"$RUN_SEED\" = \"true\" ]; then npx tsx prisma/seed.ts; fi"]
