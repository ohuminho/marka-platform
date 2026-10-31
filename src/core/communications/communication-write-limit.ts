import type { Prisma } from "@prisma/client";

export type CommunicationWriteKind = "SEND" | "EDIT";

/**
 * Must be called inside the same transaction as the write.
 * The per-user advisory lock makes quota checks atomic across Marketplace,
 * Mobility and Delivery, including concurrent requests on separate instances.
 */
export async function reserveCommunicationWrite(
  tx: Prisma.TransactionClient,
  actorId: string,
  kind: CommunicationWriteKind,
): Promise<boolean> {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${actorId}))`;
  const windowStart = new Date(Date.now() - 60_000);
  const [marketplaceCount, contextualCount] = await Promise.all([
    tx.marketplaceMessage.count({
      where: kind === "SEND"
        ? { senderId: actorId, createdAt: { gte: windowStart } }
        : { senderId: actorId, editedAt: { gte: windowStart } },
    }),
    tx.communicationThreadMessage.count({
      where: kind === "SEND"
        ? { senderId: actorId, createdAt: { gte: windowStart } }
        : { senderId: actorId, editedAt: { gte: windowStart } },
    }),
  ]);
  const limit = kind === "SEND" ? 20 : 10;
  return marketplaceCount + contextualCount < limit;
}
