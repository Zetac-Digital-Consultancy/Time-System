import { auth } from "@/auth";
import { logAuthEvent } from "@/lib/auth-logger";
import { createAuditLog } from "./audit";
import { NextResponse } from "next/server";
import type { Role } from "@/generated/prisma/client";
import type { Session } from "next-auth";

export async function requireSession(): Promise<{ error: NextResponse } | { session: Session; user: Session["user"] }> {
  const session = await auth();

  if (!session?.user?.id || !session.user.role) {
    logAuthEvent("api.unauthorized", { reason: "session_not_found" });
    return {
      error: NextResponse.json({ error: "Nicht autorisiert", code: "SESSION_NOT_FOUND" }, { status: 401 }),
    };
  }

  return { session, user: session.user };
}

export async function requireAuth() {
  const result = await requireSession();
  if ("error" in result) return result;
  if (result.user.mustChangePassword) return { error: NextResponse.json({ error: "Bitte zuerst das Passwort ändern", code: "PASSWORD_CHANGE_REQUIRED" }, { status: 403 }) };
  if (!result.user.companyId || result.user.role === "PLATFORM_ADMIN") {
    return { error: NextResponse.json({ error: "Firmenzugang erforderlich" }, { status: 403 }) };
  }
  return { ...result, user: { ...result.user, companyId: result.user.companyId } };
}

export async function requirePlatformAdmin() {
  const result = await requireSession();
  if ("error" in result) return result;
  if (result.user.role !== "PLATFORM_ADMIN" || result.user.mustChangePassword) {
    return { error: NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 }) };
  }
  return result;
}

export async function requireRole(roles: Role[]) {
  const result = await requireAuth();
  if ("error" in result) return result;

  if (!roles.includes(result.user.role as Role)) {
    logAuthEvent("api.forbidden", {
      userId: result.user.id,
      role: result.user.role,
      requiredRoles: roles,
    });
    return {
      error: NextResponse.json({ error: "Zugriff verweigert", code: "FORBIDDEN" }, { status: 403 }),
    };
  }

  return result;
}

export async function requireAdmin() {
  return requireRole(["ADMIN"]);
}

export async function logAdminAction(
  adminId: string,
  action: string,
  entityType: string,
  entityId: string,
  details?: string
) {
  await createAuditLog({ adminId, action, entityType, entityId, details });
}
