# ZeitTrack production deployment

## Access model

Platform admins belong to no company and must use password + TOTP. Each has an individual account. They can create/suspend companies and issue company-admin activation/recovery links. They cannot use company data APIs or view timesheets. Company admins and employees belong to exactly one company per account. Email addresses are globally unique. Multiple memberships and switching companies are not implemented.

Company data is scoped through the immutable user/company relationship; construction sites have a company ID. Timer segments/events inherit their timer's ownership. Notifications belong to a user and audit logs to their author. Database triggers reject cross-company site assignments and timer/entry ownership mismatches. Platform actions are audited separately from the company-visible log. Support impersonation is intentionally unavailable; any future support access requires a separate consent, expiry, and auditing design.

## Before touching an existing database

1. Back up the database and verify restoration into an isolated PostgreSQL database. Stop the old app during migration.
2. If this database was created with `prisma db push` and has no migration history, build the new migrator and baseline it:

```bash
docker compose build migrate
docker compose run --rm migrate node scripts/baseline-existing.mjs
```

The script first requires the database schema to match `prisma/legacy-schema.prisma`. It does not reset or delete records. If drift is detected, inspect and reconcile it before proceeding. If migration history already exists or the baseline was interrupted, inspect `prisma migrate status` and resolve only the missing historical entries after verifying the schema; do not reset the database or edit completed migrations.

3. Run `docker compose run --rm migrate`. New empty databases skip baselining and apply all migrations normally.

All existing records are assigned to `legacy-company`, initially **suspended**. Known demo accounts are disabled, and existing company users must change their passwords. Review this company's identity and records before enabling it. If its only administrator was the disabled demo administrator, enable the reviewed company, then use “Admin-Zugang anlegen” on its platform card to create a new individual administrator and activation link. Do not reactivate the public demo identity. Never delete real records merely to clean up demo data.

The migration preserves historical wall-clock durations. New and running timer segments use elapsed timestamps. Overnight shifts remain assigned to their start date, with Europe/Berlin as the business timezone. Review old records near timezone boundaries separately; no speculative corrections are made.

## Fresh deployment / normal upgrade

1. Copy `.env.example` to `.env`. Set strong database credentials and a random `AUTH_SECRET` (`openssl rand -base64 48`). Set `AUTH_URL=https://time-system.zetac.de`. URL-encode special characters in the database password inside `DATABASE_URL`.
2. Configure DNS, the external Docker `proxy` network, and the existing nginx-proxy/ACME service for that domain. It must terminate HTTPS, overwrite forwarded host/protocol headers, and redirect HTTP to HTTPS. The app and PostgreSQL ports are not published publicly. Configure an edge request/body-size limit and IP-based login throttling in addition to the app's shared per-account limit. Add HSTS once HTTPS is verified.
3. Run `docker compose up -d --build`. The migration job must exit successfully before the app starts. No production demo seeding is available. Startup rejects HTTP origins, placeholder secrets and missing configuration.
4. In a **private interactive terminal**, create your first platform administrator:

```bash
docker compose run --rm migrate npx tsx scripts/platform-admin.ts
```

The command asks for your name, email, hidden password, and authenticator enrollment. It never accepts a password on the command line, does not overwrite an existing account, and writes only the password hash and encrypted MFA key. Do not record/share the terminal's MFA enrollment key. Wait for the next authenticator code before the first login.

5. Sign in, create each company with its administrator's name/email, and securely deliver the one-time activation link. Links expire after 72 hours and are shown only in the response. No emails are sent automatically. Company admins create employees with individual temporary passphrases; employees must change them before accessing company APIs. Company admins can reset employee passwords in employee management. Company admins request a recovery link from the platform team, whose reason is audited.
6. Test both roles in two separate companies, exports, timers, session revocation, and the health endpoint. Confirm that suspending a company blocks all its users.

Platform emergency recovery requires server access:

```bash
docker compose run --rm migrate npx tsx scripts/platform-admin.ts --recover
```

Recovery replaces password and MFA enrollment and revokes sessions. Protect server/SSH access with MFA and restrict it to operators. Preserve `AUTH_SECRET` securely: changing it invalidates all sessions **and requires re-enrolling every platform admin's encrypted MFA key**. Use a restricted runtime database user in production; reserve DDL privileges for the migration operator. Configure PostgreSQL grants/default privileges according to your hosting setup.

## Backups and monitoring

Run `BACKUP_DIR=/var/backups/zeittrack bash scripts/backup.sh` daily using your host scheduler. The script creates a private custom-format dump and checks its archive listing. This is not a restore test. Copy backups to encrypted storage outside the server and set retention according to the company's data policy. Do not use the database Docker volume as the backup destination.

Restore into an isolated database with the matching PostgreSQL client, for example `pg_restore --no-owner --dbname="$RESTORE_DATABASE_URL" backup.dump`, then verify records and application login. Never point a restore drill at production. Keep pre-deploy backups; app rollback alone may be incompatible with migrated schemas.

Connect your monitoring provider to the public `/api/health` endpoint with alerts for failures and certificate expiry. `AUTH_URL=https://time-system.zetac.de node scripts/check-health.mjs` also returns a nonzero status on failure. Host scheduling, offsite storage and notification destinations must be configured by the operator; repository scripts do not configure those services automatically.

## Release verification

```bash
npm ci
npm run lint
npm run build
npm test
npm run typecheck
npm audit
```

Integration tests require the production build and start the app on loopback with an isolated PostgreSQL WASM database. They use no production database or credentials. They verify historical migration, real login/MFA, tenant isolation, activation links, exports, timer lifecycle, revocation and throttling. Also build/run the Docker image and test native PostgreSQL on staging: the WASM database does not replace host/container verification.

## Employee-data readiness

Before onboarding real employees, identify the controller/processor roles, processing purpose and lawful basis, give employees the relevant privacy information, sign appropriate processing agreements, and define access, retention, deletion and incident-response responsibilities. Include backups and logs in the retention policy. See `docs/DATA-PROTECTION.md` for the information the operator must supply. Do not claim compliance based only on deploying these technical controls.
