# Host deployment handoff

Use [docs/PRODUCTION.md](docs/PRODUCTION.md) as the authoritative checklist.

The previous instructions to run demo seeding or `prisma db push` in production are obsolete.

- Back up and restore-test any existing database before migrating.
- Baseline an existing db-push database only after the legacy-schema drift check succeeds.
- Configure HTTPS, the shared reverse proxy, real secrets, backups and alerts.
- Build and start the production containers; confirm the migration job exits successfully.
- Create each platform admin using `scripts/platform-admin.ts` in a private terminal and enroll MFA.
- Review the suspended legacy company before enabling it; leave demo identities disabled.
- Create company administrators through one-time activation links.
- Run the release checks and two-company staging tests before onboarding employees.

Repository tests do not confirm live DNS, TLS, backup scheduling, email delivery, native PostgreSQL or Docker-host readiness.
