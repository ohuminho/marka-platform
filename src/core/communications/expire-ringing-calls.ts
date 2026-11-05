import { Prisma } from "@prisma/client";

type Transaction = Prisma.TransactionClient;

/**
 * Finalizes expired ringing calls and notifies the original caller.
 * The conditional update and notification share one transaction; concurrent
 * pollers can therefore create at most one notification per call.
 */
export async function expireRingingCalls(
  tx: Transaction,
  scope: Prisma.CommunicationCallSessionWhereInput,
  now = new Date(),
): Promise<number> {
  const expired = await tx.communicationCallSession.findMany({
    where: {
      AND: [
        scope,
        { status: "RINGING", expiresAt: { lte: now } },
      ],
    },
    select: { id: true, callerId: true, threadId: true },
  });

  let finalized = 0;
  for (const call of expired) {
    const updated = await tx.communicationCallSession.updateMany({
      where: { id: call.id, status: "RINGING", expiresAt: { lte: now } },
      data: { status: "MISSED", endedAt: now },
    });
    if (updated.count !== 1) continue;

    await tx.notification.create({
      data: {
        userId: call.callerId,
        type: "CALL_MISSED",
        title: "Chamada não atendida",
        message: "A tua chamada não foi atendida.",
        data: { callId: call.id, threadId: call.threadId },
      },
    });
    finalized += 1;
  }
  return finalized;
}
