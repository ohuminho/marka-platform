import {
  Prisma,
  TransactionStatus,
} from "@prisma/client";

import { prisma } from "@/database/client/prisma";

import {
  mobilityFinancialCoreBridgeService,
} from "@/services/mobility/finance/mobility-financial-core-bridge.service";

import {
  mobilityFinancialOrchestratorService,
} from "@/services/mobility/finance/mobility-financial-orchestrator.service";

import {
  financialAuditService,
} from "@/core/audit/financial-audit.service";

export type MobilityFinancialRecoveryStatus =
  | "NOT_REQUIRED"
  | "RECOVERABLE"
  | "RECOVERED"
  | "BLOCKED"
  | "MISMATCH";

export interface MobilityFinancialRecoveryInput {
  organizationId: string;
  rideId: string;

  actorUserId?: string;

  correlationId?: string;
  requestId?: string;

  ipAddress?: string;
  userAgent?: string;

  finalFareMinor?: bigint;
  availableDigitalProceedsMinor?: bigint;
  sourceReference?: string;

  paymentIdempotencyKey?: string;
  settlementIdempotencyKey?: string;
  settlementCompletionIdempotencyKey?: string;

  metadata?: Record<string, unknown>;
}

export interface MobilityFinancialReconciliation {
  settlementId: string | null;
  paymentId: string | null;

  paymentStatus: string | null;
  settlementStatus: string | null;

  financialTransactionId: string | null;
  vendorPayableTransactionId: string | null;
  commissionTransactionId: string | null;
  cashObligationSettlementTransactionId: string | null;

  expectedDigitalProceedsMinor: string;
  financialCapturedMinor: string;

  currentCommissionMinor: string;
  priorCashObligationsSettledMinor: string;
  driverNetMinor: string;

  allocatedMinor: string;

  reconciled: boolean;

  status: MobilityFinancialRecoveryStatus;

  missingStages: string[];

  inconsistencies: string[];
}

export interface MobilityFinancialRecoveryResult {
  status: MobilityFinancialRecoveryStatus;

  rideId: string;

  reconciliation: MobilityFinancialReconciliation;

  recovered: boolean;

  message: string;
}

interface PaymentRow {
  id: string;
  organizationId: string;
  rideId: string;
  driverId: string | null;
  currency: string;
  paymentMethod: "CASH" | "DIGITAL";
  status: string;
  finalFareMinor: bigint;
  commissionAmountMinor: bigint;
  driverNetMinor: bigint;
}

interface SettlementRow {
  id: string;
  organizationId: string;
  paymentId: string;
  rideId: string;
  driverId: string | null;
  currency: string;
  paymentMethod: "CASH" | "DIGITAL";
  status: string;

  grossAmountMinor: bigint;
  commissionAmountMinor: bigint;
  driverNetAmountMinor: bigint;

  cashObligationAmountMinor: bigint;
  cashObligationSettledMinor: bigint;

  sourceReference: string | null;

  financialTransactionId: string | null;
  vendorPayableTransactionId: string | null;
  commissionTransactionId: string | null;
  cashObligationSettlementTransactionId: string | null;
}

interface TransactionRow {
  id: string;
  status: TransactionStatus;
  amountMinor: bigint;
  currency: string;
  type: string;
  direction: string;
  sourceAccountId: string | null;
  destinationAccountId: string;
}

const ZERO = BigInt(0);

export class MobilityFinancialRecoveryService {
  async reconcile(
    input: MobilityFinancialRecoveryInput
  ): Promise<MobilityFinancialReconciliation> {
    this.validateInput(input);

    const payment =
      await this.findPayment(
        input.organizationId,
        input.rideId
      );

    if (!payment) {
      return {
        settlementId: null,
        paymentId: null,

        paymentStatus: null,
        settlementStatus: null,

        financialTransactionId: null,
        vendorPayableTransactionId: null,
        commissionTransactionId: null,
        cashObligationSettlementTransactionId:
          null,

        expectedDigitalProceedsMinor:
          "0",

        financialCapturedMinor:
          "0",

        currentCommissionMinor:
          "0",

        priorCashObligationsSettledMinor:
          "0",

        driverNetMinor:
          "0",

        allocatedMinor:
          "0",

        reconciled: false,

        status:
          "BLOCKED",

        missingStages: [
          "PAYMENT",
        ],

        inconsistencies: [
          "Mobility payment was not found for the ride.",
        ],
      };
    }

    const settlement =
      await this.findSettlement(
        payment.id
      );

    if (!settlement) {
      return {
        settlementId: null,
        paymentId: payment.id,

        paymentStatus:
          payment.status,

        settlementStatus: null,

        financialTransactionId: null,
        vendorPayableTransactionId: null,
        commissionTransactionId: null,
        cashObligationSettlementTransactionId:
          null,

        expectedDigitalProceedsMinor:
          payment.finalFareMinor.toString(),

        financialCapturedMinor:
          "0",

        currentCommissionMinor:
          payment.commissionAmountMinor.toString(),

        priorCashObligationsSettledMinor:
          "0",

        driverNetMinor:
          payment.driverNetMinor.toString(),

        allocatedMinor:
          "0",

        reconciled: false,

        status:
          "RECOVERABLE",

        missingStages: [
          "SETTLEMENT",
        ],

        inconsistencies: [],
      };
    }

    if (
      settlement.paymentMethod ===
      "CASH"
    ) {
      return {
        settlementId:
          settlement.id,

        paymentId:
          payment.id,

        paymentStatus:
          payment.status,

        settlementStatus:
          settlement.status,

        financialTransactionId:
          settlement.financialTransactionId,

        vendorPayableTransactionId:
          settlement.vendorPayableTransactionId,

        commissionTransactionId:
          settlement.commissionTransactionId,

        cashObligationSettlementTransactionId:
          settlement.cashObligationSettlementTransactionId,

        expectedDigitalProceedsMinor:
          "0",

        financialCapturedMinor:
          "0",

        currentCommissionMinor:
          settlement.commissionAmountMinor.toString(),

        priorCashObligationsSettledMinor:
          settlement.cashObligationSettledMinor.toString(),

        driverNetMinor:
          settlement.driverNetAmountMinor.toString(),

        allocatedMinor:
          settlement.grossAmountMinor.toString(),

        reconciled:
          settlement.status ===
          "COMPLETED",

        status:
          settlement.status ===
          "COMPLETED"
            ? "NOT_REQUIRED"
            : "RECOVERABLE",

        missingStages:
          settlement.status ===
          "COMPLETED"
            ? []
            : [
                "CASH_SETTLEMENT",
              ],

        inconsistencies: [],
      };
    }

    const financialTransaction =
      settlement.financialTransactionId
        ? await this.findTransaction(
            settlement.financialTransactionId
          )
        : null;

    const vendorTransaction =
      settlement.vendorPayableTransactionId
        ? await this.findTransaction(
            settlement.vendorPayableTransactionId
          )
        : null;

    const commissionTransaction =
      settlement.commissionTransactionId
        ? await this.findTransaction(
            settlement.commissionTransactionId
          )
        : null;

    const cashObligationTransaction =
      settlement.cashObligationSettlementTransactionId
        ? await this.findTransaction(
            settlement.cashObligationSettlementTransactionId
          )
        : null;

    const expected =
      payment.finalFareMinor;

    const captured =
      financialTransaction?.amountMinor ??
      ZERO;

    const currentCommission =
      payment.commissionAmountMinor;

    const priorCash =
      settlement.cashObligationSettledMinor;

    const driverNet =
      settlement.driverNetAmountMinor;

    const allocated =
      currentCommission +
      priorCash +
      driverNet;

    const missingStages: string[] = [];

    if (
      !financialTransaction ||
      financialTransaction.status !==
        TransactionStatus.COMPLETED
    ) {
      missingStages.push(
        "EXTERNAL_CAPTURE"
      );
    }

    if (
      currentCommission > ZERO &&
      (
        !commissionTransaction ||
        commissionTransaction.status !==
          TransactionStatus.COMPLETED
      )
    ) {
      missingStages.push(
        "CURRENT_COMMISSION"
      );
    }

    if (
      priorCash > ZERO &&
      (
        !cashObligationTransaction ||
        cashObligationTransaction.status !==
          TransactionStatus.COMPLETED
      )
    ) {
      missingStages.push(
        "PRIOR_CASH_OBLIGATIONS"
      );
    }

    if (
      driverNet > ZERO &&
      (
        !vendorTransaction ||
        vendorTransaction.status !==
          TransactionStatus.COMPLETED
      )
    ) {
      missingStages.push(
        "DRIVER_PAYABLE"
      );
    }

    const inconsistencies: string[] = [];

    if (
      financialTransaction &&
      captured !== expected
    ) {
      inconsistencies.push(
        `Financial capture ${captured.toString()} does not equal expected proceeds ${expected.toString()}.`
      );
    }

    if (
      allocated !== expected
    ) {
      inconsistencies.push(
        `Financial allocation ${allocated.toString()} does not equal expected proceeds ${expected.toString()}.`
      );
    }

    if (
      settlement.commissionAmountMinor !==
      payment.commissionAmountMinor
    ) {
      inconsistencies.push(
        "Settlement commission does not match Mobility payment commission."
      );
    }

    if (
      settlement.driverNetAmountMinor !==
      payment.driverNetMinor
    ) {
      inconsistencies.push(
        "Settlement driver net does not match Mobility payment driver net."
      );
    }

    const reconciled =
      inconsistencies.length ===
        0 &&
      missingStages.length ===
        0 &&
      captured === expected &&
      allocated === expected;

    return {
      settlementId:
        settlement.id,

      paymentId:
        payment.id,

      paymentStatus:
        payment.status,

      settlementStatus:
        settlement.status,

      financialTransactionId:
        settlement.financialTransactionId,

      vendorPayableTransactionId:
        settlement.vendorPayableTransactionId,

      commissionTransactionId:
        settlement.commissionTransactionId,

      cashObligationSettlementTransactionId:
        settlement.cashObligationSettlementTransactionId,

      expectedDigitalProceedsMinor:
        expected.toString(),

      financialCapturedMinor:
        captured.toString(),

      currentCommissionMinor:
        currentCommission.toString(),

      priorCashObligationsSettledMinor:
        priorCash.toString(),

      driverNetMinor:
        driverNet.toString(),

      allocatedMinor:
        allocated.toString(),

      reconciled,

      status:
        reconciled
          ? "RECOVERED"
          : inconsistencies.length > 0
            ? "MISMATCH"
            : "RECOVERABLE",

      missingStages,

      inconsistencies,
    };
  }

  async recover(
    input: MobilityFinancialRecoveryInput
  ): Promise<MobilityFinancialRecoveryResult> {
    this.validateInput(input);

    const before =
      await this.reconcile(
        input
      );

    if (
      before.status ===
        "NOT_REQUIRED" ||
      before.reconciled
    ) {
      return {
        status:
          "NOT_REQUIRED",

        rideId:
          input.rideId,

        reconciliation:
          before,

        recovered:
          false,

        message:
          "Mobility financials are already reconciled.",
      };
    }

    if (
      before.status ===
      "MISMATCH"
    ) {
      await financialAuditService.record({
        organizationId:
          input.organizationId,

        actorUserId:
          input.actorUserId,

        action:
          "MOBILITY_FINANCIAL_RECONCILIATION_MISMATCH",

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

        metadata: {
          reconciliation:
            before,
        },
      });

      return {
        status:
          "MISMATCH",

        rideId:
          input.rideId,

        reconciliation:
          before,

        recovered:
          false,

        message:
          "Mobility financial reconciliation found an accounting mismatch. Automatic recovery was blocked.",
      };
    }

    const payment =
      await this.findPayment(
        input.organizationId,
        input.rideId
      );

    if (!payment) {
      throw new Error(
        "Mobility payment is required for financial recovery."
      );
    }

    if (
      payment.paymentMethod ===
      "CASH"
    ) {
      const result =
        await mobilityFinancialOrchestratorService
          .finalizeRideFinancials({
            organizationId:
              input.organizationId,

            rideId:
              input.rideId,

            finalFareMinor:
              input.finalFareMinor ??
              payment.finalFareMinor,

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

              recovery:
                true,
            },
          });

      const after =
        await this.reconcile(
          input
        );

      return {
        status:
          after.reconciled
            ? "RECOVERED"
            : "RECOVERABLE",

        rideId:
          input.rideId,

        reconciliation:
          after,

        recovered:
          after.reconciled,

        message:
          after.reconciled
            ? "Mobility cash financials recovered successfully."
            : "Mobility cash financial recovery remains incomplete.",
      };
    }

    if (
      input.availableDigitalProceedsMinor ===
      undefined
    ) {
      return {
        status:
          "RECOVERABLE",

        rideId:
          input.rideId,

        reconciliation:
          before,

        recovered:
          false,

        message:
          "Digital financial recovery requires the confirmed available digital proceeds.",
      };
    }

    if (
      !input.sourceReference?.trim()
    ) {
      return {
        status:
          "RECOVERABLE",

        rideId:
          input.rideId,

        reconciliation:
          before,

        recovered:
          false,

        message:
          "Digital financial recovery requires the external source reference.",
      };
    }

    /*
     * First make sure Mobility's own payment/settlement
     * state is complete. Every operation uses stable
     * idempotency keys, therefore a retry cannot create
     * a second payment or settlement.
     */
    await mobilityFinancialOrchestratorService
      .finalizeRideFinancials({
        organizationId:
          input.organizationId,

        rideId:
          input.rideId,

        finalFareMinor:
          input.finalFareMinor ??
          payment.finalFareMinor,

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

          recovery:
            true,
        },
      });

    const settlement =
      await this.findSettlement(
        payment.id
      );

    if (!settlement) {
      throw new Error(
        "Mobility settlement was not created during recovery."
      );
    }

    /*
     * Financial Core is deliberately reconciled from the
     * authoritative Mobility settlement amounts.
     *
     * The bridge itself is idempotent by settlement ID.
     */
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
            payment.driverId ??
            (() => {
              throw new Error(
                "Digital Mobility recovery requires an assigned driver."
              );
            })(),

          currency:
            payment.currency,

          grossFareMinor:
            payment.finalFareMinor,

          availableDigitalProceedsMinor:
            input.availableDigitalProceedsMinor,

          currentCommissionMinor:
            payment.commissionAmountMinor,

          priorCashObligationsSettledMinor:
            settlement.cashObligationSettledMinor,

          driverNetMinor:
            settlement.driverNetAmountMinor,

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

    await this.persistFinancialLinks(
      settlement.id,
      bridge
    );

    const after =
      await this.reconcile(
        input
      );

    const recovered =
      after.reconciled;

    await financialAuditService.record({
      organizationId:
        input.organizationId,

      actorUserId:
        input.actorUserId,

      action:
        recovered
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

      metadata: {
        settlementId:
          settlement.id,

        paymentId:
          payment.id,

        reconciliation:
          after,
      },
    });

    return {
      status:
        recovered
          ? "RECOVERED"
          : "RECOVERABLE",

      rideId:
        input.rideId,

      reconciliation:
        after,

      recovered,

      message:
        recovered
          ? "Mobility Financial Core recovery completed and reconciled."
          : "Mobility recovery executed, but reconciliation is still incomplete.",
    };
  }

  private async findPayment(
    organizationId: string,
    rideId: string
  ): Promise<PaymentRow | null> {
    const rows =
      await prisma.$queryRaw<
        PaymentRow[]
      >`
        SELECT
          "id",
          "organizationId",
          "rideId",
          "driverId",
          "currency",
          "paymentMethod",
          "status",
          "finalFareMinor",
          "commissionAmountMinor",
          "driverNetMinor"
        FROM "MobilityRidePayment"
        WHERE
          "organizationId" =
            ${organizationId}
          AND
          "rideId" =
            ${rideId}
        ORDER BY
          "createdAt" DESC
        LIMIT 1
      `;

    return rows[0] ??
      null;
  }

  private async findSettlement(
    paymentId: string
  ): Promise<SettlementRow | null> {
    const rows =
      await prisma.$queryRaw<
        SettlementRow[]
      >`
        SELECT
          "id",
          "organizationId",
          "paymentId",
          "rideId",
          "driverId",
          "currency",
          "paymentMethod",
          "status",
          "grossAmountMinor",
          "commissionAmountMinor",
          "driverNetAmountMinor",
          "cashObligationAmountMinor",
          "cashObligationSettledMinor",
          "sourceReference",
          "financialTransactionId",
          "vendorPayableTransactionId",
          "commissionTransactionId",
          "cashObligationSettlementTransactionId"
        FROM "MobilitySettlement"
        WHERE
          "paymentId" =
            ${paymentId}
        LIMIT 1
      `;

    return rows[0] ??
      null;
  }

  private async findTransaction(
    transactionId: string
  ): Promise<TransactionRow | null> {
    const transaction =
      await prisma.transaction.findUnique({
        where: {
          id:
            transactionId,
        },

        select: {
          id: true,
          status: true,
          amountMinor: true,
          currency: true,
          type: true,
          direction: true,
          sourceAccountId: true,
          destinationAccountId: true,
        },
      });

    return transaction;
  }

  private async persistFinancialLinks(
    settlementId: string,
    links: {
      financialTransactionId: string;
      vendorPayableTransactionId:
        string | null;
      commissionTransactionId:
        string | null;
      cashObligationSettlementTransactionId:
        string | null;
    }
  ): Promise<void> {
    await prisma.$executeRaw`
      UPDATE "MobilitySettlement"
      SET
        "financialTransactionId" =
          ${links.financialTransactionId},

        "vendorPayableTransactionId" =
          ${links.vendorPayableTransactionId},

        "commissionTransactionId" =
          ${links.commissionTransactionId},

        "cashObligationSettlementTransactionId" =
          ${links.cashObligationSettlementTransactionId},

        "updatedAt" =
          CURRENT_TIMESTAMP
      WHERE
        "id" =
          ${settlementId}
    `;
  }

  private validateInput(
    input: MobilityFinancialRecoveryInput
  ): void {
    if (
      !input.organizationId.trim()
    ) {
      throw new Error(
        "Mobility organizationId is required."
      );
    }

    if (
      !input.rideId.trim()
    ) {
      throw new Error(
        "Mobility rideId is required."
      );
    }

    if (
      input.finalFareMinor !==
        undefined &&
      input.finalFareMinor < ZERO
    ) {
      throw new Error(
        "Final fare cannot be negative."
      );
    }

    if (
      input.availableDigitalProceedsMinor !==
        undefined &&
      input.availableDigitalProceedsMinor <
        ZERO
    ) {
      throw new Error(
        "Digital proceeds cannot be negative."
      );
    }
  }
}

export const mobilityFinancialRecoveryService =
  new MobilityFinancialRecoveryService();
