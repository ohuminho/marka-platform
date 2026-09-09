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
        userId,
        metadata: metadata
          ? JSON.stringify(metadata)
          : undefined,
      },
    });
  }
}
