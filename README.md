# ZeitTrack

Zeiterfassung für Bauunternehmen mit getrennten Firmenzugängen.

- Plattform-Admins verwalten Firmen und Firmenadmins; Anmeldung mit Passwort und Authenticator-Code.
- Firmenadmins verwalten ausschließlich Mitarbeiter, Baustellen und Arbeitszeiten ihrer Firma.
- Mitarbeiter erfassen ihre eigenen Zeiten. Neue temporäre Passwörter müssen vor der ersten Nutzung geändert werden.
- Arbeits-Timer unterstützen Pausen und Schichten über Mitternacht. Geschäftszeitzone: Europe/Berlin.
- PDF-/Excel-Exporte und Audit-Protokolle sind firmenbezogen.

Technik: Next.js 16, React 19, Auth.js 5, Prisma 7, PostgreSQL, Tailwind CSS.

## Produktion

**Zuerst [docs/PRODUCTION.md](docs/PRODUCTION.md) lesen**, besonders bei einer bestehenden Datenbank. Der bisherige `db push`-Ablauf wurde durch versionierte Migrationen ersetzt. Bestehende Daten werden erhalten und zunächst einer gesperrten Firma zur Prüfung zugeordnet. Demo-Accounts werden deaktiviert.

```bash
cp .env.example .env
# Echte Secrets und HTTPS-Domain eintragen. Reverse Proxy bereitstellen.
docker compose up -d --build
docker compose run --rm migrate npx tsx scripts/platform-admin.ts
```

Der interaktive Befehl erstellt einen individuellen Plattform-Admin mit verborgen eingegebenem Passwort und MFA. Danach Firmen und Firmenadmins in der Plattformverwaltung anlegen. Es gibt keine festen Produktions-Zugangsdaten.

## Entwicklung

Node.js 22+, PostgreSQL und npm installieren. Eine separate Entwicklungsdatenbank verwenden; `DATABASE_URL`, `AUTH_SECRET` und `AUTH_URL=http://localhost:3000` entsprechend setzen.

```bash
npm ci
npm run db:deploy
npm run dev
```

Optionaler **destruktiver** Reset einer wegwerfbaren lokalen Demo-Datenbank:

```bash
NODE_ENV=development ALLOW_DEMO_RESET=true npm run db:seed
```

Dies ist in Produktion gesperrt. Demo-Zugangsdaten werden weder auf der Login-Seite noch in Produktionsanleitungen angezeigt.

## Prüfung

```bash
npm run lint
npm run build
npm test
npm run typecheck
npm audit
```

Die Integrationstests verwenden eine isolierte PostgreSQL-WASM-Datenbank und den zuvor gebauten Server auf Loopback. Sie prüfen unter anderem Firmentrennung, MFA, Session-Widerruf, Migrationen, Aktivierungslinks, Exporte und Timer.

Backups: `scripts/backup.sh`. Healthcheck: `/api/health` und `scripts/check-health.mjs`. Betreiberangaben für den Datenschutz: [docs/DATA-PROTECTION.md](docs/DATA-PROTECTION.md).
