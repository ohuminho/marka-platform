import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/database/client/prisma";
import { FinancialAuditService } from "@/core/audit/financial-audit.service";

import {
  type CompleteMobilityPaymentInput,
  type CreateMobilityPaymentInput,
  type MobilityPaymentResult,
} from "@/services/mobility/payments/mobility-payment-engine.contracts";

import type {
  MobilityPaymentMethod,
  MobilityPaymentStatus,
} from "@/services/mobility/payments/mobility-payment-engine.types";

const BPS_TOTAL = 10_000;

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
    input: CreateMobilityPaymentInput
  ): Promise<MobilityPaymentResult> {
    this.validateCreateInput(input);

    const existing =
      await this.findByRide(
        prisma,
        input.rideId
      );

    if (existing) {
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
              }>
            >`
              SELECT
                "id",
                "organizationId",
                "riderId",
                "driverId",
                "currency",
                "status"::text AS "status"
              FROM "MobilityRide"
              WHERE "id" = ${input.rideId}
              LIMIT 1
            `;

          const currentRide = ride[0];

          if (!currentRide) {
            throw new Error(
              "Mobility ride was not found."
            );
          }

          if (
            currentRide.organizationId !==
            input.organizationId
          ) {
            throw new Error(
              "Mobility ride does not belong to the organization."
            );
          }

          if (
            currentRide.riderId !==
            input.riderId
          ) {
            throw new Error(
              "Mobility rider does not match the payment rider."
            );
          }

          if (
            currentRide.currency !==
            input.currency
          ) {
            throw new Error(
              "Payment currency does not match the ride currency."
            );
          }

          if (
            input.driverId &&
            currentRide.driverId !==
              input.driverId
          ) {
            throw new Error(
              "Payment driver does not match the assigned ride driver."
            );
          }

          const finalFare =
            input.finalFareMinor ??
            input.estimatedFareMinor;

          const commission =
            this.calculateCommission(
              finalFare,
              input.commissionRateBps
            );

          const driverGross =
            finalFare;

          const driverNet =
            driverGross - commission;

          const id =
            randomUUID();

          const status: MobilityPaymentStatus =
            input.paymentMethod === "CASH"
              ? "AUTHORIZED"
              : "PENDING";

          const now =
            new Date();

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
                ${input.driverId ?? currentRide.driverId},
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
                ${input.commissionRateBps},
                ${commission},
                ${driverGross},
                ${driverNet},
                ${
                  input.pricingSnapshot
                    ? (input.pricingSnapshot as Prisma.InputJsonValue)
                    : null
                },
                ${
                  input.metadata
                    ? (input.metadata as Prisma.InputJsonValue)
                    : null
                },
                ${input.idempotencyKey},
                ${
                  status === "AUTHORIZED"
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
              "Unable to create Mobility payment."
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

        driverNetMinor:
          payment.driverNetMinor.toString(),

        source:
          "MOBILITY_PAYMENT_ENGINE",
      },
    });

    return this.toResult(payment);
  }

  async completePayment(
    input: CompleteMobilityPaymentInput
  ): Promise<MobilityPaymentResult> {
    this.validateCompleteInput(input);

    const payment =
      await prisma.$transaction(
        async (database) => {
          const existing =
            await this.findByRide(
              database,
              input.rideId
            );

          if (!existing) {
            throw new Error(
              "Mobility payment was not found for this ride."
            );
          }

          if (
            existing.organizationId !==
            input.organizationId
          ) {
            throw new Error(
              "Mobility payment does not belong to the organization."
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
              `Mobility payment cannot be completed from status ${existing.status}.`
            );
          }

          const commission =
            this.calculateCommission(
              input.finalFareMinor,
              input.commissionRateBps
            );

          const driverGross =
            input.finalFareMinor;

          const driverNet =
            driverGross - commission;

          const nextStatus: MobilityPaymentStatus =
            existing.paymentMethod ===
            "CASH"
              ? "COLLECTED"
              : "COLLECTED";

          const rows =
            await database.$queryRaw<
              MobilityPaymentRecord[]
            >`
              UPDATE "MobilityRidePayment"
              SET
                "finalFareMinor" =
                  ${input.finalFareMinor},

                "commissionRateBps" =
                  ${input.commissionRateBps},

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
                  CURRENT_TIMESTAMP,

                "updatedAt" =
                  CURRENT_TIMESTAMP,

                "metadata" =
                  CASE
                    WHEN ${input.metadata ? true : false}
                    THEN COALESCE(
                      "metadata",
                      '{}'::jsonb
                    ) ||
                    ${(
                      input.metadata ??
                      {}
                    ) as Prisma.InputJsonValue}
                    ELSE "metadata"
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
              "Unable to complete Mobility payment."
            );
          }

          return updated;
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

        driverNetMinor:
          payment.driverNetMinor.toString(),

        source:
          "MOBILITY_PAYMENT_ENGINE",
      },
    });

    return this.toResult(payment);
  }

  async getByRide(
    rideId: string
  ): Promise<MobilityPaymentResult | null> {
    const payment =
      await this.findByRide(
        prisma,
        rideId
      );

    return payment
      ? this.toResult(payment)
      : null;
  }

  private async findByRide(
    database: SqlExecutor,
    rideId: string
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
        WHERE "rideId" = ${rideId}
        LIMIT 1
      `;

    return rows[0] ?? null;
  }

  private calculateCommission(
    fareMinor: bigint,
    rateBps: number
  ): bigint {
    return (
      fareMinor *
      BigInt(rateBps)
    ) / BigInt(BPS_TOTAL);
  }

  private toResult(
    payment: MobilityPaymentRecord
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
          payment.commissionRateBps
        ),

      commissionAmountMinor:
        payment.commissionAmountMinor.toString(),

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
    input: CreateMobilityPaymentInput
  ): void {
    if (!input.organizationId.trim()) {
      throw new Error(
        "Mobility organizationId is required."
      );
    }

    if (!input.rideId.trim()) {
      throw new Error(
        "Mobility rideId is required."
      );
    }

    if (!input.riderId.trim()) {
      throw new Error(
        "Mobility riderId is required."
      );
    }

    this.validateCurrency(
      input.currency
    );

    if (
      input.estimatedFareMinor <
      BigInt(0)
    ) {
      throw new Error(
        "Estimated fare cannot be negative."
      );
    }

    if (
      input.finalFareMinor !==
        undefined &&
      input.finalFareMinor <
        BigInt(0)
    ) {
      throw new Error(
        "Final fare cannot be negative."
      );
    }

    this.validateRate(
      input.commissionRateBps
    );

    if (
      !input.idempotencyKey.trim()
    ) {
      throw new Error(
        "Mobility payment idempotency key is required."
      );
    }
  }

  private validateCompleteInput(
    input: CompleteMobilityPaymentInput
  ): void {
    if (!input.organizationId.trim()) {
      throw new Error(
        "Mobility organizationId is required."
      );
    }

    if (!input.rideId.trim()) {
      throw new Error(
        "Mobility rideId is required."
      );
    }

    if (
      input.finalFareMinor <
      BigInt(0)
    ) {
      throw new Error(
        "Final fare cannot be negative."
      );
    }

    this.validateRate(
      input.commissionRateBps
    );
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

  private validateRate(
    rateBps: number
  ): void {
    if (
      !Number.isInteger(rateBps) ||
      rateBps < 0 ||
      rateBps > BPS_TOTAL
    ) {
      throw new Error(
        "Mobility commission rate must be between 0 and 10000 basis points."
      );
    }
  }
}

export const mobilityPaymentEngineService =
  new MobilityPaymentEngineService();
"}
