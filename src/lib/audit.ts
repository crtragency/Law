import "server-only";
import { prisma } from "@/lib/prisma";

interface AuditInput {
  action: string; // مثال: "user.login"
  userId?: string | null;
  entity?: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ip?: string | null;
}

/**
 * تسجيل حدث في سجل التدقيق. لا يرمي استثناءً حتى لا يعطّل العملية الأصلية.
 */
export async function audit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        userId: input.userId ?? undefined,
        entity: input.entity,
        entityId: input.entityId,
        details: input.details ? JSON.stringify(input.details) : undefined,
        ip: input.ip ?? undefined,
      },
    });
  } catch (err) {
    console.error("فشل تسجيل حدث التدقيق:", err);
  }
}
