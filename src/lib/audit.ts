import { prisma } from "./prisma";

interface AuditLogInput {
  adminId: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: string;
}

export async function createAuditLog(input: AuditLogInput) {
  return prisma.auditLog.create({ data: input });
}

export async function createNotification(
  userId: string,
  title: string,
  message: string
) {
  return prisma.notification.create({
    data: { userId, title, message },
  });
}
