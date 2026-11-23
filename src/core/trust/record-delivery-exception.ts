import { prisma } from "@/database/client/prisma";

const WINDOW_DAYS = 30;
const REVIEW_THRESHOLD = 3;
const EVENT_TYPE = "DELIVERY_AGENT_RECORDED_EXCEPTION";
const SIGNAL_TYPE = "CONDUCT_REPEATED_DELIVERY_EXCEPTIONS";

export function shouldFlagRepeatedDeliveryExceptions(count: number) {
  return count >= REVIEW_THRESHOLD;
}

/**
 * Records delivery exceptions as operational evidence, not proof of misconduct.
 * Three exceptions in 30 days create a human-review signal only.
 */
export async function recordDeliveryExceptionForReview(input: {
  agentUserId: string;
  dispatchId: string;
  fulfillmentId: string;
}) {
  await prisma.$transaction(async (tx) => {
    const correlationId = input.dispatchId;
    const existing = await tx.securityEvent.findFirst({
      where: {
        actorUserId: input.agentUserId,
        type: EVENT_TYPE,
        correlationId,
      },
      select: { id: true },
    });
    if (existing) return;

    await tx.securityEvent.create({
      data: {
        actorUserId: input.agentUserId,
        type: EVENT_TYPE,
        severity: "INFO",
        correlationId,
        metadata: {
          dispatchId: input.dispatchId,
          fulfillmentId: input.fulfillmentId,
          policyCode: "REPEATED_DELIVERY_EXCEPTIONS",
          reviewOnly: true,
        },
      },
    });

    const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const count = await tx.securityEvent.count({
      where: {
        actorUserId: input.agentUserId,
        type: EVENT_TYPE,
        createdAt: { gte: since },
      },
    });
    if (!shouldFlagRepeatedDeliveryExceptions(count)) return;

    const existingSignal = await tx.riskSignal.findFirst({
      where: {
        userId: input.agentUserId,
        type: SIGNAL_TYPE,
        createdAt: { gte: since },
        status: { in: ["OPEN", "REVIEWED"] },
      },
      select: { id: true },
    });

    const data = {
      score: 35,
      source: "DELIVERY_OPERATION",
      entityType: "USER",
      entityId: input.agentUserId,
      reason: "Três ou mais entregas colocadas em estado de exceção por este agente em 30 dias. Pode reflectir problemas operacionais legítimos; exige revisão humana e não prova abuso.",
      metadata: {
        policyCode: "REPEATED_DELIVERY_EXCEPTIONS",
        eventCountInWindow: count,
        windowDays: WINDOW_DAYS,
        reviewOnly: true,
        latestDispatchId: input.dispatchId,
      },
    };

    if (existingSignal) {
      await tx.riskSignal.update({
        where: { id: existingSignal.id },
        data,
      });
    } else {
      await tx.riskSignal.create({
        data: {
          userId: input.agentUserId,
          type: SIGNAL_TYPE,
          ...data,
        },
      });
    }
  });
}
