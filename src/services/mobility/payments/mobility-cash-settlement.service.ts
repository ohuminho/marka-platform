import { randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";

import { prisma } from "@/database/client/prisma";
import { IdempotencyService } from "@/core/idempotency/idempotency.service";
import { FinancialAuditService } from "@/core/audit/financial-audit.service";

import {
  type ApplyMobilityCashSettlementInput,
  type CreateMobilityCashObligationInput,
  type MobilityCashObligationRecord,
  type MobilityCashObligationResult,
  type MobilityCashObligationSettlementRecord,
  type MobilityCashObligationStatus,
  type MobilityCashSettlementResult,
} from "@/services/mobility/payments/mobility-payment.contracts";

const BPS_TOTAL = 10_000;

const OPEN_STATUSES = [
  "OPEN",
  "PARTIALLY_SETTLED",
] as const;

type SqlExecutor =
  | typeof prisma
  | Prisma.TransactionClient;

export class MobilityCashSettlementService {
  private readonly idempotencyService =
    new IdempotencyService();

  private readonly financialAuditService =
    new FinancialAuditService();

  async createCashObligation(
    input: CreateMobilityCashObligationInput
  ): Promise<MobilityCashObligationResult> {
    this.validateCreateInput(input);

    const requestBody = {
      organizationId: input.organizationId,
      driverId: input.driverId,
      rideId: input.rideId,
      currency: input.currency,
      grossFareMinor:
        input.grossFareMinor.toString(),
      commissionRateBps:
        input.commissionRateBps,
      commissionAmountMinor:
        input.commissionAmountMinor.toString(),
      policyKey: input.policyKey,
      policyVersion:
        input.policyVersion,
    };

    const result =
      await this.idempotencyService.execute(
        {
          key: input.idempotencyKey,
          scope:
            `mobility.cash-obligation.create:${input.organizationId}`,
          userId: input.actorUserId,
          requestBody,
        },
        async () => {
          const obligation =
            await prisma.$transaction(
              async (database) => {
                await this.requireActiveOrganization(
                  database,
                  input.organizationId
                );

                await this.requireActiveDriver(
                  database,
                  input.organizationId,
                  input.driverId
                );

                await this.requireCompletedRide(
                  database,
                  input.organizationId,
                  input.driverId,
                  input.rideId,
                  input.currency
                );

                const existing =
                  await this.findObligationByRide(
                    database,
                    input.rideId
                  );

                if (existing) {
                  if (
                    existing.idempotencyKey !==
                    input.idempotencyKey
                  ) {
                    throw new Error(
                      "A cash obligation already exists for this ride."
                    );
                  }

                  return existing;
                }

                const id =
                  randomUUID();

                const rows =
                  await database.$queryRaw<
                    MobilityCashObligationRecord[]
                  >`
                    INSERT INTO "MobilityCashObligation" (
                      "id",
                      "organizationId",
                      "driverId",
                      "rideId",
                      "currency",
                      "grossFareMinor",
                      "commissionRateBps",
                      "commissionAmountMinor",
                      "settledAmountMinor",
                      "remainingAmountMinor",
                      "status",
                      "idempotencyKey",
                      "policyKey",
                      "policyVersion",
                      "metadata",
                      "createdAt",
                      "updatedAt"
                    )
                    VALUES (
                      ${id},
                      ${input.organizationId},
                      ${input.driverId},
                      ${input.rideId},
                      ${input.currency},
                      ${input.grossFareMinor},
                      ${input.commissionRateBps},
                      ${input.commissionAmountMinor},
                      ${BigInt(0)},
                      ${input.commissionAmountMinor},
                      CAST('OPEN' AS "MobilityCashObligationStatus"),
                      ${input.idempotencyKey},
                      ${input.policyKey},
                      ${input.policyVersion},
                      ${
                        input.metadata
                          ? (input.metadata as Prisma.InputJsonValue)
                          : null
                      },
                      CURRENT_TIMESTAMP,
                      CURRENT_TIMESTAMP
                    )
                    RETURNING
                      "id",
                      "organizationId",
                      "driverId",
                      "rideId",
                      "currency",
                      "grossFareMinor",
                      "commissionRateBps",
                      "commissionAmountMinor",
                      "settledAmountMinor",
                      "remainingAmountMinor",
                      "status",
                      "idempotencyKey",
                      "policyKey",
                      "policyVersion",
                      "metadata",
                      "createdAt",
                      "updatedAt"
                  `;

                const created =
                  rows[0];

                if (!created) {
                  throw new Error(
                    "Unable to create Mobility cash obligation."
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

          await this.financialAuditService.record({
            organizationId:
              obligation.organizationId,

            actorUserId:
              input.actorUserId,

            action:
              "MOBILITY_CASH_OBLIGATION_CREATED",

            entityType:
              "MOBILITY_CASH_OBLIGATION",

            entityId:
              obligation.id,

            correlationId:
              input.correlationId,

            requestId:
              input.requestId,

            ipAddress:
              input.ipAddress,

            userAgent:
              input.userAgent,

            metadata: {
              obligationId:
                obligation.id,

              rideId:
                obligation.rideId,

              driverId:
                obligation.driverId,

              grossFareMinor:
                obligation.grossFareMinor.toString(),

              commissionAmountMinor:
                obligation.commissionAmountMinor.toString(),

              currency:
                obligation.currency,

              policyKey:
                obligation.policyKey,

              policyVersion:
                obligation.policyVersion,

              source:
                "MOBILITY_CASH_RIDE",
            },
          });

          return {
            responseStatus: 201,
            responseBody:
              this.toResult(obligation),
            resourceType:
              "MOBILITY_CASH_OBLIGATION",
            resourceId:
              obligation.id,
          };
        }
      );

    return result.responseBody as MobilityCashObligationResult;
  }

  async applyDigitalSettlement(
    input: ApplyMobilityCashSettlementInput
  ): Promise<MobilityCashSettlementResult> {
    this.validateSettlementInput(input);

    const requestBody = {
      organizationId:
        input.organizationId,

      driverId:
        input.driverId,

      currency:
        input.currency,

      availableDigitalProceedsMinor:
        input.availableDigitalProceedsMinor.toString(),

      currentDigitalCommissionMinor:
        input.currentDigitalCommissionMinor.toString(),

      sourceReference:
        input.sourceReference,
    };

    const result =
      await this.idempotencyService.execute(
        {
          key: input.idempotencyKey,
          scope:
            `mobility.cash-obligation.settle:${input.organizationId}`,
          userId: input.actorUserId,
          requestBody,
        },
        async () => {
          const settlement =
            await prisma.$transaction(
              async (database) => {
                await this.requireActiveDriver(
                  database,
                  input.organizationId,
                  input.driverId
                );

                const obligations =
                  await this.findOpenObligations(
                    database,
                    input.organizationId,
                    input.driverId,
                    input.currency
                  );

                let available =
                  BigInt(
                    input.availableDigitalProceedsMinor
                  );

                let previousCashSettled =
                  BigInt(0);

                const settlements:
                  MobilityCashSettlementResult["settlements"] =
                  [];

                for (
                  const obligation of obligations
                ) {
                  if (
                    available <=
                    BigInt(0)
                  ) {
                    break;
                  }

                  const remaining =
                    BigInt(
                      obligation.remainingAmountMinor
                    );

                  const amount =
                    available < remaining
                      ? available
                      : remaining;

                  if (
                    amount <=
                    BigInt(0)
                  ) {
                    continue;
                  }

                  const newSettledAmount =
                    BigInt(
                      obligation.settledAmountMinor
                    ) + amount;

                  const newRemainingAmount =
                    remaining - amount;

                  const newStatus =
                    newRemainingAmount ===
                    BigInt(0)
                      ? "SETTLED"
                      : "PARTIALLY_SETTLED";

                  const settlementId =
                    randomUUID();

                  const settlementReference =
                    `MOBILITY-CASH-SETTLEMENT-${randomUUID()
                      .replace(/-/g, "")
                      .toUpperCase()}`;

                  const settlementRows =
                    await database.$queryRaw<
                      MobilityCashObligationSettlementRecord[]
                    >`
                      INSERT INTO "MobilityCashObligationSettlement" (
                        "id",
                        "organizationId",
                        "obligationId",
                        "settlementReference",
                        "sourceReference",
                        "amountMinor",
                        "currency",
                        "metadata",
                        "createdAt"
                      )
                      VALUES (
                        ${settlementId},
                        ${input.organizationId},
                        ${obligation.id},
                        ${settlementReference},
                        ${input.sourceReference},
                        ${amount},
                        ${input.currency},
                        ${
                          input.metadata
                            ? (input.metadata as Prisma.InputJsonValue)
                            : null
                        },
                        CURRENT_TIMESTAMP
                      )
                      RETURNING
                        "id",
                        "organizationId",
                        "obligationId",
                        "settlementReference",
                        "sourceReference",
                        "amountMinor",
                        "currency",
                        "metadata",
                        "createdAt"
                    `;

                  const settlement =
                    settlementRows[0];

                  if (!settlement) {
                    throw new Error(
                      "Unable to record Mobility cash settlement."
                    );
                  }

                  await database.$executeRaw`
                    UPDATE "MobilityCashObligation"
                    SET
                      "settledAmountMinor" =
                        ${newSettledAmount},
                      "remainingAmountMinor" =
                        ${newRemainingAmount},
                      "status" =
                        CAST(
                          ${newStatus}
                          AS "MobilityCashObligationStatus"
                        ),
                      "updatedAt" =
                        CURRENT_TIMESTAMP
                    WHERE
                      "id" =
                        ${obligation.id}
                      AND
                      "remainingAmountMinor" =
                        ${remaining}
                      AND
                      "status" IN (
                        CAST('OPEN' AS "MobilityCashObligationStatus"),
                        CAST(
                          'PARTIALLY_SETTLED'
                          AS "MobilityCashObligationStatus"
                        )
                      )
                  `;

                  available -= amount;

                  previousCashSettled +=
                    amount;

                  settlements.push({
                    obligationId:
                      obligation.id,

                    rideId:
                      obligation.rideId,

                    amountMinor:
                      amount.toString(),

                    remainingObligationMinor:
                      newRemainingAmount.toString(),
                  });

                  await this.financialAuditService.record({
                    organizationId:
                      input.organizationId,

                    actorUserId:
                      input.actorUserId,

                    action:
                      "MOBILITY_CASH_OBLIGATION_SETTLED",

                    entityType:
                      "MOBILITY_CASH_OBLIGATION",

                    entityId:
                      obligation.id,

                    correlationId:
                      input.correlationId,

                    requestId:
                      input.requestId,

                    ipAddress:
                      input.ipAddress,

                    userAgent:
                      input.userAgent,

                    metadata: {
                      obligationId:
                        obligation.id,

                      settlementId:
                        settlement.id,

                      settlementReference,

                      sourceReference:
                        input.sourceReference,

                      driverId:
                        input.driverId,

                      rideId:
                        obligation.rideId,

                      amountMinor:
                        amount.toString(),

                      remainingAmountMinor:
                        newRemainingAmount.toString(),

                      status:
                        newStatus,

                      currency:
                        input.currency,

                      source:
                        "MOBILITY_DIGITAL_PROCEEDS",
                    },
                  });
                }

                const currentCommission =
                  BigInt(
                    input.currentDigitalCommissionMinor
                  );

                const totalDeducted =
                  currentCommission +
                  previousCashSettled;

                const digitalProceeds =
                  BigInt(
                    input.availableDigitalProceedsMinor
                  );

                if (
                  totalDeducted >
                  digitalProceeds
                ) {
                  throw new Error(
                    "Total Mobility deductions cannot exceed digital proceeds."
                  );
                }

                const driverNet =
                  digitalProceeds -
                  totalDeducted;

                const remainingCashObligation =
                  await database.$queryRaw<
                    Array<{
                      remainingAmountMinor:
                        bigint | null;
                    }>
                  >`
                    SELECT
                      COALESCE(
                        SUM(
                          "remainingAmountMinor"
                        ),
                        0
                      )::bigint
                      AS "remainingAmountMinor"
                    FROM "MobilityCashObligation"
                    WHERE
                      "organizationId" =
                        ${input.organizationId}
                      AND
                      "driverId" =
                        ${input.driverId}
                      AND
                      "currency" =
                        ${input.currency}
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
                  `;

                return {
                  driverId:
                    input.driverId,

                  currency:
                    input.currency,

                  availableDigitalProceedsMinor:
                    digitalProceeds.toString(),

                  currentDigitalCommissionMinor:
                    currentCommission.toString(),

                  priorCashObligationsSettledMinor:
                    previousCashSettled.toString(),

                  totalDeductedMinor:
                    totalDeducted.toString(),

                  driverNetProceedsMinor:
                    driverNet.toString(),

                  remainingCashObligationMinor:
                    (
                      remainingCashObligation[0]
                        ?.remainingAmountMinor ??
                      BigInt(0)
                    ).toString(),

                  settlements,
                };
              },
              {
                isolationLevel:
                  Prisma.TransactionIsolationLevel.Serializable,
                maxWait: 5000,
                timeout: 10000,
              }
            );

          await this.financialAuditService.record({
            organizationId:
              input.organizationId,

            actorUserId:
              input.actorUserId,

            action:
              "MOBILITY_CASH_SETTLEMENT_APPLIED",

            entityType:
              "MOBILITY_DRIVER",

            entityId:
              input.driverId,

            correlationId:
              input.correlationId,

            requestId:
              input.requestId,

            ipAddress:
              input.ipAddress,

            userAgent:
              input.userAgent,

            metadata: {
              driverId:
                input.driverId,

              sourceReference:
                input.sourceReference,

              currency:
                input.currency,

              availableDigitalProceedsMinor:
                settlement.availableDigitalProceedsMinor,

              currentDigitalCommissionMinor:
                settlement.currentDigitalCommissionMinor,

              priorCashObligationsSettledMinor:
                settlement.priorCashObligationsSettledMinor,

              totalDeductedMinor:
                settlement.totalDeductedMinor,

              driverNetProceedsMinor:
                settlement.driverNetProceedsMinor,

              remainingCashObligationMinor:
                settlement.remainingCashObligationMinor,

              settlementCount:
                settlement.settlements.length,

              source:
                "MOBILITY_FINANCIAL_ENGINE",
            },
          });

          return {
            responseStatus: 200,
            responseBody:
              settlement,
            resourceType:
              "MOBILITY_CASH_SETTLEMENT",
            resourceId:
              input.driverId,
          };
        }
      );

    return result.responseBody as MobilityCashSettlementResult;
  }

  async getDriverOutstandingBalance(
    input: {
      organizationId: string;
      driverId: string;
      currency?: string;
    }
  ): Promise<{
    driverId: string;
    currency: string;
    outstandingAmountMinor: string;
    obligationsCount: number;
  }> {
    const currency =
      input.currency ?? "AOA";

    this.validateIdentifiers(
      input.organizationId,
      input.driverId
    );

    this.validateCurrency(currency);

    const rows =
      await prisma.$queryRaw<
        Array<{
          outstandingAmountMinor: bigint;
          obligationsCount: bigint;
        }>
      >`
        SELECT
          COALESCE(
            SUM(
              "remainingAmountMinor"
            ),
            0
          )::bigint
          AS "outstandingAmountMinor",

          COUNT(*)::bigint
          AS "obligationsCount"

        FROM "MobilityCashObligation"

        WHERE
          "organizationId" =
            ${input.organizationId}
          AND
          "driverId" =
            ${input.driverId}
          AND
          "currency" =
            ${currency}
          AND
          "remainingAmountMinor" >
            ${BigInt(0)}
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
      `;

    const row =
      rows[0];

    return {
      driverId:
        input.driverId,

      currency,

      outstandingAmountMinor:
        (
          row?.outstandingAmountMinor ??
          BigInt(0)
        ).toString(),

      obligationsCount:
        Number(
          row?.obligationsCount ??
          BigInt(0)
        ),
    };
  }

  async getDriverObligations(
    input: {
      organizationId: string;
      driverId: string;
      currency?: string;
      status?: MobilityCashObligationStatus;
    }
  ): Promise<
    MobilityCashObligationResult[]
  > {
    const currency =
      input.currency ?? "AOA";

    this.validateIdentifiers(
      input.organizationId,
      input.driverId
    );

    this.validateCurrency(currency);

    const statusFilter =
      input.status ?? null;

    const obligations =
      await prisma.$queryRaw<
        MobilityCashObligationRecord[]
      >`
        SELECT
          "id",
          "organizationId",
          "driverId",
          "rideId",
          "currency",
          "grossFareMinor",
          "commissionRateBps",
          "commissionAmountMinor",
          "settledAmountMinor",
          "remainingAmountMinor",
          "status",
          "idempotencyKey",
          "policyKey",
          "policyVersion",
          "metadata",
          "createdAt",
          "updatedAt"
        FROM "MobilityCashObligation"
        WHERE
          "organizationId" =
            ${input.organizationId}
          AND
          "driverId" =
            ${input.driverId}
          AND
          "currency" =
            ${currency}
          AND (
            ${statusFilter}::text IS NULL
            OR
            "status"::text =
              ${statusFilter}
          )
        ORDER BY
          "createdAt" ASC,
          "id" ASC
      `;

    return obligations.map(
      (obligation: MobilityCashObligationRecord) =>
        this.toResult(obligation)
    );
  }

  private async findObligationByRide(
    database: SqlExecutor,
    rideId: string
  ): Promise<
    MobilityCashObligationRecord | null
  > {
    const rows =
      await database.$queryRaw<
        MobilityCashObligationRecord[]
      >`
        SELECT
          "id",
          "organizationId",
          "driverId",
          "rideId",
          "currency",
          "grossFareMinor",
          "commissionRateBps",
          "commissionAmountMinor",
          "settledAmountMinor",
          "remainingAmountMinor",
          "status",
          "idempotencyKey",
          "policyKey",
          "policyVersion",
          "metadata",
          "createdAt",
          "updatedAt"
        FROM "MobilityCashObligation"
        WHERE
          "rideId" =
            ${rideId}
        LIMIT 1
      `;

    return rows[0] ?? null;
  }

  private async findOpenObligations(
    database: SqlExecutor,
    organizationId: string,
    driverId: string,
    currency: string
  ): Promise<
    MobilityCashObligationRecord[]
  > {
    return database.$queryRaw<
      MobilityCashObligationRecord[]
    >`
      SELECT
        "id",
        "organizationId",
        "driverId",
        "rideId",
        "currency",
        "grossFareMinor",
        "commissionRateBps",
        "commissionAmountMinor",
        "settledAmountMinor",
        "remainingAmountMinor",
        "status",
        "idempotencyKey",
        "policyKey",
        "policyVersion",
        "metadata",
        "createdAt",
        "updatedAt"
      FROM "MobilityCashObligation"
      WHERE
        "organizationId" =
          ${organizationId}
        AND
        "driverId" =
          ${driverId}
        AND
        "currency" =
          ${currency}
        AND
        "remainingAmountMinor" >
          ${BigInt(0)}
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
      ORDER BY
        "createdAt" ASC,
        "id" ASC
    `;
  }

  private async requireActiveOrganization(
    database: SqlExecutor,
    organizationId: string
  ): Promise<void> {
    const rows =
      await database.$queryRaw<
        Array<{
          id: string;
          status: string;
        }>
      >`
        SELECT
          "id",
          "status"::text AS "status"
        FROM "Organization"
        WHERE
          "id" =
            ${organizationId}
        LIMIT 1
      `;

    const organization =
      rows[0];

    if (
      !organization ||
      organization.status !==
        "ACTIVE"
    ) {
      throw new Error(
        "Mobility organization is not active."
      );
    }
  }

  private async requireActiveDriver(
    database: SqlExecutor,
    organizationId: string,
    driverId: string
  ): Promise<void> {
    const rows =
      await database.$queryRaw<
        Array<{
          id: string;
          organizationId: string;
          status: string;
        }>
      >`
        SELECT
          "id",
          "organizationId",
          "status"::text AS "status"
        FROM "MobilityDriver"
        WHERE
          "id" =
            ${driverId}
          AND
          "organizationId" =
            ${organizationId}
        LIMIT 1
      `;

    const driver =
      rows[0];

    if (!driver) {
      throw new Error(
        "Mobility driver was not found."
      );
    }

    if (
      driver.status !==
      "ACTIVE"
    ) {
      throw new Error(
        "Mobility driver is not active."
      );
    }
  }

  private async requireCompletedRide(
    database: SqlExecutor,
    organizationId: string,
    driverId: string,
    rideId: string,
    currency: string
  ): Promise<void> {
    const rows =
      await database.$queryRaw<
        Array<{
          id: string;
          organizationId: string;
          driverId: string | null;
          status: string;
          currency: string;
        }>
      >`
        SELECT
          "id",
          "organizationId",
          "driverId",
          "status"::text AS "status",
          "currency"
        FROM "MobilityRide"
        WHERE
          "id" =
            ${rideId}
        LIMIT 1
      `;

    const ride =
      rows[0];

    if (!ride) {
      throw new Error(
        "Mobility ride was not found."
      );
    }

    if (
      ride.organizationId !==
      organizationId
    ) {
      throw new Error(
        "Mobility ride does not belong to the organization."
      );
    }

    if (
      ride.driverId !==
      driverId
    ) {
      throw new Error(
        "Mobility ride is not assigned to the specified driver."
      );
    }

    if (
      ride.currency !==
      currency
    ) {
      throw new Error(
        "Cash obligation currency does not match the ride currency."
      );
    }

    if (
      ride.status !==
      "TRIP_COMPLETED"
    ) {
      throw new Error(
        "A cash obligation can only be created for a completed Mobility ride."
      );
    }
  }

  private toResult(
    obligation: MobilityCashObligationRecord
  ): MobilityCashObligationResult {
    return {
      id:
        obligation.id,

      organizationId:
        obligation.organizationId,

      driverId:
        obligation.driverId,

      rideId:
        obligation.rideId,

      currency:
        obligation.currency,

      grossFareMinor:
        obligation.grossFareMinor.toString(),

      commissionRateBps:
        Number(
          obligation.commissionRateBps
        ),

      commissionAmountMinor:
        obligation.commissionAmountMinor.toString(),

      settledAmountMinor:
        obligation.settledAmountMinor.toString(),

      remainingAmountMinor:
        obligation.remainingAmountMinor.toString(),

      status:
        obligation.status,

      policyKey:
        obligation.policyKey,

      policyVersion:
        Number(
          obligation.policyVersion
        ),

      createdAt:
        obligation.createdAt,

      updatedAt:
        obligation.updatedAt,
    };
  }

  private validateCreateInput(
    input: CreateMobilityCashObligationInput
  ): void {
    this.validateIdentifiers(
      input.organizationId,
      input.driverId,
      input.rideId
    );

    this.validateCurrency(
      input.currency
    );

    if (
      input.grossFareMinor <
      BigInt(0)
    ) {
      throw new Error(
        "Gross fare cannot be negative."
      );
    }

    if (
      input.commissionAmountMinor <
      BigInt(0)
    ) {
      throw new Error(
        "Commission amount cannot be negative."
      );
    }

    if (
      input.commissionAmountMinor >
      input.grossFareMinor
    ) {
      throw new Error(
        "Commission cannot exceed the gross fare."
      );
    }

    if (
      !Number.isInteger(
        input.commissionRateBps
      ) ||
      input.commissionRateBps <
        0 ||
      input.commissionRateBps >
        BPS_TOTAL
    ) {
      throw new Error(
        "Commission rate must be between 0 and 10000 basis points."
      );
    }

    const calculatedCommission =
      (
        input.grossFareMinor *
        BigInt(
          input.commissionRateBps
        )
      ) /
      BigInt(BPS_TOTAL);

    if (
      calculatedCommission !==
      input.commissionAmountMinor
    ) {
      throw new Error(
        "Commission amount does not match the configured basis-point rate."
      );
    }

    if (
      !input.policyKey.trim()
    ) {
      throw new Error(
        "Commission policy key is required."
      );
    }

    if (
      !Number.isInteger(
        input.policyVersion
      ) ||
      input.policyVersion <=
        0
    ) {
      throw new Error(
        "Commission policy version must be a positive integer."
      );
    }

    if (
      !input.idempotencyKey.trim()
    ) {
      throw new Error(
        "Mobility cash obligation idempotency key is required."
      );
    }
  }

  private validateSettlementInput(
    input: ApplyMobilityCashSettlementInput
  ): void {
    this.validateIdentifiers(
      input.organizationId,
      input.driverId
    );

    this.validateCurrency(
      input.currency
    );

    if (
      input.availableDigitalProceedsMinor <
      BigInt(0)
    ) {
      throw new Error(
        "Available digital proceeds cannot be negative."
      );
    }

    if (
      input.currentDigitalCommissionMinor <
      BigInt(0)
    ) {
      throw new Error(
        "Current digital commission cannot be negative."
      );
    }

    if (
      input.currentDigitalCommissionMinor >
      input.availableDigitalProceedsMinor
    ) {
      throw new Error(
        "Current digital commission cannot exceed available digital proceeds."
      );
    }

    if (
      !input.sourceReference.trim()
    ) {
      throw new Error(
        "Digital settlement source reference is required."
      );
    }

    if (
      !input.idempotencyKey.trim()
    ) {
      throw new Error(
        "Mobility cash settlement idempotency key is required."
      );
    }
  }

  private validateIdentifiers(
    organizationId: string,
    driverId: string,
    rideId?: string
  ): void {
    if (!organizationId.trim()) {
      throw new Error(
        "Mobility organizationId is required."
      );
    }

    if (!driverId.trim()) {
      throw new Error(
        "Mobility driverId is required."
      );
    }

    if (
      rideId !== undefined &&
      !rideId.trim()
    ) {
      throw new Error(
        "Mobility rideId is required."
      );
    }
  }

  private validateCurrency(
    currency: string
  ): void {
    if (
      !/^[A-Z]{3}$/.test(
        currency
      )
    ) {
      throw new Error(
        "Mobility currency must be a valid ISO 4217 code."
      );
    }
  }
}

export const mobilityCashSettlementService =
  new MobilityCashSettlementService();
