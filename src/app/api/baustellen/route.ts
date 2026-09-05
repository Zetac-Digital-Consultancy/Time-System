import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin, logAdminAction } from "@/lib/api-auth";
import { baustelleSchema } from "@/lib/validations";

export async function GET() {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const baustellen = await prisma.baustelle.findMany({
    where: { companyId: authResult.user.companyId },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { timeEntries: true } },
    },
  });

  return NextResponse.json(baustellen);
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  const body = await request.json();
  const parsed = baustelleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const baustelle = await prisma.baustelle.create({ data: { ...parsed.data, companyId: authResult.user.companyId } });

  await logAdminAction(
    authResult.user.id,
    "CREATE",
    "Baustelle",
    baustelle.id,
    `Baustelle ${baustelle.name} erstellt`
  );

  return NextResponse.json(baustelle, { status: 201 });
}
