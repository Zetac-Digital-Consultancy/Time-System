# Host Deployment TODO — ZeitTrack

Handoff checklist for the agent running **on the Linux host**. Goal: get the
ZeitTrack app (Next.js + PostgreSQL) running in Docker, healthy, and reachable.

**Stack:** Next.js 16 (standalone) · Prisma 7 (pg driver-adapter) · PostgreSQL 17 · NextAuth v5
**Deployment model:** `docker compose` with 3 services — `db`, `migrate` (one-shot schema sync), `app`.
**Working directory:** the repo root that contains `Dockerfile`, `docker-compose.yml`, `.env.example`.

> ⚠️ The Docker image has **not** been build-tested yet (no daemon was available where it was authored). Watch the build logs in Phase 3 — see Troubleshooting if `next build` fails or the Prisma client/WASM isn't found at runtime.

---

## Phase 0 — Prerequisites

- [ ] Confirm OS + arch: `uname -a` (image is multi-arch via node:22-bookworm-slim; works on amd64/arm64).
- [ ] Install **Docker Engine + Compose plugin** if missing:
  - [ ] `docker --version` and `docker compose version` both succeed.
  - [ ] If not installed: `curl -fsSL https://get.docker.com | sh` (Debian/Ubuntu), then enable: `sudo systemctl enable --now docker`.
- [ ] Ensure the deploy user can run docker (`docker ps` works without sudo, or use sudo consistently).
- [ ] `git` available if pulling the code via git.

## Phase 1 — Get the code on the host

- [ ] Clone or copy the repo to the host, e.g. `/opt/zeittrack`.
- [ ] `cd` into the directory that contains `docker-compose.yml`.
- [ ] Confirm these files exist: `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `.env.example`, `package.json`, `prisma/schema.prisma`.

## Phase 2 — Configure environment (`.env`)

- [ ] `cp .env.example .env`
- [ ] Generate a real auth secret: `openssl rand -base64 32` → put it in `AUTH_SECRET`.
- [ ] Set a strong `POSTGRES_PASSWORD`.
- [ ] **Make `DATABASE_URL` consistent with the Postgres vars.** Host MUST stay `db` (the compose service name), and user/password/db must match `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB`. Example:
  ```
  POSTGRES_USER=zeittrack
  POSTGRES_PASSWORD=<the-strong-password>
  POSTGRES_DB=zeittrack
  DATABASE_URL=postgresql://zeittrack:<the-strong-password>@db:5432/zeittrack?schema=public
  ```
- [ ] Set `AUTH_URL` and `NEXTAUTH_URL` to the **public URL** users will hit (e.g. `https://zeittrack.example.com`). If serving plain HTTP on an IP for now, use `http://<host-ip>:<APP_PORT>`.
- [ ] Set `APP_PORT` (host port to publish; default `3000`). If a reverse proxy will sit in front, bind to localhost only — see Phase 6.
- [ ] **First run only:** set `RUN_SEED=true` to load demo data (admin + employees). Leave `false` if the DB should start empty.
- [ ] Double-check `.env` is NOT committed (`.gitignore` already ignores it).

## Phase 3 — Build & start

- [ ] Build and launch: `docker compose up -d --build`
- [ ] Watch the build; if it fails, capture the error (see Troubleshooting).
- [ ] Confirm the `migrate` service ran to completion (exit 0):
  - [ ] `docker compose logs migrate` → should show Prisma `db push` succeeded (and seed output if `RUN_SEED=true`).
- [ ] Confirm `app` and `db` are up: `docker compose ps` (state `running`/`healthy`).

## Phase 4 — Post-seed cleanup

- [ ] If you set `RUN_SEED=true`: set it back to `RUN_SEED=false` in `.env` now.
  > The seed is **destructive** (it wipes all rows before inserting). Leaving it `true` would re-wipe data on the next `up`.

## Phase 5 — Verify

- [ ] Health check returns ok: `curl -fsS http://localhost:${APP_PORT:-3000}/api/health` → `{"status":"ok","db":"up"}`
- [ ] App responds: `curl -I http://localhost:${APP_PORT:-3000}/login` → `200`.
- [ ] Container health: `docker compose ps` shows `app` as `healthy`.
- [ ] If seeded, test login at the app URL:
  - Admin: `admin@bauunternehmen.de` / `admin123`
  - Employee: `max.mueller@bauunternehmen.de` / `mitarbeiter123`
  - [ ] **Change/remove these demo credentials before real use** (they are public defaults).

## Phase 6 — Production hardening (recommended)

- [ ] **TLS + reverse proxy.** Put nginx / Caddy / Traefik in front; terminate HTTPS; proxy to the app container.
  - [ ] Then bind the app to localhost only: in `docker-compose.yml` change the `app` port mapping to `"127.0.0.1:${APP_PORT:-3000}:3000"`, or join app + proxy on a shared network and drop the published port entirely.
  - [ ] Ensure `AUTH_URL`/`NEXTAUTH_URL` match the HTTPS domain exactly (auth callbacks depend on it).
- [ ] **Firewall:** allow 80/443; do NOT expose 5432 (Postgres) or the raw app port publicly. The compose file keeps Postgres internal by default (don't uncomment its `ports`).
- [ ] **Backups:** schedule `docker compose exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup-$(date +%F).sql` (data persists in the `db-data` volume).
- [ ] **Restart policy:** already `unless-stopped` for `db`/`app`. Confirm Docker starts on boot: `sudo systemctl is-enabled docker`.
- [ ] **Updates / redeploys:** `git pull` (or copy new code) → `docker compose up -d --build`. The `migrate` service re-applies schema changes idempotently each time.

---

## Operations cheat-sheet

```bash
docker compose ps                 # status
docker compose logs -f app        # follow app logs
docker compose logs migrate       # schema/seed result
docker compose restart app        # restart just the app
docker compose down               # stop (keeps data volume)
docker compose down -v            # stop AND delete the DB volume (data loss!)
```

## Troubleshooting

- **`next build` fails during image build** — read the error in the build output. Common causes: TypeScript/ESLint errors (this repo runs lint in CI, not in `next build`), or an out-of-memory build on a small host (give the host ≥2 GB RAM or add swap).
- **App starts but `/api/health` returns `db: down` / Prisma errors** — usually `DATABASE_URL` mismatch (host must be `db`, password must match `POSTGRES_PASSWORD`), or the `migrate` job didn't run. Check `docker compose logs migrate` and `docker compose logs app`.
- **Prisma client / WASM not found at runtime** — the standalone image relies on `outputFileTracingIncludes` in `next.config.ts` to copy `src/generated/prisma/**`. If missing at runtime, rebuild with `--no-cache`: `docker compose build --no-cache app`.
- **`migrate` exits non-zero with "relation already exists" or migration errors** — this project intentionally uses `prisma db push` (not `migrate deploy`) because the migration history has no baseline. Do not switch to `migrate deploy` without first generating a baseline migration.
- **Auth redirect loops / "untrusted host"** — set `AUTH_URL`/`NEXTAUTH_URL` to the exact public origin; `trustHost` is already enabled in `auth.config.ts`.
- **Port already in use** — change `APP_PORT` in `.env`.

## Key facts for the host agent

- Schema is created/synced via **`prisma db push`** in the one-shot `migrate` service — NOT `prisma migrate deploy`.
- The Prisma client is generated at **build time** (it's git-ignored); no manual `prisma generate` needed on the host.
- The app runs as a **non-root** user inside the container and writes nothing to disk (PDF/Excel exports are in-memory) — no app volumes required.
- All configuration is via environment variables in `.env`; there are no hardcoded paths or secrets in the code.
