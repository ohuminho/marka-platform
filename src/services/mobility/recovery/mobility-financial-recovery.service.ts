import { prisma } from "@/database/client/prisma";

import {
  FinancialAuditService,
} from "@/core/audit/financial-audit.service";

import {
  mobilityFinancialCoreBridgeService,
} from "@/services/mobility/finance/mobility-financial-core-bridge.service";

import {
  mobilityFinancialOrchestratorService,
} from "@/services/mobility/finance/mobility-financial-orchestrator.service";

const ZERO = BigInt(0);

export class MobilityFinancialRecoveryService {
  private readonly financialAuditService =
    new FinancialAuditService();

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
    const paymentRows =
      await prisma.$queryRaw<any[]>`
        SELECT *
        FROM "MobilityRidePayment"
        WHERE
          "organizationId" =
            ${input.organizationId}
          AND
          "rideId" =
            ${input.rideId}
        ORDER BY
          "createdAt" DESC
        LIMIT 1
      `;

    const payment =
      paymentRows[0];

    if (!payment) {
      return {
        reconciled: false,
        status: "MISSING_PAYMENT",
        rideId: input.rideId,
      };
    }

    const settlementRows =
      await prisma.$queryRaw<any[]>`
        SELECT *
        FROM "MobilitySettlement"
        WHERE
          "paymentId" =
            ${payment.id}
        LIMIT 1
      `;

    const settlement =
      settlementRows[0];

    if (!settlement) {
      return {
        reconciled: false,
        status: "MISSING_SETTLEMENT",
        rideId: input.rideId,
        paymentId: payment.id,
      };
    }

    const missing: string[] = [];
    const mismatches: string[] = [];

    const gross =
      BigInt(
        payment.finalFareMinor,
      );

    const commission =
      BigInt(
        payment.commissionAmountMinor,
      );

    const driverNet =
      BigInt(
        settlement.driverNetAmountMinor,
      );

    const priorCashSettled =
      BigInt(
        settlement.cashObligationSettledMinor,
      );

    const expectedAllocation =
      driverNet +
      commission +
      priorCashSettled;

    if (
      payment.paymentMethod ===
      "DIGITAL"
    ) {
      if (
        !settlement.financialTransactionId
      ) {
        missing.push(
          "FINANCIAL_CAPTURE_TRANSACTION",
        );
      }

      if (
        driverNet > ZERO &&
        !settlement.vendorPayableTransactionId
      ) {
        missing.push(
          "DRIVER_PAYABLE_TRANSACTION",
        );
      }

      if (
        commission > ZERO &&
        !settlement.commissionTransactionId
      ) {
        missing.push(
          "COMMISSION_TRANSACTION",
        );
      }

      if (
        priorCashSettled > ZERO &&
        !settlement.cashObligationSettlementTransactionId
      ) {
        missing.push(
          "CASH_OBLIGATION_SETTLEMENT_TRANSACTION",
        );
      }

      if (
        settlement.status ===
          "COMPLETED" &&
        expectedAllocation !==
          gross
      ) {
        mismatches.push(
          "DIGITAL_ALLOCATION_MISMATCH",
        );
      }
    }

    if (
      payment.paymentMethod ===
      "CASH" &&
      settlement.status ===
        "COMPLETED"
    ) {
      const expectedCashObligation =
        commission;

      if (
        BigInt(
          settlement.cashObligationAmountMinor,
        ) !==
        expectedCashObligation
      ) {
        mismatches.push(
          "CASH_OBLIGATION_AMOUNT_MISMATCH",
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
        payment.id,

      settlementId:
        settlement.id,

      missing,
      mismatches,

      grossFareMinor:
        gross.toString(),

      currentCommissionMinor:
        commission.toString(),

      driverNetMinor:
        driverNet.toString(),

      priorCashObligationsSettledMinor:
        priorCashSettled.toString(),

      expectedAllocation:
        expectedAllocation.toString(),
    };

    await this.financialAuditService.record({
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
          "organizationId" =
            ${input.organizationId}
          AND
          "rideId" =
            ${input.rideId}
        ORDER BY
          "createdAt" DESC
        LIMIT 1
      `;

    const payment =
      paymentRows[0];

    if (!payment) {
      throw new Error(
        "Mobility payment is required for financial recovery.",
      );
    }

    const reconciliation =
      await this.reconcile({
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

    if (
      reconciliation.status ===
      "MISMATCH"
    ) {
      throw new Error(
        "Mobility financial recovery is blocked because reconciliation detected an accounting mismatch.",
      );
    }

    const finalFareMinor =
      input.finalFareMinor ??
      BigInt(
        payment.finalFareMinor,
      );

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
          WHERE
            "paymentId" =
              ${payment.id}
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
        WHERE
          "id" =
            ${settlement.id}
      `;
    }

    const finalReconciliation =
      await this.reconcile({
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

    await this.financialAuditService.record({
      organizationId:
        input.organizationId,
      actorUserId:
        input.actorUserId,
      action:
        finalReconciliation.reconciled
          ? "MOBILITY_FINANCIAL_RECOVERY_COMPLETED"
          : "MOBILITY_FINANCIAL_RECOVERY_INCOMPLETE",
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
        finalReconciliation,
    });

    return finalReconciliation;
  }
}

export const mobilityFinancialRecoveryService =
  new MobilityFinancialRecoveryService();
