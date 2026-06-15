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

## Schnellstart

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
