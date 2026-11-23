import { prisma } from "@/database/client/prisma";

const WINDOW_DAYS = 30;
const REVIEW_THRESHOLD = 3;
const EVENT_TYPE = "VENDOR_CANCELLED_ORDER";
const SIGNAL_TYPE = "CONDUCT_REPEATED_VENDOR_CANCELLATIONS";

export function shouldFlagRepeatedVendorCancellations(count: number) {
  return count >= REVIEW_THRESHOLD;
}

/**
 * Records a vendor-initiated order cancellation for operational review.
 * Repeated cancellations create a review-only signal, never an automatic sanction.
 */
export async function recordVendorCancellationForReview(input: {
  vendorUserId: string;
  vendorId: string;
  orderId: string;
}) {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.securityEvent.findFirst({
      where: {
        actorUserId: input.vendorUserId,
        type: EVENT_TYPE,
        correlationId: input.orderId,
      },
      select: { id: true },
    });
    if (existing) return;

    await tx.securityEvent.create({
      data: {
        actorUserId: input.vendorUserId,
        type: EVENT_TYPE,
        severity: "INFO",
        correlationId: input.orderId,
        metadata: {
          vendorId: input.vendorId,
          orderId: input.orderId,
          policyCode: "REPEATED_VENDOR_CANCELLATIONS",
          reviewOnly: true,
        },
      },
    });

    const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const count = await tx.securityEvent.count({
      where: {
        actorUserId: input.vendorUserId,
        type: EVENT_TYPE,
        createdAt: { gte: since },
      },
    });
    if (!shouldFlagRepeatedVendorCancellations(count)) return;

    const existingSignal = await tx.riskSignal.findFirst({
      where: {
        userId: input.vendorUserId,
        type: SIGNAL_TYPE,
        createdAt: { gte: since },
        status: { in: ["OPEN", "REVIEWED"] },
      },
      select: { id: true },
    });

    const data = {
      score: 35,
      source: "VENDOR_ORDER_CANCELLATION",
      entityType: "USER",
      entityId: input.vendorUserId,
      reason: "Três ou mais cancelamentos de encomendas iniciados pelo vendedor em 30 dias. Pode haver motivos comerciais ou operacionais legítimos; exige revisão humana e não prova abuso.",
      metadata: {
        policyCode: "REPEATED_VENDOR_CANCELLATIONS",
        eventCountInWindow: count,
        windowDays: WINDOW_DAYS,
        reviewOnly: true,
        vendorId: input.vendorId,
        latestOrderId: input.orderId,
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
          userId: input.vendorUserId,
          type: SIGNAL_TYPE,
          ...data,
        },
      });
    }
  });
}
