import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import pg from "pg";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.baustelle.deleteMany();
  await prisma.user.deleteMany();

  const adminPassword = await bcrypt.hash("admin123", 12);
  const employeePassword = await bcrypt.hash("mitarbeiter123", 12);

  const admin = await prisma.user.create({
    data: {
      name: "Hans Bauer",
      email: "admin@bauunternehmen.de",
      password: adminPassword,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  const employees = await Promise.all([
    prisma.user.create({
      data: {
        name: "Max Müller",
        email: "max.mueller@bauunternehmen.de",
        password: employeePassword,
        role: "EMPLOYEE",
        status: "ACTIVE",
      },
    }),
    prisma.user.create({
      data: {
        name: "Anna Schmidt",
        email: "anna.schmidt@bauunternehmen.de",
        password: employeePassword,
        role: "EMPLOYEE",
        status: "ACTIVE",
      },
    }),
    prisma.user.create({
      data: {
        name: "Thomas Weber",
        email: "thomas.weber@bauunternehmen.de",
        password: employeePassword,
        role: "EMPLOYEE",
        status: "ACTIVE",
      },
    }),
    prisma.user.create({
      data: {
        name: "Lisa Fischer",
        email: "lisa.fischer@bauunternehmen.de",
        password: employeePassword,
        role: "EMPLOYEE",
        status: "ACTIVE",
      },
    }),
    prisma.user.create({
      data: {
        name: "Michael Hoffmann",
        email: "michael.hoffmann@bauunternehmen.de",
        password: employeePassword,
        role: "EMPLOYEE",
        status: "ACTIVE",
      },
    }),
  ]);

  const baustellen = await Promise.all([
    prisma.baustelle.create({
      data: {
        name: "Wohnungsbau Berlin-Mitte",
        address: "Friedrichstraße 123, 10117 Berlin",
        description: "Neubau eines Wohnkomplexes mit 48 Einheiten",
      },
    }),
    prisma.baustelle.create({
      data: {
        name: "Bürogebäude München",
        address: "Leopoldstraße 45, 80802 München",
        description: "Sanierung und Erweiterung eines Bürogebäudes",
      },
    }),
    prisma.baustelle.create({
      data: {
        name: "Brückensanierung Hamburg",
        address: "Elbbrücke Nord, 20457 Hamburg",
        description: "Instandsetzung der nördlichen Elbbrücke",
      },
    }),
  ]);

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const timeEntries = [
    {
      userId: employees[0].id,
      workDate: today,
      startTime: "07:00",
      endTime: "16:30",
      breakMinutes: 30,
      totalHours: 9.0,
      baustelleId: baustellen[0].id,
      notes: "Fundamentarbeiten abgeschlossen",
      status: "PENDING" as const,
    },
    {
      userId: employees[0].id,
      workDate: yesterday,
      startTime: "07:30",
      endTime: "16:00",
      breakMinutes: 30,
      totalHours: 8.0,
      baustelleId: baustellen[0].id,
      status: "APPROVED" as const,
    },
    {
      userId: employees[1].id,
      workDate: today,
      startTime: "08:00",
      endTime: "17:00",
      breakMinutes: 45,
      totalHours: 8.25,
      baustelleId: baustellen[1].id,
      notes: "Elektroinstallation Etage 3",
      status: "PENDING" as const,
    },
    {
      userId: employees[1].id,
      workDate: yesterday,
      startTime: "08:00",
      endTime: "16:00",
      breakMinutes: 30,
      totalHours: 7.5,
      baustelleId: baustellen[1].id,
      status: "APPROVED" as const,
    },
    {
      userId: employees[2].id,
      workDate: today,
      startTime: "06:30",
      endTime: "15:30",
      breakMinutes: 30,
      totalHours: 8.5,
      baustelleId: baustellen[2].id,
      status: "PENDING" as const,
    },
    {
      userId: employees[3].id,
      workDate: twoDaysAgo,
      startTime: "08:00",
      endTime: "16:00",
      breakMinutes: 30,
      totalHours: 7.5,
      baustelleId: baustellen[0].id,
      status: "REJECTED" as const,
      notes: "Zeiten korrigieren – Pause nicht eingetragen",
    },
    {
      userId: employees[4].id,
      workDate: yesterday,
      startTime: "07:00",
      endTime: "18:00",
      breakMinutes: 60,
      totalHours: 10.0,
      baustelleId: baustellen[2].id,
      status: "APPROVED" as const,
    },
  ];

  for (const entry of timeEntries) {
    await prisma.timeEntry.create({ data: entry });
  }

  await prisma.notification.create({
    data: {
      userId: employees[3].id,
      title: "Zeiteintrag Abgelehnt",
      message: `Ihr Zeiteintrag vom ${twoDaysAgo.toLocaleDateString("de-DE")} wurde abgelehnt. Bitte korrigieren Sie die Zeiten.`,
    },
  });

  await prisma.auditLog.create({
    data: {
      adminId: admin.id,
      action: "REJECT",
      entityType: "TimeEntry",
      entityId: "seed-entry",
      details: "Zeiteintrag von Lisa Fischer abgelehnt – Pause fehlte",
    },
  });

  console.log("Seed completed:");
  console.log(`  Admin: ${admin.email} / admin123`);
  console.log(`  Employees: 5 (password: mitarbeiter123)`);
  console.log(`  Baustellen: ${baustellen.length}`);
  console.log(`  Time entries: ${timeEntries.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
