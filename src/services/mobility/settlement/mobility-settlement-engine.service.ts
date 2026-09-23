import {
  Prisma,
} from "@prisma/client";

import { randomUUID } from "node:crypto";

import { prisma } from "@/database/client/prisma";

import {
  FinancialAuditService,
} from "@/core/audit/financial-audit.service";

import {
  IdempotencyService,
} from "@/core/idempotency/idempotency.service";

import {
  mobilityCashSettlementService,
} from "@/services/mobility/payments/mobility-cash-settlement.service";

import type {
  MobilityCashObligationResult,
} from "@/services/mobility/payments/mobility-payment.contracts";

import type {
  CreateMobilitySettlementInput,
  CompleteMobilitySettlementInput,
  CancelMobilitySettlementInput,
  MobilitySettlementEngineResult,
} from "@/services/mobility/settlement/mobility-settlement-engine.contracts";

import type {
  MobilitySettlementResult,
  MobilitySettlementStatus,
} from "@/services/mobility/settlement/mobility-settlement-engine.types";

type SqlExecutor =
  | typeof prisma
  | Prisma.TransactionClient;

interface MobilityPaymentRecord {
  id: string;

  organizationId: string;
  rideId: string;
  riderId: string;
  driverId: string | null;

  currency: string;

  paymentMethod: "CASH" | "DIGITAL";
  status: string;

  finalFareMinor: bigint;
  commissionRateBps: number;
  commissionAmountMinor: bigint;

  driverGrossMinor: bigint;
  driverNetMinor: bigint;

  idempotencyKey: string;
}

interface MobilitySettlementRecord {
  id: string;

  organizationId: string;
  paymentId: string;
  rideId: string;
  driverId: string | null;

  currency: string;

  paymentMethod: "CASH" | "DIGITAL";
  status: MobilitySettlementStatus;

  grossAmountMinor: bigint;
  commissionAmountMinor: bigint;
  driverNetAmountMinor: bigint;

  cashObligationAmountMinor: bigint;
  cashObligationSettledMinor: bigint;

  sourceReference: string | null;

  idempotencyKey: string;

  metadata: unknown;

  processingStartedAt: Date | null;
  completedAt: Date | null;
  failedAt: Date | null;
  cancelledAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

const BPS_TOTAL = 10_000;

export class MobilitySettlementEngineService {
  private readonly idempotencyService =
    new IdempotencyService();

  private readonly financialAuditService =
    new FinancialAuditService();

  async createSettlement(
    input: CreateMobilitySettlementInput
  ): Promise<MobilitySettlementResult> {
    this.validateCreateInput(input);

    const requestBody = {
      organizationId:
        input.organizationId,

      paymentId:
        input.paymentId,
    };

    const result =
      await this.idempotencyService.execute(
        {
          key:
            input.idempotencyKey,

          scope:
            `mobility.settlement.create:${input.organizationId}`,

          userId:
            input.actorUserId,

          requestBody,
        },

        async () => {
          const settlement =
            await prisma.$transaction(
              async (database) => {
                const existing =
                  await this.findSettlementByPayment(
                    database,
                    input.paymentId
                  );

                if (existing) {
                  this.assertOrganization(
                    existing.organizationId,
                    input.organizationId
                  );

                  return existing;
                }

                const payment =
                  await this.requirePayment(
                    database,
                    input.paymentId
                  );

                this.assertOrganization(
                  payment.organizationId,
                  input.organizationId
                );

                if (
                  payment.status !==
                    "COLLECTED" &&
                  payment.status !==
                    "SETTLED"
                ) {
                  throw new Error(
                    `Mobility payment cannot enter settlement from status ${payment.status}.`
                  );
                }

                const id =
                  randomUUID();

                const rows =
                  await database.$queryRaw<
                    MobilitySettlementRecord[]
                  >`
                    INSERT INTO "MobilitySettlement" (
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
                      "idempotencyKey",
                      "metadata",
                      "createdAt",
                      "updatedAt"
                    )
                    VALUES (
                      ${id},
                      ${payment.organizationId},
                      ${payment.id},
                      ${payment.rideId},
                      ${payment.driverId},
                      ${payment.currency},
                      CAST(
                        ${payment.paymentMethod}
                        AS "MobilityPaymentMethod"
                      ),
                      CAST(
                        'PENDING'
                        AS "MobilitySettlementStatus"
                      ),
                      ${payment.finalFareMinor},
                      ${payment.commissionAmountMinor},
                      ${payment.driverNetMinor},
                      ${BigInt(0)},
                      ${BigInt(0)},
                      NULL,
                      ${input.idempotencyKey},
                      ${input.metadata
                        ? JSON.stringify(
                            input.metadata
                          )
                        : null}::jsonb,
                      CURRENT_TIMESTAMP,
                      CURRENT_TIMESTAMP
                    )
                    RETURNING
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
                      "idempotencyKey",
                      "metadata",
                      "processingStartedAt",
                      "completedAt",
                      "failedAt",
                      "cancelledAt",
                      "createdAt",
                      "updatedAt"
                  `;

                const created =
                  rows[0];

                if (!created) {
                  throw new Error(
                    "Unable to create Mobility settlement."
                  );
                }

                return created;
              },

              {
                isolationLevel:
                  Prisma.TransactionIsolationLevel.Serializable,

                maxWait: 5000,

                timeout: 10000,
              }
            );

          return {
            responseStatus: 200,

            responseBody:
              this.toResult(settlement),

            resourceType:
              "MOBILITY_SETTLEMENT",

            resourceId:
              settlement.id,
          };
        }
      );

    const responseBody =
      result.responseBody;

    if (!responseBody) {
      throw new Error(
        "Mobility settlement creation did not return a response body."
      );
    }

    await this.financialAuditService.record({
      organizationId:
        input.organizationId,

      actorUserId:
        input.actorUserId,

      action:
        "MOBILITY_SETTLEMENT_CREATED",

      entityType:
        "MOBILITY_SETTLEMENT",

      entityId:
        responseBody.id,

      correlationId:
        input.correlationId,

      requestId:
        input.requestId,

      ipAddress:
        input.ipAddress,

      userAgent:
        input.userAgent,

      metadata: {
        paymentId:
          input.paymentId,

        settlementId:
          responseBody.id,

        source:
          "MOBILITY_SETTLEMENT_ENGINE",
      },
    });

    return responseBody;
  }

  async completeSettlement(
    input: CompleteMobilitySettlementInput
  ): Promise<MobilitySettlementEngineResult> {
    this.validateCompleteInput(input);

    const settlement =
      await this.findSettlementByPayment(
        prisma,
        input.paymentId
      );

    if (!settlement) {
      throw new Error(
        "Mobility settlement was not found for the payment."
      );
    }

    this.assertOrganization(
      settlement.organizationId,
      input.organizationId
    );

    if (
      settlement.status ===
      "COMPLETED"
    ) {
      return this.buildCompletedResult(
        settlement
      );
    }

    if (
      settlement.status ===
        "CANCELLED" ||
      settlement.status ===
        "FAILED"
    ) {
      throw new Error(
        `Mobility settlement cannot be completed from status ${settlement.status}.`
      );
    }

    await prisma.$executeRaw`
      UPDATE "MobilitySettlement"
      SET
        "status" =
          CAST(
            'PROCESSING'
            AS "MobilitySettlementStatus"
          ),
        "processingStartedAt" =
          CURRENT_TIMESTAMP,
        "updatedAt" =
          CURRENT_TIMESTAMP
      WHERE
        "id" =
          ${settlement.id}
        AND
        "status" IN (
          CAST(
            'PENDING'
            AS "MobilitySettlementStatus"
          ),
          CAST(
            'PROCESSING'
            AS "MobilitySettlementStatus"
          )
        )
    `;

    const payment =
      await this.requirePayment(
        prisma,
        input.paymentId
      );

    this.assertOrganization(
      payment.organizationId,
      input.organizationId
    );

    if (
      payment.status !==
        "COLLECTED" &&
      payment.status !==
        "SETTLED"
    ) {
      throw new Error(
        `Mobility payment must be collected before settlement. Current status: ${payment.status}.`
      );
    }

    if (
      settlement.paymentMethod ===
      "CASH"
    ) {
      return this.completeCashSettlement(
        settlement,
        payment,
        input
      );
    }

    return this.completeDigitalSettlement(
      settlement,
      payment,
      input
    );
  }

  async cancelSettlement(
    input: CancelMobilitySettlementInput
  ): Promise<MobilitySettlementResult> {
    this.validateCancelInput(input);

    const result =
      await this.idempotencyService.execute(
        {
          key:
            input.idempotencyKey,

          scope:
            `mobility.settlement.cancel:${input.organizationId}`,

          userId:
            input.actorUserId,

          requestBody: {
            organizationId:
              input.organizationId,

            paymentId:
              input.paymentId,

            reason:
              input.reason,
          },
        },

        async () => {
          const settlement =
            await this.findSettlementByPayment(
              prisma,
              input.paymentId
            );

          if (!settlement) {
            throw new Error(
              "Mobility settlement was not found."
            );
          }

          this.assertOrganization(
            settlement.organizationId,
            input.organizationId
          );

          if (
            settlement.status ===
            "COMPLETED"
          ) {
            throw new Error(
              "A completed Mobility settlement cannot be cancelled."
            );
          }

          const rows =
            await prisma.$queryRaw<
              MobilitySettlementRecord[]
            >`
              UPDATE "MobilitySettlement"
              SET
                "status" =
                  CAST(
                    'CANCELLED'
                    AS "MobilitySettlementStatus"
                  ),

                "cancelledAt" =
                  CURRENT_TIMESTAMP,

                "metadata" =
                  COALESCE(
                    "metadata",
                    '{}'::jsonb
                  )
                  ||
                  jsonb_build_object(
                    'cancellationReason',
                    ${input.reason}
                  ),

                "updatedAt" =
                  CURRENT_TIMESTAMP

              WHERE
                "id" =
                  ${settlement.id}

              RETURNING
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
                "idempotencyKey",
                "metadata",
                "processingStartedAt",
                "completedAt",
                "failedAt",
                "cancelledAt",
                "createdAt",
                "updatedAt"
            `;

          const updated =
            rows[0];

          if (!updated) {
            throw new Error(
              "Unable to cancel Mobility settlement."
            );
          }

          return {
            responseStatus: 200,

            responseBody:
              this.toResult(updated),

            resourceType:
              "MOBILITY_SETTLEMENT",

            resourceId:
              updated.id,
          };
        }
      );

    const responseBody =
      result.responseBody;

    if (!responseBody) {
      throw new Error(
        "Mobility settlement cancellation did not return a response body."
      );
    }

    await this.financialAuditService.record({
      organizationId:
        input.organizationId,

      actorUserId:
        input.actorUserId,

      action:
        "MOBILITY_SETTLEMENT_CANCELLED",

      entityType:
        "MOBILITY_SETTLEMENT",

      entityId:
        responseBody.id,

      correlationId:
        input.correlationId,

      requestId:
        input.requestId,

      ipAddress:
        input.ipAddress,

      userAgent:
        input.userAgent,

      metadata: {
        paymentId:
          input.paymentId,

        reason:
          input.reason,

        source:
          "MOBILITY_SETTLEMENT_ENGINE",
      },
    });

    return responseBody;
  }

  async getByPayment(
    paymentId: string
  ): Promise<MobilitySettlementResult | null> {
    if (!paymentId.trim()) {
      throw new Error(
        "Payment ID is required."
      );
    }

    const settlement =
      await this.findSettlementByPayment(
        prisma,
        paymentId
      );

    return settlement
      ? this.toResult(settlement)
      : null;
  }

  private async completeCashSettlement(
    settlement: MobilitySettlementRecord,
    payment: MobilityPaymentRecord,
    input: CompleteMobilitySettlementInput
  ): Promise<MobilitySettlementEngineResult> {
    if (!payment.driverId) {
      throw new Error(
        "Cash Mobility settlement requires an assigned driver."
      );
    }

    const obligationKey =
      `mobility-cash-obligation:${payment.id}`;

    const obligation =
      await mobilityCashSettlementService.createCashObligation({
        organizationId:
          payment.organizationId,

        driverId:
          payment.driverId,

        rideId:
          payment.rideId,

        currency:
          payment.currency,

        grossFareMinor:
          payment.finalFareMinor,

        commissionRateBps:
          payment.commissionRateBps,

        commissionAmountMinor:
          payment.commissionAmountMinor,

        policyKey:
          "MOBILITY",

        policyVersion:
          1,

        idempotencyKey:
          obligationKey,

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

        metadata: {
          paymentId:
            payment.id,

          settlementId:
            settlement.id,

          source:
            "MOBILITY_SETTLEMENT_ENGINE",
        },
      });

    await prisma.$transaction(
      async (database) => {
        await database.$executeRaw`
          UPDATE "MobilitySettlement"
          SET
            "status" =
              CAST(
                'COMPLETED'
                AS "MobilitySettlementStatus"
              ),

            "cashObligationAmountMinor" =
              ${BigInt(
                obligation.commissionAmountMinor
              )},

            "cashObligationSettledMinor" =
              ${BigInt(0)},

            "driverNetAmountMinor" =
              ${payment.driverNetMinor},

            "completedAt" =
              CURRENT_TIMESTAMP,

            "updatedAt" =
              CURRENT_TIMESTAMP

          WHERE
            "id" =
              ${settlement.id}
        `;

        await database.$executeRaw`
          UPDATE "MobilityRidePayment"
          SET
            "status" =
              CAST(
                'SETTLED'
                AS "MobilityPaymentStatus"
              ),

            "settledAt" =
              CURRENT_TIMESTAMP,

            "updatedAt" =
              CURRENT_TIMESTAMP

          WHERE
            "id" =
              ${payment.id}
        `;
      },

      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,

        maxWait: 5000,

        timeout: 10000,
      }
    );

    const finalSettlement =
      await this.requireSettlement(
        prisma,
        settlement.id
      );

    await this.financialAuditService.record({
      organizationId:
        payment.organizationId,

      actorUserId:
        input.actorUserId,

      action:
        "MOBILITY_CASH_SETTLEMENT_COMPLETED",

      entityType:
        "MOBILITY_SETTLEMENT",

      entityId:
        settlement.id,

      correlationId:
        input.correlationId,

      requestId:
        input.requestId,

      ipAddress:
        input.ipAddress,

      userAgent:
        input.userAgent,

      metadata: {
        paymentId:
          payment.id,

        rideId:
          payment.rideId,

        driverId:
          payment.driverId,

        grossAmountMinor:
          payment.finalFareMinor.toString(),

        commissionAmountMinor:
          payment.commissionAmountMinor.toString(),

        cashObligationAmountMinor:
          obligation.commissionAmountMinor,

        driverNetAmountMinor:
          payment.driverNetMinor.toString(),

        source:
          "MOBILITY_SETTLEMENT_ENGINE",
      },
    });

    return {
      settlement:
        this.toResult(
          finalSettlement
        ),

      paymentStatus:
        "SETTLED",

      cashObligationCreatedMinor:
        obligation.commissionAmountMinor,

      cashObligationSettledMinor:
        "0",

      driverNetAmountMinor:
        payment.driverNetMinor.toString(),
    };
  }

  private async completeDigitalSettlement(
    settlement: MobilitySettlementRecord,
    payment: MobilityPaymentRecord,
    input: CompleteMobilitySettlementInput
  ): Promise<MobilitySettlementEngineResult> {
    if (!payment.driverId) {
      throw new Error(
        "Digital Mobility settlement requires an assigned driver."
      );
    }

    if (
      input.availableDigitalProceedsMinor ===
      undefined
    ) {
      throw new Error(
        "Available digital proceeds are required for digital Mobility settlement."
      );
    }

    if (
      !input.sourceReference?.trim()
    ) {
      throw new Error(
        "Digital Mobility settlement requires a source reference."
      );
    }

    const proceeds =
      input.availableDigitalProceedsMinor;

    if (proceeds < BigInt(0)) {
      throw new Error(
        "Digital proceeds cannot be negative."
      );
    }

    const cashSettlement =
      await mobilityCashSettlementService.applyDigitalSettlement({
        organizationId:
          payment.organizationId,

        driverId:
          payment.driverId,

        currency:
          payment.currency,

        availableDigitalProceedsMinor:
          proceeds,

        currentDigitalCommissionMinor:
          payment.commissionAmountMinor,

        sourceReference:
          input.sourceReference,

        idempotencyKey:
          input.idempotencyKey,

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

        metadata: {
          paymentId:
            payment.id,

          settlementId:
            settlement.id,

          source:
            "MOBILITY_SETTLEMENT_ENGINE",
        },
      });

    await prisma.$transaction(
      async (database) => {
        await database.$executeRaw`
          UPDATE "MobilitySettlement"
          SET
            "status" =
              CAST(
                'COMPLETED'
                AS "MobilitySettlementStatus"
              ),

            "cashObligationAmountMinor" =
              (
                SELECT
                  COALESCE(
                    SUM(
                      "commissionAmountMinor"
                    ),
                    0
                  )::bigint
                FROM "MobilityCashObligation"
                WHERE
                  "organizationId" =
                    ${payment.organizationId}
                  AND
                  "driverId" =
                    ${payment.driverId}
                  AND
                  "currency" =
                    ${payment.currency}
                  AND
                  "status" IN (
                    CAST(
                      'OPEN'
                      AS "MobilityCashObligationStatus"
                    ),
                    CAST(
                      'PARTIALLY_SETTLED'
                      AS "MobilityCashObligationStatus"
                    )
                  )
              ),

            "cashObligationSettledMinor" =
              ${BigInt(
                cashSettlement
                  .priorCashObligationsSettledMinor
              )},

            "driverNetAmountMinor" =
              ${BigInt(
                cashSettlement
                  .driverNetProceedsMinor
              )},

            "sourceReference" =
              ${input.sourceReference},

            "completedAt" =
              CURRENT_TIMESTAMP,

            "updatedAt" =
              CURRENT_TIMESTAMP

          WHERE
            "id" =
              ${settlement.id}
        `;

        await database.$executeRaw`
          UPDATE "MobilityRidePayment"
          SET
            "status" =
              CAST(
                'SETTLED'
                AS "MobilityPaymentStatus"
              ),

            "settledAt" =
              CURRENT_TIMESTAMP,

            "updatedAt" =
              CURRENT_TIMESTAMP

          WHERE
            "id" =
              ${payment.id}
        `;
      },

      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,

        maxWait: 5000,

        timeout: 10000,
      }
    );

    const finalSettlement =
      await this.requireSettlement(
        prisma,
        settlement.id
      );

    await this.financialAuditService.record({
      organizationId:
        payment.organizationId,

      actorUserId:
        input.actorUserId,

      action:
        "MOBILITY_DIGITAL_SETTLEMENT_COMPLETED",

      entityType:
        "MOBILITY_SETTLEMENT",

      entityId:
        settlement.id,

      correlationId:
        input.correlationId,

      requestId:
        input.requestId,

      ipAddress:
        input.ipAddress,

      userAgent:
        input.userAgent,

      metadata: {
        paymentId:
          payment.id,

        rideId:
          payment.rideId,

        driverId:
          payment.driverId,

        sourceReference:
          input.sourceReference,

        availableDigitalProceedsMinor:
          proceeds.toString(),

        currentDigitalCommissionMinor:
          payment.commissionAmountMinor.toString(),

        priorCashObligationsSettledMinor:
          cashSettlement
            .priorCashObligationsSettledMinor,

        driverNetProceedsMinor:
          cashSettlement
            .driverNetProceedsMinor,

        remainingCashObligationMinor:
          cashSettlement
            .remainingCashObligationMinor,

        source:
          "MOBILITY_SETTLEMENT_ENGINE",
      },
    });

    return {
      settlement:
        this.toResult(
          finalSettlement
        ),

      paymentStatus:
        "SETTLED",

      cashObligationCreatedMinor:
        "0",

      cashObligationSettledMinor:
        cashSettlement
          .priorCashObligationsSettledMinor,

      driverNetAmountMinor:
        cashSettlement
          .driverNetProceedsMinor,
    };
  }

  private async requirePayment(
    database: SqlExecutor,
    paymentId: string
  ): Promise<MobilityPaymentRecord> {
    const rows =
      await database.$queryRaw<
        MobilityPaymentRecord[]
      >`
        SELECT
          "id",
          "organizationId",
          "rideId",
          "riderId",
          "driverId",
          "currency",
          "paymentMethod",
          "status",
          "finalFareMinor",
          "commissionRateBps",
          "commissionAmountMinor",
          "driverGrossMinor",
          "driverNetMinor",
          "idempotencyKey"
        FROM "MobilityRidePayment"
        WHERE
          "id" =
            ${paymentId}
        LIMIT 1
      `;

    const payment =
      rows[0];

    if (!payment) {
      throw new Error(
        "Mobility payment was not found."
      );
    }

    return payment;
  }

  private async findSettlementByPayment(
    database: SqlExecutor,
    paymentId: string
  ): Promise<MobilitySettlementRecord | null> {
    const rows =
      await database.$queryRaw<
        MobilitySettlementRecord[]
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
          "idempotencyKey",
          "metadata",
          "processingStartedAt",
          "completedAt",
          "failedAt",
          "cancelledAt",
          "createdAt",
          "updatedAt"
        FROM "MobilitySettlement"
        WHERE
          "paymentId" =
            ${paymentId}
        LIMIT 1
      `;

    return rows[0] ?? null;
  }

  private async requireSettlement(
    database: SqlExecutor,
    settlementId: string
  ): Promise<MobilitySettlementRecord> {
    const rows =
      await database.$queryRaw<
        MobilitySettlementRecord[]
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
          "idempotencyKey",
          "metadata",
          "processingStartedAt",
          "completedAt",
          "failedAt",
          "cancelledAt",
          "createdAt",
          "updatedAt"
        FROM "MobilitySettlement"
        WHERE
          "id" =
            ${settlementId}
        LIMIT 1
      `;

    const settlement =
      rows[0];

    if (!settlement) {
      throw new Error(
        "Mobility settlement was not found."
      );
    }

    return settlement;
  }

  private buildCompletedResult(
    settlement: MobilitySettlementRecord
  ): MobilitySettlementEngineResult {
    return {
      settlement:
        this.toResult(
          settlement
        ),

      paymentStatus:
        "SETTLED",

      cashObligationCreatedMinor:
        settlement
          .cashObligationAmountMinor
          .toString(),

      cashObligationSettledMinor:
        settlement
          .cashObligationSettledMinor
          .toString(),

      driverNetAmountMinor:
        settlement
          .driverNetAmountMinor
          .toString(),
    };
  }

  private toResult(
    settlement: MobilitySettlementRecord
  ): MobilitySettlementResult {
    return {
      id:
        settlement.id,

      organizationId:
        settlement.organizationId,

      paymentId:
        settlement.paymentId,

      rideId:
        settlement.rideId,

      driverId:
        settlement.driverId,

      currency:
        settlement.currency,

      paymentMethod:
        settlement.paymentMethod,

      status:
        settlement.status,

      grossAmountMinor:
        settlement.grossAmountMinor.toString(),

      commissionAmountMinor:
        settlement.commissionAmountMinor.toString(),

      driverNetAmountMinor:
        settlement.driverNetAmountMinor.toString(),

      cashObligationAmountMinor:
        settlement
          .cashObligationAmountMinor
          .toString(),

      cashObligationSettledMinor:
        settlement
          .cashObligationSettledMinor
          .toString(),

      sourceReference:
        settlement.sourceReference,

      createdAt:
        settlement.createdAt,

      updatedAt:
        settlement.updatedAt,

      processingStartedAt:
        settlement.processingStartedAt,

      completedAt:
        settlement.completedAt,

      failedAt:
        settlement.failedAt,

      cancelledAt:
        settlement.cancelledAt,
    };
  }

  private assertOrganization(
    actualOrganizationId: string,
    expectedOrganizationId: string
  ): void {
    if (
      actualOrganizationId !==
      expectedOrganizationId
    ) {
      throw new Error(
        "Mobility settlement organization mismatch."
      );
    }
  }

  private validateCreateInput(
    input: CreateMobilitySettlementInput
  ): void {
    if (
      !input.organizationId.trim()
    ) {
      throw new Error(
        "Mobility organizationId is required."
      );
    }

    if (
      !input.paymentId.trim()
    ) {
      throw new Error(
        "Mobility paymentId is required."
      );
    }

    if (
      !input.idempotencyKey.trim()
    ) {
      throw new Error(
        "Mobility settlement idempotency key is required."
      );
    }
  }

  private validateCompleteInput(
    input: CompleteMobilitySettlementInput
  ): void {
    if (
      !input.organizationId.trim()
    ) {
      throw new Error(
        "Mobility organizationId is required."
      );
    }

    if (
      !input.paymentId.trim()
    ) {
      throw new Error(
        "Mobility paymentId is required."
      );
    }

    if (
      !input.idempotencyKey.trim()
    ) {
      throw new Error(
        "Mobility settlement idempotency key is required."
      );
    }

    if (
      input.availableDigitalProceedsMinor !==
        undefined &&
      input.availableDigitalProceedsMinor <
        BigInt(0)
    ) {
      throw new Error(
        "Digital proceeds cannot be negative."
      );
    }
  }

  private validateCancelInput(
    input: CancelMobilitySettlementInput
  ): void {
    if (
      !input.organizationId.trim()
    ) {
      throw new Error(
        "Mobility organizationId is required."
      );
    }

    if (
      !input.paymentId.trim()
    ) {
      throw new Error(
        "Mobility paymentId is required."
      );
    }

    if (
      !input.reason.trim()
    ) {
      throw new Error(
        "Mobility settlement cancellation reason is required."
      );
    }

    if (
      !input.idempotencyKey.trim()
    ) {
      throw new Error(
        "Mobility settlement cancellation idempotency key is required."
      );
    }
  }
}

export const mobilitySettlementEngineService =
  new MobilitySettlementEngineService();
