import { auth } from "@/auth";
import { logAuthEvent } from "@/lib/auth-logger";
import { createAuditLog } from "./audit";
import { NextResponse } from "next/server";
import type { Role } from "@/generated/prisma/client";

export async function requireAuth() {
  const session = await auth();

  if (!session?.user?.id || !session.user.role) {
    logAuthEvent("api.unauthorized", { reason: "session_not_found" });
    return {
      error: NextResponse.json({ error: "Nicht autorisiert", code: "SESSION_NOT_FOUND" }, { status: 401 }),
    };
  }

  return { session, user: session.user };
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
