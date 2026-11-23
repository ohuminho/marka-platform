import { prisma } from "@/database/client/prisma";

const REVIEWABLE_PRE_ASSIGNMENT_STATES = new Set([
  "DRIVER_ASSIGNED",
  "DRIVER_ARRIVING",
  "DRIVER_ARRIVED",
]);

export function shouldRecordMobilityCancellationForReview(status: string) {
  return REVIEWABLE_PRE_ASSIGNMENT_STATES.has(status);
}

export function shouldFlagRepeatedMobilityCancellations(count: number) {
  return count >= REVIEW_THRESHOLD;
}

const CANCELLATION_EVENT_TYPE = "MOBILITY_RIDER_CANCELLED_AFTER_ASSIGNMENT";
const REPEATED_CANCELLATION_SIGNAL = "CONDUCT_REPEATED_MOBILITY_CANCELLATIONS";
const REVIEW_WINDOW_DAYS = 30;
const REVIEW_THRESHOLD = 3;

/**
 * Records only completed rider cancellations after a driver has been assigned.
 * Three events in 30 days create a review-only signal; no account restriction is applied.
 */
export async function recordMobilityCancellationForReview(input: {
  actorUserId: string;
  rideId: string;
  previousRideStatus: string;
  idempotencyKey: string;
  correlationId?: string;
}) {
  if (!shouldRecordMobilityCancellationForReview(input.previousRideStatus)) return;

  await prisma.$transaction(async (tx) => {
    const existingEvent = await tx.securityEvent.findFirst({
      where: {
        actorUserId: input.actorUserId,
        type: CANCELLATION_EVENT_TYPE,
        correlationId: input.idempotencyKey,
      },
      select: { id: true },
    });
    if (existingEvent) return;

    await tx.securityEvent.create({
      data: {
        actorUserId: input.actorUserId,
        type: CANCELLATION_EVENT_TYPE,
        severity: "INFO",
        correlationId: input.idempotencyKey,
        metadata: {
          rideId: input.rideId,
          previousRideStatus: input.previousRideStatus,
          policyCode: "REPEATED_MOBILITY_CANCELLATIONS",
          reviewOnly: true,
        },
      },
    });

    const since = new Date(Date.now() - REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const count = await tx.securityEvent.count({
      where: {
        actorUserId: input.actorUserId,
        type: CANCELLATION_EVENT_TYPE,
        createdAt: { gte: since },
      },
    });

    if (!shouldFlagRepeatedMobilityCancellations(count)) return;

    const existingSignal = await tx.riskSignal.findFirst({
      where: {
        userId: input.actorUserId,
        type: REPEATED_CANCELLATION_SIGNAL,
        createdAt: { gte: since },
        status: { in: ["OPEN", "REVIEWED"] },
      },
      select: { id: true },
    });

    const signalData = {
      score: 35,
      source: "MOBILITY_CANCELLATION",
      entityType: "USER",
      entityId: input.actorUserId,
      reason: "Três ou mais cancelamentos após atribuição do motorista em 30 dias. Sinal para revisão humana; não constitui prova isolada de abuso.",
      metadata: {
        policyCode: "REPEATED_MOBILITY_CANCELLATIONS",
        eventCountInWindow: count,
        windowDays: REVIEW_WINDOW_DAYS,
        reviewOnly: true,
        latestRideId: input.rideId,
      },
    };

    if (existingSignal) {
      await tx.riskSignal.update({
        where: { id: existingSignal.id },
        data: signalData,
      });
    } else {
      await tx.riskSignal.create({
        data: {
          userId: input.actorUserId,
          type: REPEATED_CANCELLATION_SIGNAL,
          ...signalData,
        },
      });
    }
  });
}
