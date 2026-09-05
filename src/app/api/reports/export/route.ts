import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { formatDateDE } from "@/lib/utils";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  const { searchParams } = request.nextUrl;
  const format = searchParams.get("format") ?? "excel";

  const where: Prisma.TimeEntryWhereInput = { user: { companyId: authResult.user.companyId } };
  const userId = searchParams.get("userId");
  const baustelleId = searchParams.get("baustelleId");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  if (userId) where.userId = userId;
  if (baustelleId) where.baustelleId = baustelleId;
  if (dateFrom || dateTo) {
    where.workDate = {};
    if (dateFrom) where.workDate.gte = new Date(dateFrom);
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      where.workDate.lte = endDate;
    }
  }

  const entries = await prisma.timeEntry.findMany({
    where,
    include: {
      user: { select: { name: true, email: true } },
      baustelle: { select: { name: true } },
    },
    orderBy: [{ workDate: "desc" }, { user: { name: "asc" } }],
  });

  const rows = entries.map((e) => ({
    Mitarbeiter: e.user.name,
    Email: e.user.email,
    Datum: formatDateDE(e.workDate),
    Start: e.startTime,
    Ende: e.endTime,
    Pause: `${e.breakMinutes} Min`,
    Stunden: e.totalHours.toFixed(2),
    Baustelle: e.baustelle?.name ?? "-",
    Notizen: e.notes ?? "",
  }));

  if (format === "excel") {
    const { Workbook } = await import("exceljs");
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet("Zeiteinträge");
    worksheet.columns = ["Mitarbeiter", "Email", "Datum", "Start", "Ende", "Pause", "Stunden", "Baustelle", "Notizen"].map(key => ({ header: key, key, width: 22 }));
    worksheet.addRows(rows);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="zeittrack-bericht.xlsx"`,
      },
    });
  }

  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(16);
  doc.text("ZeitTrack – Arbeitszeitbericht", 14, 15);
  doc.setFontSize(10);
  doc.text(`Erstellt am: ${formatDateDE(new Date())}`, 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [["Mitarbeiter", "Datum", "Start", "Ende", "Stunden", "Baustelle"]],
    body: entries.map((e) => [
      e.user.name,
      formatDateDE(e.workDate),
      e.startTime,
      e.endTime,
      e.totalHours.toFixed(2),
      e.baustelle?.name ?? "-",
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 64, 175] },
  });

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="zeittrack-bericht.pdf"`,
    },
  });
}
