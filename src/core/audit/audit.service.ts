import { prisma } from "@/database/client/prisma";

export class AuditService {
  async log(
    action: string,
    userId?: string,
    metadata?: object
  ) {
    return prisma.auditLog.create({
      data: {
        action,
        actorUserId: userId,
        actorType: userId
          ? "USER"
          : "SYSTEM",
        metadata: metadata ?? undefined,
      },
    });
  }
}
