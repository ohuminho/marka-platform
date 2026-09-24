import { prisma } from "@/database/client/prisma";

import {
  financialAuditService,
} from "@/core/audit/financial-audit.service";

import {
  mobilityFinancialCoreBridgeService,
} from "@/services/mobility/finance/mobility-financial-core-bridge.service";

import {
  mobilityFinancialOrchestratorService,
} from "@/services/mobility/finance/mobility-financial-orchestrator.service";

const ZERO = BigInt(0);

export class MobilityFinancialRecoveryService {
  async reconcile(
    input: {
      organizationId: string;
      rideId: string;
      actorUserId?: string;
      correlationId?: string;
      requestId?: string;
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    const payment =
      await prisma.$queryRaw<any[]>`
        SELECT *
        FROM "MobilityRidePayment"
        WHERE
          "organizationId" = ${input.organizationId}
          AND "rideId" = ${input.rideId}
        ORDER BY "createdAt" DESC
        LIMIT 1
      `;

    if (!payment[0]) {
      return {
        reconciled: false,
        status: "MISSING_PAYMENT",
        rideId: input.rideId,
      };
    }

    const p = payment[0];

    const settlement =
      await prisma.$queryRaw<any[]>`
        SELECT *
        FROM "MobilitySettlement"
        WHERE "paymentId" = ${p.id}
        LIMIT 1
      `;

    if (!settlement[0]) {
      return {
        reconciled: false,
        status: "MISSING_SETTLEMENT",
        rideId: input.rideId,
        paymentId: p.id,
      };
    }

    const s = settlement[0];

    const missing: string[] = [];
    const mismatches: string[] = [];

    const expectedAllocation =
      BigInt(s.driverNetAmountMinor) +
      BigInt(s.commissionAmountMinor) +
      BigInt(s.cashObligationSettledMinor);

    if (
      p.paymentMethod === "DIGITAL"
    ) {
      if (!s.financialTransactionId) {
        missing.push(
          "FINANCIAL_CAPTURE_TRANSACTION",
        );
      }

      if (
        BigInt(s.driverNetAmountMinor) >
          ZERO &&
        !s.vendorPayableTransactionId
      ) {
        missing.push(
          "DRIVER_PAYABLE_TRANSACTION",
        );
      }

      if (
        BigInt(s.commissionAmountMinor) >
          ZERO &&
        !s.commissionTransactionId
      ) {
        missing.push(
          "COMMISSION_TRANSACTION",
        );
      }

      if (
        BigInt(
          s.cashObligationSettledMinor,
        ) > ZERO &&
        !s.cashObligationSettlementTransactionId
      ) {
        missing.push(
          "CASH_OBLIGATION_SETTLEMENT_TRANSACTION",
        );
      }

      if (
        s.status === "COMPLETED" &&
        expectedAllocation !==
          BigInt(p.finalFareMinor)
      ) {
        mismatches.push(
          "DIGITAL_ALLOCATION_MISMATCH",
        );
      }
    }

    const result = {
      reconciled:
        missing.length === 0 &&
        mismatches.length === 0,

      status:
        mismatches.length > 0
          ? "MISMATCH"
          : missing.length > 0
            ? "INCOMPLETE"
            : "RECONCILED",

      rideId:
        input.rideId,

      paymentId:
        p.id,

      settlementId:
        s.id,

      missing,

      mismatches,

      expectedAllocation:
        expectedAllocation.toString(),
    };

    await financialAuditService.record({
      organizationId:
        input.organizationId,

      actorUserId:
        input.actorUserId,

      action:
        result.reconciled
          ? "MOBILITY_FINANCIAL_RECONCILIATION_COMPLETED"
          : "MOBILITY_FINANCIAL_RECONCILIATION_MISMATCH",

      entityType:
        "MOBILITY_RIDE",

      entityId:
        input.rideId,

      correlationId:
        input.correlationId,

      requestId:
        input.requestId,

      ipAddress:
        input.ipAddress,

      userAgent:
        input.userAgent,

      metadata:
        result,
    });

    return result;
  }

  async recover(
    input: {
      organizationId: string;
      rideId: string;
      finalFareMinor?: bigint;
      availableDigitalProceedsMinor?: bigint;
      sourceReference?: string;
      actorUserId?: string;
      correlationId?: string;
      requestId?: string;
      ipAddress?: string;
      userAgent?: string;
      paymentIdempotencyKey?: string;
      settlementIdempotencyKey?: string;
      settlementCompletionIdempotencyKey?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    const paymentRows =
      await prisma.$queryRaw<any[]>`
        SELECT *
        FROM "MobilityRidePayment"
        WHERE
          "organizationId" = ${input.organizationId}
          AND "rideId" = ${input.rideId}
        ORDER BY "createdAt" DESC
        LIMIT 1
      `;

    const payment =
      paymentRows[0];

    if (!payment) {
      throw new Error(
        "Mobility payment is required for financial recovery.",
      );
    }

    const finalFareMinor =
      input.finalFareMinor ??
      BigInt(payment.finalFareMinor);

    await mobilityFinancialOrchestratorService
      .finalizeRideFinancials({
        organizationId:
          input.organizationId,

        rideId:
          input.rideId,

        finalFareMinor,

        availableDigitalProceedsMinor:
          input.availableDigitalProceedsMinor,

        sourceReference:
          input.sourceReference,

        actorUserId:
          input.actorUserId,

        correlationId:
          input.correlationId,

        requestId:
          input.requestId,

        ipAddress:
          input.ipAddress,

        userAgent:
          input.userAgent,

        paymentIdempotencyKey:
          input.paymentIdempotencyKey ??
          `mobility-recovery:${input.rideId}:payment`,

        settlementIdempotencyKey:
          input.settlementIdempotencyKey ??
          `mobility-recovery:${input.rideId}:settlement`,

        settlementCompletionIdempotencyKey:
          input.settlementCompletionIdempotencyKey ??
          `mobility-recovery:${input.rideId}:settlement-complete`,

        metadata: {
          ...(input.metadata ?? {}),
          recovery: true,
        },
      });

    if (
      payment.paymentMethod ===
      "DIGITAL"
    ) {
      if (
        input.availableDigitalProceedsMinor ===
        undefined
      ) {
        throw new Error(
          "Digital recovery requires available digital proceeds.",
        );
      }

      if (
        !input.sourceReference?.trim()
      ) {
        throw new Error(
          "Digital recovery requires a source reference.",
        );
      }

      const settlements =
        await prisma.$queryRaw<any[]>`
          SELECT *
          FROM "MobilitySettlement"
          WHERE "paymentId" = ${payment.id}
          LIMIT 1
        `;

      const settlement =
        settlements[0];

      if (!settlement) {
        throw new Error(
          "Mobility settlement was not created during recovery.",
        );
      }

      if (!payment.driverId) {
        throw new Error(
          "Digital recovery requires an assigned driver.",
        );
      }

      const bridge =
        await mobilityFinancialCoreBridgeService
          .settleDigitalRide({
            organizationId:
              input.organizationId,

            settlementId:
              settlement.id,

            paymentId:
              payment.id,

            rideId:
              input.rideId,

            driverId:
              payment.driverId,

            currency:
              payment.currency,

            grossFareMinor:
              BigInt(
                payment.finalFareMinor,
              ),

            availableDigitalProceedsMinor:
              input.availableDigitalProceedsMinor,

            currentCommissionMinor:
              BigInt(
                payment.commissionAmountMinor,
              ),

            priorCashObligationsSettledMinor:
              BigInt(
                settlement.cashObligationSettledMinor,
              ),

            driverNetMinor:
              BigInt(
                settlement.driverNetAmountMinor,
              ),

            sourceReference:
              input.sourceReference,

            actorUserId:
              input.actorUserId,

            correlationId:
              input.correlationId,

            requestId:
              input.requestId,

            ipAddress:
              input.ipAddress,

            userAgent:
              input.userAgent,
          });

      await prisma.$executeRaw`
        UPDATE "MobilitySettlement"
        SET
          "financialTransactionId" =
            ${bridge.financialTransactionId},

          "vendorPayableTransactionId" =
            ${bridge.vendorPayableTransactionId},

          "commissionTransactionId" =
            ${bridge.commissionTransactionId},

          "cashObligationSettlementTransactionId" =
            ${bridge.cashObligationSettlementTransactionId},

          "updatedAt" =
            CURRENT_TIMESTAMP

        WHERE "id" =
          ${settlement.id}
      `;
    }

    return this.reconcile({
      organizationId:
        input.organizationId,

      rideId:
        input.rideId,

      actorUserId:
        input.actorUserId,

      correlationId:
        input.correlationId,

      requestId:
        input.requestId,

      ipAddress:
        input.ipAddress,

      userAgent:
        input.userAgent,
    });
  }
}

export const mobilityFinancialRecoveryService =
  new MobilityFinancialRecoveryService();
