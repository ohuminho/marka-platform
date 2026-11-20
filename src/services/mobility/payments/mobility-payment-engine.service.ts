import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/database/client/prisma";
import { FinancialAuditService } from "@/core/audit/financial-audit.service";
import { commissionPolicyService } from "@/services/finance/commission/commission-policy.service";
import {
  calculateSplitMinor,
  resolveMobilitySplitServiceType,
} from "@/services/mobility/pricing/mobility-split.service";

import {
  type CompleteMobilityPaymentInput,
  type CreateMobilityPaymentInput,
  type MobilityPaymentResult,
} from "@/services/mobility/payments/mobility-payment-engine.contracts";

import type {
  MobilityPaymentMethod,
  MobilityPaymentStatus,
} from "@/services/mobility/payments/mobility-payment-engine.types";

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

  paymentMethod: MobilityPaymentMethod;
  status: MobilityPaymentStatus;

  estimatedFareMinor: bigint;
  finalFareMinor: bigint;

  commissionRateBps: number;
  commissionAmountMinor: bigint;

  commissionPolicyKey: string;
  commissionPolicyVersion: number;

  driverGrossMinor: bigint;
  driverNetMinor: bigint;

  pricingSnapshot: unknown;
  metadata: unknown;

  authorizedAt: Date | null;
  collectedAt: Date | null;
  settledAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export class MobilityPaymentEngineService {
  private readonly financialAuditService =
    new FinancialAuditService();

  async createPayment(
    input: CreateMobilityPaymentInput,
  ): Promise<MobilityPaymentResult> {
    this.validateCreateInput(input);

    const existing =
      await this.findByRide(
        prisma,
        input.rideId,
      );

    if (existing) {
      if (
        existing.organizationId !==
        input.organizationId
      ) {
        throw new Error(
          "Existing Mobility payment belongs to another organization.",
        );
      }

      if (
        existing.commissionPolicyKey !==
          input.commissionPolicyKey ||
        existing.commissionPolicyVersion !==
          input.commissionPolicyVersion
      ) {
        throw new Error(
          "Mobility payment already exists with a different commission policy.",
        );
      }

      return this.toResult(existing);
    }

    const payment =
      await prisma.$transaction(
        async (database) => {
          const ride =
            await database.$queryRaw<
              Array<{
                id: string;
                organizationId: string;
                riderId: string;
                driverId: string | null;
                currency: string;
                status: string;
                serviceType: string;
              }>
            >`
              SELECT
                "id",
                "organizationId",
                "riderId",
                "driverId",
                "currency",
                "status"::text AS "status",
                "serviceType"
              FROM "MobilityRide"
              WHERE "id" = ${input.rideId}
              LIMIT 1
            `;

          const currentRide =
            ride[0];

          if (!currentRide) {
            throw new Error(
              "Mobility ride was not found.",
            );
          }

          if (
            currentRide.organizationId !==
            input.organizationId
          ) {
            throw new Error(
              "Mobility ride does not belong to the organization.",
            );
          }

          if (
            currentRide.riderId !==
            input.riderId
          ) {
            throw new Error(
              "Mobility rider does not match the payment rider.",
            );
          }

          if (
            currentRide.currency !==
            input.currency
          ) {
            throw new Error(
              "Payment currency does not match the ride currency.",
            );
          }

          if (
            input.driverId &&
            currentRide.driverId !==
              input.driverId
          ) {
            throw new Error(
              "Payment driver does not match the assigned ride driver.",
            );
          }

          const policy = commissionPolicyService.getMobilityPolicy(currentRide.serviceType);
          if (
            input.commissionRateBps !== policy.rateBps ||
            input.commissionPolicyKey !== policy.key ||
            input.commissionPolicyVersion !== policy.version
          ) {
            throw new Error("Mobility commission policy does not match the persisted ride service type.");
          }

          const finalFare =
            input.finalFareMinor ??
            input.estimatedFareMinor;

          const split = calculateSplitMinor(
            finalFare,
            resolveMobilitySplitServiceType(currentRide.serviceType),
          );
          const commission = split.platformFeeKz;

          const driverGross =
            finalFare;

          const driverNet =
            driverGross -
            commission;

          const id =
            randomUUID();

          const status: MobilityPaymentStatus =
            input.paymentMethod ===
            "CASH"
              ? "AUTHORIZED"
              : "PENDING";

          const now =
            new Date();

          const pricingSnapshotJson =
            input.pricingSnapshot
              ? JSON.stringify(
                  input.pricingSnapshot,
                )
              : null;

          const metadataJson =
            JSON.stringify({
              ...(input.metadata ?? {}),
              commissionPolicyKey:
                input.commissionPolicyKey,
              commissionPolicyVersion:
                input.commissionPolicyVersion,
            });

          const rows =
            await database.$queryRaw<
              MobilityPaymentRecord[]
            >`
              INSERT INTO "MobilityRidePayment" (
                "id",
                "organizationId",
                "rideId",
                "riderId",
                "driverId",
                "currency",
                "paymentMethod",
                "status",
                "estimatedFareMinor",
                "finalFareMinor",
                "commissionRateBps",
                "commissionAmountMinor",
                "commissionPolicyKey",
                "commissionPolicyVersion",
                "driverGrossMinor",
                "driverNetMinor",
                "pricingSnapshot",
                "metadata",
                "idempotencyKey",
                "authorizedAt",
                "createdAt",
                "updatedAt"
              )
              VALUES (
                ${id},
                ${input.organizationId},
                ${input.rideId},
                ${input.riderId},
                ${input.driverId ??
                  currentRide.driverId},
                ${input.currency},
                CAST(
                  ${input.paymentMethod}
                  AS "MobilityPaymentMethod"
                ),
                CAST(
                  ${status}
                  AS "MobilityPaymentStatus"
                ),
                ${input.estimatedFareMinor},
                ${finalFare},
                ${policy.rateBps},
                ${commission},
                ${policy.key},
                ${policy.version},
                ${driverGross},
                ${driverNet},
                ${pricingSnapshotJson}::jsonb,
                ${metadataJson}::jsonb,
                ${input.idempotencyKey},
                ${
                  status ===
                  "AUTHORIZED"
                    ? now
                    : null
                },
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
              )
              RETURNING
                "id",
                "organizationId",
                "rideId",
                "riderId",
                "driverId",
                "currency",
                "paymentMethod",
                "status",
                "estimatedFareMinor",
                "finalFareMinor",
                "commissionRateBps",
                "commissionAmountMinor",
                "commissionPolicyKey",
                "commissionPolicyVersion",
                "driverGrossMinor",
                "driverNetMinor",
                "pricingSnapshot",
                "metadata",
                "authorizedAt",
                "collectedAt",
                "settledAt",
                "createdAt",
                "updatedAt"
            `;

          const created =
            rows[0];

          if (!created) {
            throw new Error(
              "Unable to create Mobility payment.",
            );
          }

          return created;
        },
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5000,
          timeout: 10000,
        },
      );

    await this.financialAuditService.record({
      organizationId:
        payment.organizationId,
      actorUserId:
        input.actorUserId,
      action:
        "MOBILITY_PAYMENT_CREATED",
      entityType:
        "MOBILITY_RIDE_PAYMENT",
      entityId:
        payment.id,
      correlationId:
        input.correlationId,
      requestId:
        input.requestId,
      ipAddress:
        input.ipAddress,
      userAgent:
        input.userAgent,
      metadata: {
        rideId:
          payment.rideId,
        paymentMethod:
          payment.paymentMethod,
        status:
          payment.status,
        estimatedFareMinor:
          payment.estimatedFareMinor.toString(),
        finalFareMinor:
          payment.finalFareMinor.toString(),
        commissionAmountMinor:
          payment.commissionAmountMinor.toString(),
        commissionPolicyKey:
          payment.commissionPolicyKey,
        commissionPolicyVersion:
          payment.commissionPolicyVersion,
        driverNetMinor:
          payment.driverNetMinor.toString(),
        source:
          "MOBILITY_PAYMENT_ENGINE",
      },
    });

    return this.toResult(payment);
  }

  async completePayment(
    input: CompleteMobilityPaymentInput,
  ): Promise<MobilityPaymentResult> {
    this.validateCompleteInput(input);

    const payment =
      await prisma.$transaction(
        async (database) => {
          // Serialize collection against ride cancellation. Both paths lock
          // the ride first, then the payment, to avoid contradictory outcomes.
          const rides = await database.$queryRaw<
            Array<{ id: string; organizationId: string; status: string; serviceType: string }>
          >`
            SELECT "id", "organizationId", "status"::text AS "status", "serviceType"
            FROM "MobilityRide"
            WHERE "id" = ${input.rideId}
            FOR UPDATE
          `;
          const ride = rides[0];

          if (!ride || ride.organizationId !== input.organizationId) {
            throw new Error(
              "Mobility ride does not belong to the organization.",
            );
          }

          if (ride.status !== "TRIP_COMPLETED") {
            throw new Error(
              `Mobility payment cannot be collected while the ride is in status ${ride.status}.`,
            );
          }

          const existing =
            await this.findByRide(
              database,
              input.rideId,
            );

          if (!existing) {
            throw new Error(
              "Mobility payment was not found for this ride.",
            );
          }

          if (
            existing.organizationId !==
            input.organizationId
          ) {
            throw new Error(
              "Mobility payment does not belong to the organization.",
            );
          }

          if (
            existing.status ===
              "CANCELLED" ||
            existing.status ===
              "FAILED" ||
            existing.status ===
              "REFUNDED"
          ) {
            throw new Error(
              `Mobility payment cannot be completed from status ${existing.status}.`,
            );
          }

          // The fare is fixed when the rider initializes the payment.
          // A driver/client must not be able to overwrite the persisted amount
          // during completion or settlement. Any future fare adjustment must
          // go through a separate server-authorized repricing workflow.
          if (
            input.finalFareMinor !==
            existing.finalFareMinor
          ) {
            throw new Error(
              "Final fare does not match the amount authorized for this ride."
            );
          }

          const policy = commissionPolicyService.getMobilityPolicy(ride.serviceType);
          if (
            input.commissionRateBps !== policy.rateBps ||
            existing.commissionRateBps !== policy.rateBps ||
            existing.commissionPolicyKey !== policy.key ||
            existing.commissionPolicyVersion !== policy.version
          ) {
            throw new Error("Persisted Mobility commission policy no longer matches the ride service type.");
          }

          const finalFare = existing.finalFareMinor;
          const split = calculateSplitMinor(
            finalFare,
            resolveMobilitySplitServiceType(ride.serviceType),
          );
          const commission = split.platformFeeKz;

          const driverGross =
            finalFare;

          const driverNet =
            driverGross -
            commission;

          const nextStatus: MobilityPaymentStatus =
            "COLLECTED";

          const metadataJson =
            input.metadata
              ? JSON.stringify(
                  input.metadata,
                )
              : null;

          const rows =
            await database.$queryRaw<
              MobilityPaymentRecord[]
            >`
              UPDATE "MobilityRidePayment"
              SET
                "finalFareMinor" =
                  ${finalFare},

                "commissionAmountMinor" =
                  ${commission},

                "driverGrossMinor" =
                  ${driverGross},

                "driverNetMinor" =
                  ${driverNet},

                "status" =
                  CAST(
                    ${nextStatus}
                    AS "MobilityPaymentStatus"
                  ),

                "collectedAt" =
                  COALESCE(
                    "collectedAt",
                    CURRENT_TIMESTAMP
                  ),

                "updatedAt" =
                  CURRENT_TIMESTAMP,

                "metadata" =
                  CASE
                    WHEN ${metadataJson !== null}
                    THEN
                      COALESCE(
                        "metadata",
                        '{}'::jsonb
                      )
                      ||
                      ${metadataJson}::jsonb
                    ELSE
                      "metadata"
                  END

              WHERE
                "id" =
                  ${existing.id}

              RETURNING
                "id",
                "organizationId",
                "rideId",
                "riderId",
                "driverId",
                "currency",
                "paymentMethod",
                "status",
                "estimatedFareMinor",
                "finalFareMinor",
                "commissionRateBps",
                "commissionAmountMinor",
                "commissionPolicyKey",
                "commissionPolicyVersion",
                "driverGrossMinor",
                "driverNetMinor",
                "pricingSnapshot",
                "metadata",
                "authorizedAt",
                "collectedAt",
                "settledAt",
                "createdAt",
                "updatedAt"
            `;

          const updated =
            rows[0];

          if (!updated) {
            throw new Error(
              "Unable to complete Mobility payment.",
            );
          }

          return updated;
        },
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5000,
          timeout: 10000,
        },
      );

    await this.financialAuditService.record({
      organizationId:
        payment.organizationId,
      actorUserId:
        input.actorUserId,
      action:
        "MOBILITY_PAYMENT_COMPLETED",
      entityType:
        "MOBILITY_RIDE_PAYMENT",
      entityId:
        payment.id,
      correlationId:
        input.correlationId,
      requestId:
        input.requestId,
      ipAddress:
        input.ipAddress,
      userAgent:
        input.userAgent,
      metadata: {
        rideId:
          payment.rideId,
        paymentMethod:
          payment.paymentMethod,
        finalFareMinor:
          payment.finalFareMinor.toString(),
        commissionAmountMinor:
          payment.commissionAmountMinor.toString(),
        commissionPolicyKey:
          payment.commissionPolicyKey,
        commissionPolicyVersion:
          payment.commissionPolicyVersion,
        driverNetMinor:
          payment.driverNetMinor.toString(),
        source:
          "MOBILITY_PAYMENT_ENGINE",
      },
    });

    return this.toResult(payment);
  }

  async getByRide(
    rideId: string,
  ): Promise<MobilityPaymentResult | null> {
    const payment =
      await this.findByRide(
        prisma,
        rideId,
      );

    return payment
      ? this.toResult(payment)
      : null;
  }

  private async findByRide(
    database: SqlExecutor,
    rideId: string,
  ): Promise<MobilityPaymentRecord | null> {
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
          "estimatedFareMinor",
          "finalFareMinor",
          "commissionRateBps",
          "commissionAmountMinor",
          "commissionPolicyKey",
          "commissionPolicyVersion",
          "driverGrossMinor",
          "driverNetMinor",
          "pricingSnapshot",
          "metadata",
          "authorizedAt",
          "collectedAt",
          "settledAt",
          "createdAt",
          "updatedAt"
        FROM "MobilityRidePayment"
        WHERE
          "rideId" =
            ${rideId}
        LIMIT 1
      `;

    return rows[0] ?? null;
  }

  private toResult(
    payment: MobilityPaymentRecord,
  ): MobilityPaymentResult {
    return {
      id:
        payment.id,
      organizationId:
        payment.organizationId,
      rideId:
        payment.rideId,
      riderId:
        payment.riderId,
      driverId:
        payment.driverId,
      currency:
        payment.currency,
      paymentMethod:
        payment.paymentMethod,
      status:
        payment.status,
      estimatedFareMinor:
        payment.estimatedFareMinor.toString(),
      finalFareMinor:
        payment.finalFareMinor.toString(),
      commissionRateBps:
        Number(
          payment.commissionRateBps,
        ),
      commissionAmountMinor:
        payment.commissionAmountMinor.toString(),
      commissionPolicyKey:
        payment.commissionPolicyKey,
      commissionPolicyVersion:
        Number(
          payment.commissionPolicyVersion,
        ),
      driverGrossMinor:
        payment.driverGrossMinor.toString(),
      driverNetMinor:
        payment.driverNetMinor.toString(),
      pricingSnapshot:
        payment.pricingSnapshot,
      metadata:
        payment.metadata,
      authorizedAt:
        payment.authorizedAt,
      collectedAt:
        payment.collectedAt,
      settledAt:
        payment.settledAt,
      createdAt:
        payment.createdAt,
      updatedAt:
        payment.updatedAt,
    };
  }

  private validateCreateInput(
    input: CreateMobilityPaymentInput,
  ): void {
    if (
      !input.organizationId.trim()
    ) {
      throw new Error(
        "Mobility organizationId is required.",
      );
    }

    if (
      !input.rideId.trim()
    ) {
      throw new Error(
        "Mobility rideId is required.",
      );
    }

    if (
      !input.riderId.trim()
    ) {
      throw new Error(
        "Mobility riderId is required.",
      );
    }

    this.validateCurrency(
      input.currency,
    );

    if (
      input.estimatedFareMinor <
      BigInt(0)
    ) {
      throw new Error(
        "Estimated fare cannot be negative.",
      );
    }

    if (
      input.finalFareMinor !==
        undefined &&
      input.finalFareMinor <
        BigInt(0)
    ) {
      throw new Error(
        "Final fare cannot be negative.",
      );
    }

    this.validateRate(
      input.commissionRateBps,
    );

    if (
      !input.commissionPolicyKey.trim()
    ) {
      throw new Error(
        "Commission policy key is required.",
      );
    }

    if (
      !Number.isInteger(
        input.commissionPolicyVersion,
      ) ||
      input.commissionPolicyVersion <=
        0
    ) {
      throw new Error(
        "Commission policy version must be a positive integer.",
      );
    }

    if (
      !input.idempotencyKey.trim()
    ) {
      throw new Error(
        "Mobility payment idempotency key is required.",
      );
    }
  }

  private validateCompleteInput(
    input: CompleteMobilityPaymentInput,
  ): void {
    if (
      !input.organizationId.trim()
    ) {
      throw new Error(
        "Mobility organizationId is required.",
      );
    }

    if (
      !input.rideId.trim()
    ) {
      throw new Error(
        "Mobility rideId is required.",
      );
    }

    if (
      input.finalFareMinor <
      BigInt(0)
    ) {
      throw new Error(
        "Final fare cannot be negative.",
      );
    }

    this.validateRate(
      input.commissionRateBps,
    );
  }

  private validateCurrency(
    currency: string,
  ): void {
    if (
      !/^[A-Z]{3}$/.test(
        currency,
      )
    ) {
      throw new Error(
        "Mobility currency must be a valid ISO 4217 code.",
      );
    }
  }

  private validateRate(
    rateBps: number,
  ): void {
    if (
      !Number.isInteger(
        rateBps,
      ) ||
      rateBps < 0 ||
      rateBps > BPS_TOTAL
    ) {
      throw new Error(
        "Mobility commission rate must be between 0 and 10000 basis points.",
      );
    }
  }
}

export const mobilityPaymentEngineService =
  new MobilityPaymentEngineService();
