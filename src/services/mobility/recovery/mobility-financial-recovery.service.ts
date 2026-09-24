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

type ReconciliationStatus =
  | "RECONCILED"
  | "INCOMPLETE"
  | "MISMATCH"
  | "MISSING_PAYMENT"
  | "MISSING_SETTLEMENT";

interface TransactionRow {
  id: string;
  status: string;
  amountMinor: bigint;
  currency: string;
  type: string;
  direction: string;
  idempotencyKey: string;
  reference: string;
}

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
        SELECT
          *
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
      return {
        reconciled: false,
        status:
          "MISSING_PAYMENT" as ReconciliationStatus,
        rideId: input.rideId,
        missing: [
          "PAYMENT",
        ],
        mismatches: [],
      };
    }

    const settlementRows =
      await prisma.$queryRaw<any[]>`
        SELECT
          *
        FROM "MobilitySettlement"
        WHERE
          "paymentId" = ${payment.id}
        ORDER BY "createdAt" DESC
        LIMIT 1
      `;

    const settlement =
      settlementRows[0];

    if (!settlement) {
      return {
        reconciled: false,
        status:
          "MISSING_SETTLEMENT" as ReconciliationStatus,
        rideId: input.rideId,
        paymentId: payment.id,
        missing: [
          "SETTLEMENT",
        ],
        mismatches: [],
      };
    }

    const missing: string[] = [];
    const mismatches: string[] = [];

    const grossFareMinor =
      BigInt(
        payment.finalFareMinor,
      );

    const commissionMinor =
      BigInt(
        payment.commissionAmountMinor,
      );

    const driverNetMinor =
      BigInt(
        settlement.driverNetAmountMinor,
      );

    const priorCashObligationsSettledMinor =
      BigInt(
        settlement.cashObligationSettledMinor,
      );

    const cashObligationAmountMinor =
      BigInt(
        settlement.cashObligationAmountMinor,
      );

    /*
     * Core Mobility invariant:
     *
     * gross fare =
     * current commission
     * + previous cash obligations settled
     * + current driver net
     */
    const expectedDigitalAllocation =
      commissionMinor +
      priorCashObligationsSettledMinor +
      driverNetMinor;

    if (
      expectedDigitalAllocation !==
      grossFareMinor
    ) {
      mismatches.push(
        "DIGITAL_ALLOCATION_MISMATCH",
      );
    }

    if (
      commissionMinor >
      grossFareMinor
    ) {
      mismatches.push(
        "COMMISSION_EXCEEDS_GROSS_FARE",
      );
    }

    if (
      driverNetMinor <
      ZERO
    ) {
      mismatches.push(
        "NEGATIVE_DRIVER_NET",
      );
    }

    if (
      payment.paymentMethod ===
      "CASH"
    ) {
      if (
        cashObligationAmountMinor !==
        commissionMinor
      ) {
        mismatches.push(
          "CASH_OBLIGATION_AMOUNT_MISMATCH",
        );
      }

      if (
        settlement.status ===
          "COMPLETED" &&
        payment.status !==
          "SETTLED"
      ) {
        mismatches.push(
          "CASH_SETTLEMENT_PAYMENT_NOT_SETTLED",
        );
      }

      if (
        settlement.status ===
          "COMPLETED" &&
        cashObligationAmountMinor ===
          ZERO
      ) {
        mismatches.push(
          "CASH_SETTLEMENT_WITHOUT_OBLIGATION",
        );
      }
    }

    if (
      payment.paymentMethod ===
      "DIGITAL"
    ) {
      if (
        settlement.status ===
        "COMPLETED"
      ) {
        if (
          !settlement.financialTransactionId
        ) {
          missing.push(
            "FINANCIAL_CAPTURE_TRANSACTION",
          );
        }

        if (
          commissionMinor >
            ZERO &&
          !settlement.commissionTransactionId
        ) {
          missing.push(
            "COMMISSION_TRANSACTION",
          );
        }

        if (
          priorCashObligationsSettledMinor >
            ZERO &&
          !settlement.cashObligationSettlementTransactionId
        ) {
          missing.push(
            "CASH_OBLIGATION_SETTLEMENT_TRANSACTION",
          );
        }

        if (
          driverNetMinor >
            ZERO &&
          !settlement.vendorPayableTransactionId
        ) {
          missing.push(
            "DRIVER_PAYABLE_TRANSACTION",
          );
        }

        if (
          payment.status !==
          "SETTLED"
        ) {
          mismatches.push(
            "DIGITAL_SETTLEMENT_PAYMENT_NOT_SETTLED",
          );
        }
      }

      if (
        settlement.status ===
          "COMPLETED" &&
        !settlement.completedAt
      ) {
        mismatches.push(
          "COMPLETED_SETTLEMENT_WITHOUT_COMPLETION_TIMESTAMP",
        );
      }

      if (
        settlement.status ===
          "PROCESSING"
      ) {
        missing.push(
          "SETTLEMENT_COMPLETION",
        );
      }
    }

    /*
     * Once Financial Core links exist, validate the
     * actual Transaction rows, not only their IDs.
     */
    if (
      payment.paymentMethod ===
      "DIGITAL"
    ) {
      await this.reconcileFinancialTransactions({
        settlement,
        payment,
        grossFareMinor,
        commissionMinor,
        driverNetMinor,
        priorCashObligationsSettledMinor,
        missing,
        mismatches,
      });
    }

    const reconciled =
      missing.length ===
        0 &&
      mismatches.length ===
        0 &&
      settlement.status ===
        "COMPLETED" &&
      payment.status ===
        "SETTLED";

    let status:
      ReconciliationStatus;

    if (
      mismatches.length >
      0
    ) {
      status =
        "MISMATCH";
    } else if (
      missing.length >
      0
    ) {
      status =
        "INCOMPLETE";
    } else if (
      reconciled
    ) {
      status =
        "RECONCILED";
    } else {
      status =
        "INCOMPLETE";
    }

    const result = {
      reconciled,

      status,

      rideId:
        input.rideId,

      paymentId:
        payment.id,

      settlementId:
        settlement.id,

      paymentStatus:
        payment.status,

      settlementStatus:
        settlement.status,

      paymentMethod:
        payment.paymentMethod,

      missing,

      mismatches,

      grossFareMinor:
        grossFareMinor.toString(),

      currentCommissionMinor:
        commissionMinor.toString(),

      priorCashObligationsSettledMinor:
        priorCashObligationsSettledMinor.toString(),

      driverNetMinor:
        driverNetMinor.toString(),

      expectedDigitalAllocation:
        expectedDigitalAllocation.toString(),

      cashObligationAmountMinor:
        cashObligationAmountMinor.toString(),
    };

    await this.financialAuditService.record({
      organizationId:
        input.organizationId,

      actorUserId:
        input.actorUserId,

      action:
        reconciled
          ? "MOBILITY_FINANCIAL_RECONCILIATION_COMPLETED"
          : mismatches.length > 0
            ? "MOBILITY_FINANCIAL_RECONCILIATION_MISMATCH"
            : "MOBILITY_FINANCIAL_RECONCILIATION_INCOMPLETE",

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

  private async reconcileFinancialTransactions(
    input: {
      settlement: any;
      payment: any;
      grossFareMinor: bigint;
      commissionMinor: bigint;
      driverNetMinor: bigint;
      priorCashObligationsSettledMinor: bigint;
      missing: string[];
      mismatches: string[];
    },
  ): Promise<void> {
    const {
      settlement,
      payment,
      grossFareMinor,
      commissionMinor,
      driverNetMinor,
      priorCashObligationsSettledMinor,
      missing,
      mismatches,
    } = input;

    const expectedCapture =
      grossFareMinor;

    if (
      settlement.financialTransactionId
    ) {
      const capture =
        await this.findTransaction(
          settlement.financialTransactionId,
        );

      if (!capture) {
        missing.push(
          "FINANCIAL_CAPTURE_TRANSACTION_RECORD",
        );
      } else {
        this.validateTransaction(
          capture,
          {
            expectedAmount:
              expectedCapture,
            expectedCurrency:
              payment.currency,
            expectedType:
              "PAYMENT",
            expectedLabel:
              "FINANCIAL_CAPTURE_TRANSACTION",
            missing,
            mismatches,
          },
        );
      }
    }

    if (
      commissionMinor >
        ZERO
    ) {
      if (
        !settlement.commissionTransactionId
      ) {
        missing.push(
          "COMMISSION_TRANSACTION",
        );
      } else {
        const transaction =
          await this.findTransaction(
            settlement.commissionTransactionId,
          );

        if (!transaction) {
          missing.push(
            "COMMISSION_TRANSACTION_RECORD",
          );
        } else {
          this.validateTransaction(
            transaction,
            {
              expectedAmount:
                commissionMinor,
              expectedCurrency:
                payment.currency,
              expectedType:
                "COMMISSION",
              expectedLabel:
                "COMMISSION_TRANSACTION",
              missing,
              mismatches,
            },
          );
        }
      }
    }

    if (
      priorCashObligationsSettledMinor >
        ZERO
    ) {
      if (
        !settlement.cashObligationSettlementTransactionId
      ) {
        missing.push(
          "CASH_OBLIGATION_SETTLEMENT_TRANSACTION",
        );
      } else {
        const transaction =
          await this.findTransaction(
            settlement.cashObligationSettlementTransactionId,
          );

        if (!transaction) {
          missing.push(
            "CASH_OBLIGATION_SETTLEMENT_TRANSACTION_RECORD",
          );
        } else {
          this.validateTransaction(
            transaction,
            {
              expectedAmount:
                priorCashObligationsSettledMinor,
              expectedCurrency:
                payment.currency,
              expectedType:
                "COMMISSION",
              expectedLabel:
                "CASH_OBLIGATION_SETTLEMENT_TRANSACTION",
              missing,
              mismatches,
            },
          );
        }
      }
    }

    if (
      driverNetMinor >
        ZERO
    ) {
      if (
        !settlement.vendorPayableTransactionId
      ) {
        missing.push(
          "DRIVER_PAYABLE_TRANSACTION",
        );
      } else {
        const transaction =
          await this.findTransaction(
            settlement.vendorPayableTransactionId,
          );

        if (!transaction) {
          missing.push(
            "DRIVER_PAYABLE_TRANSACTION_RECORD",
          );
        } else {
          this.validateTransaction(
            transaction,
            {
              expectedAmount:
                driverNetMinor,
              expectedCurrency:
                payment.currency,
              expectedType:
                "PAYMENT",
              expectedLabel:
                "DRIVER_PAYABLE_TRANSACTION",
              missing,
              mismatches,
            },
          );
        }
      }
    }
  }

  private async findTransaction(
    transactionId: string,
  ): Promise<TransactionRow | null> {
    const rows =
      await prisma.$queryRaw<
        TransactionRow[]
      >`
        SELECT
          "id",
          "status",
          "amountMinor",
          "currency",
          "type",
          "direction",
          "idempotencyKey",
          "reference"
        FROM "Transaction"
        WHERE
          "id" = ${transactionId}
        LIMIT 1
      `;

    return rows[0] ??
      null;
  }

  private validateTransaction(
    transaction: TransactionRow,
    input: {
      expectedAmount: bigint;
      expectedCurrency: string;
      expectedType: string;
      expectedLabel: string;
      missing: string[];
      mismatches: string[];
    },
  ): void {
    if (
      transaction.status !==
      "COMPLETED"
    ) {
      input.mismatches.push(
        `${input.expectedLabel}_NOT_COMPLETED`,
      );
    }

    if (
      transaction.amountMinor !==
      input.expectedAmount
    ) {
      input.mismatches.push(
        `${input.expectedLabel}_AMOUNT_MISMATCH`,
      );
    }

    if (
      transaction.currency !==
      input.expectedCurrency
    ) {
      input.mismatches.push(
        `${input.expectedLabel}_CURRENCY_MISMATCH`,
      );
    }

    if (
      transaction.type !==
      input.expectedType
    ) {
      input.mismatches.push(
        `${input.expectedLabel}_TYPE_MISMATCH`,
      );
    }
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
        SELECT
          *
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
      BigInt(
        payment.finalFareMinor,
      );

    if (
      finalFareMinor <
      ZERO
    ) {
      throw new Error(
        "Final fare cannot be negative.",
      );
    }

    if (
      finalFareMinor !==
      BigInt(
        payment.finalFareMinor,
      )
    ) {
      throw new Error(
        "Recovery final fare does not match the immutable Mobility payment amount.",
      );
    }

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
        input.availableDigitalProceedsMinor <
        ZERO
      ) {
        throw new Error(
          "Digital recovery proceeds cannot be negative.",
        );
      }

      if (
        input.availableDigitalProceedsMinor !==
        finalFareMinor
      ) {
        throw new Error(
          "Digital recovery proceeds must equal the immutable final fare.",
        );
      }

      if (
        !input.sourceReference?.trim()
      ) {
        throw new Error(
          "Digital recovery requires a source reference.",
        );
      }
    }

    const initial =
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
      initial.status ===
      "MISMATCH"
    ) {
      throw new Error(
        "Mobility financial recovery is blocked because reconciliation detected an accounting mismatch.",
      );
    }

    /*
     * The financial orchestrator is intentionally called even when
     * some stages already exist. Its own idempotency guarantees make
     * the retry safe and allow the settlement engine to continue
     * only from the missing stage.
     */
    await mobilityFinancialOrchestratorService
      .finalizeRideFinancials({
        organizationId:
          input.organizationId,

        rideId:
          input.rideId,

        finalFareMinor,

        availableDigitalProceedsMinor:
          payment.paymentMethod ===
          "DIGITAL"
            ? input.availableDigitalProceedsMinor
            : undefined,

        sourceReference:
          payment.paymentMethod ===
          "DIGITAL"
            ? input.sourceReference
            : undefined,

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
      const settlements =
        await prisma.$queryRaw<any[]>`
          SELECT
            *
          FROM "MobilitySettlement"
          WHERE
            "paymentId" = ${payment.id}
          LIMIT 1
        `;

      const settlement =
        settlements[0];

      if (!settlement) {
        throw new Error(
          "Mobility settlement was not created during recovery.",
        );
      }

      if (
        !payment.driverId
      ) {
        throw new Error(
          "Digital recovery requires an assigned driver.",
        );
      }

      const driverNetMinor =
        BigInt(
          settlement.driverNetAmountMinor,
        );

      const currentCommissionMinor =
        BigInt(
          payment.commissionAmountMinor,
        );

      const priorCashObligationsSettledMinor =
        BigInt(
          settlement.cashObligationSettledMinor,
        );

      const expectedAllocation =
        currentCommissionMinor +
        priorCashObligationsSettledMinor +
        driverNetMinor;

      if (
        expectedAllocation !==
        finalFareMinor
      ) {
        throw new Error(
          "Mobility recovery allocation does not reconcile to the immutable final fare.",
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
              finalFareMinor,

            availableDigitalProceedsMinor:
              input.availableDigitalProceedsMinor!,

            currentCommissionMinor,

            priorCashObligationsSettledMinor,

            driverNetMinor,

            sourceReference:
              input.sourceReference!,

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
