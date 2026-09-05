# syntax=docker/dockerfile:1

# ZeitTrack — production image for Linux hosts.
# Multi-stage build:
#   deps     -> install all deps + generate the Prisma client
#   dev      -> development server with hot reload (source synced via syncer)
#   syncer   -> lightweight Alpine container that rsyncs ./src into a named
#               volume every second, bypassing VirtioFS EDEADLK on macOS
#   builder  -> produce the Next.js standalone server bundle
#   runner   -> minimal runtime that serves the app (default target)
#   migrator -> one-shot image used to sync the DB schema (+ optional seed)

ARG NODE_VERSION=22

# ---------------------------------------------------------------------------
# deps: install dependencies and generate the Prisma client.
<<<<<<< Updated upstream
#
# --ignore-scripts skips the postinstall hook (which calls verify-deps.mjs,
# a file not present in this minimal build context). prisma generate runs
# explicitly afterwards with a placeholder DATABASE_URL — the real one is
# injected at runtime via the container environment.
=======
# The Prisma schema + config and scripts are copied first because `npm ci`
# runs the `postinstall` script (`prisma generate && node
# scripts/verify-deps.mjs`), which needs them.
>>>>>>> Stashed changes
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ENV NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL="postgresql://build:build@localhost:5432/build"
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
<<<<<<< Updated upstream
RUN npm ci --ignore-scripts && npx prisma generate

# ---------------------------------------------------------------------------
# dev: development server with hot reload.
# Source is baked in at build time so the container starts without any
# bind-mount reads (VirtioFS on macOS Apple Silicon returns EDEADLK on
# concurrent file reads, crashing Turbopack/webpack at startup).
# Live reload is provided by Docker Compose Watch (develop.watch in the
# compose file), which uses Docker's internal transfer API — not VirtioFS.
# HOSTNAME=0.0.0.0 makes Next.js bind to all interfaces so it is reachable
# from the host browser via the published port.
# ---------------------------------------------------------------------------
FROM deps AS dev
ENV NODE_ENV=development \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
COPY src ./src
COPY public ./public
COPY next.config.ts tsconfig.json postcss.config.mjs ./
COPY scripts/dev-server.mjs ./scripts/
EXPOSE 3000
CMD ["npm", "run", "dev"]
=======
COPY scripts ./scripts
RUN npm ci
>>>>>>> Stashed changes

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
