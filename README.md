# ZeitTrack

Moderne SaaS-Webanwendung für Zeiterfassung und Mitarbeiterverwaltung im Bauwesen.

## Tech Stack

- **Next.js 15+** (App Router)
- **TypeScript**
- **Tailwind CSS** + shadcn/ui
- **Prisma ORM** + PostgreSQL
- **NextAuth.js** (Auth.js v5)
- **React Hook Form** + Zod
- **PDF/Excel Export** (jsPDF, xlsx)

## Features

### Mitarbeiter
- Persönliches Dashboard mit Tages-, Wochen- und Monatsübersicht
- Manuelle Zeiterfassung (Datum, Start/Ende, Pause, Notizen)
- Nur eigene Einträge einsehen und bearbeiten (bis zur Freigabe)
- Benachrichtigungen bei Genehmigung/Ablehnung

### Administrator
- Mitarbeiterverwaltung (CRUD, Aktivieren/Deaktivieren)
- Alle Zeiteinträge einsehen, filtern, bearbeiten
- Baustellen zuweisen
- Freigabe-Workflow (Genehmigen/Ablehnen)
- Dashboard mit Kennzahlen
- PDF- und Excel-Export
- Audit-Protokoll

## Deployment (Docker, Linux-Host)

Die App läuft als Container-Stack (Next.js + PostgreSQL) und ist für jeden
Linux-Host mit Docker geeignet. Benötigt: Docker Engine + Compose-Plugin.

```bash
# 1. Umgebungsvariablen anlegen und Secrets setzen
cp .env.example .env
nano .env                      # POSTGRES_PASSWORD, AUTH_SECRET, AUTH_URL ...

# AUTH_SECRET erzeugen:
openssl rand -base64 32

# 2. Erststart MIT Demo-Daten: in .env RUN_SEED=true setzen, dann:
docker compose up -d --build

# 3. Danach RUN_SEED=false zurücksetzen (Seed löscht sonst alle Daten neu).
```

Der Stack besteht aus drei Services:

| Service   | Rolle                                                                 |
|-----------|-----------------------------------------------------------------------|
| `db`      | PostgreSQL 17 mit persistentem Volume `db-data`                       |
| `migrate` | Einmal-Job: synchronisiert das Schema (`prisma db push`), optional Seed |
| `app`     | Next.js (Standalone-Build), läuft als Nicht-Root-User, Port 3000      |

Die App ist anschließend unter `http://<host>:${APP_PORT}` (Standard 3000)
erreichbar. Für Produktion einen Reverse-Proxy (nginx/Caddy/Traefik) mit
TLS davorschalten und `AUTH_URL`/`NEXTAUTH_URL` auf die öffentliche Domain
setzen.

**Hinweise:**
- Healthcheck-Endpoint: `GET /api/health` (prüft auch die DB-Verbindung).
- Schema-Änderungen werden bei jedem `up` über den `migrate`-Service
  idempotent angewandt (`prisma db push`). Die Migrationshistorie ist
  bewusst nicht maßgeblich.
- Datenbank-Backup: `docker compose exec db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup.sql`

```bash
# Logs ansehen / Stack stoppen
docker compose logs -f app
docker compose down            # Container stoppen (Daten bleiben im Volume)
docker compose down -v         # inkl. Datenbank-Volume löschen
```

## Lokale Entwicklung

### 1. Abhängigkeiten installieren

```bash
npm install
```

### 2. Umgebungsvariablen

```bash
cp .env.example .env
```

Bearbeiten Sie `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/zeittrack?schema=public"
AUTH_SECRET="ihr-sicheres-geheimnis-min-32-zeichen"
NEXTAUTH_URL="http://localhost:3000"
```

`AUTH_SECRET` generieren:

```bash
openssl rand -base64 32
```

### 3. Datenbank einrichten

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### 4. Entwicklungsserver starten

```bash
npm run dev
```

Öffnen Sie [http://localhost:3000](http://localhost:3000)

## Demo-Zugangsdaten

| Rolle       | E-Mail                          | Passwort        |
|-------------|----------------------------------|-----------------|
| Admin       | admin@bauunternehmen.de          | admin123        |
| Mitarbeiter | max.mueller@bauunternehmen.de    | mitarbeiter123  |

## Projektstruktur

```
src/
├── app/
│   ├── (dashboard)/          # Geschützte Bereiche mit Sidebar
│   │   ├── admin/            # Admin-Seiten
│   │   └── employee/         # Mitarbeiter-Seiten
│   ├── api/                  # REST API Routes
│   ├── login/                # Login-Seite
│   └── layout.tsx
├── components/
│   ├── ui/                   # shadcn/ui Komponenten
│   ├── forms/                # Formulare
│   └── layout/               # Sidebar, Navigation
├── lib/
│   ├── auth.ts               # (via src/auth.ts)
│   ├── prisma.ts             # Datenbank-Client
│   ├── validations.ts        # Zod-Schemas
│   └── time-utils.ts         # Stundenberechnung
└── generated/prisma/         # Prisma Client
prisma/
├── schema.prisma
└── seed.ts
```

## Sicherheit

- JWT-basierte Sessions (NextAuth)
- bcrypt Passwort-Hashing (12 Rounds)
- Rollenbasierte Zugriffskontrolle (RBAC)
- Middleware-Schutz für Routen
- API-Autorisierung pro Endpunkt
- Eingabevalidierung mit Zod
- Mitarbeiter sehen nur eigene Daten

## Skripte

| Befehl              | Beschreibung                    |
|---------------------|---------------------------------|
| `npm run dev`       | Entwicklungsserver              |
| `npm run build`     | Produktions-Build               |
| `npm run db:migrate`| Datenbank-Migrationen           |
| `npm run db:seed`   | Demo-Daten laden                |
| `npm run db:studio` | Prisma Studio (DB-Browser)      |
