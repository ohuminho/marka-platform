import { Prisma } from "@prisma/client";

import { prisma } from "@/database/client/prisma";

export class MobilityPromotionBudgetService {
  async reserve(input: { campaignId: string; rideId: string; idempotencyKey: string; amountMinor: bigint }) {
    if (input.amountMinor <= BigInt(0)) throw new Error("Promotion reservation amount must be positive.");
    if (!input.idempotencyKey.trim() || input.idempotencyKey.length > 255) throw new Error("A valid promotion idempotency key is required.");

    return prisma.$transaction(async (tx) => {
      const existing = await tx.mobilityPromotionReservation.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      if (existing) {
        if (existing.campaignId !== input.campaignId || existing.rideId !== input.rideId || existing.amountMinor !== input.amountMinor) {
          throw new Error("Promotion idempotency key is already used for another reservation.");
        }
        return existing;
      }

      const updated = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        UPDATE "MobilityPromotionCampaign"
        SET "reservedMinor" = "reservedMinor" + ${input.amountMinor}, "updatedAt" = NOW()
        WHERE "id" = ${input.campaignId}
          AND "enabled" = TRUE
          AND "currency" = 'AOA'
          AND "budgetMinor" - "spentMinor" - "reservedMinor" >= ${input.amountMinor}
        RETURNING "id"
      `);
      if (updated.length !== 1) throw new Error("Promotion campaign is disabled or has insufficient available budget.");

      return tx.mobilityPromotionReservation.create({
        data: { campaignId: input.campaignId, rideId: input.rideId, idempotencyKey: input.idempotencyKey, amountMinor: input.amountMinor, status: "RESERVED" },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async commit(rideId: string) {
    return prisma.$transaction(async (tx) => {
      const reservation = await tx.mobilityPromotionReservation.findUnique({ where: { rideId } });
      if (!reservation || reservation.status === "COMMITTED") return reservation;
      if (reservation.status !== "RESERVED") throw new Error("Only a reserved promotion can be committed.");

      const changed = await tx.mobilityPromotionReservation.updateMany({
        where: { id: reservation.id, status: "RESERVED" },
        data: { status: "COMMITTED", committedAt: new Date() },
      });
      if (changed.count !== 1) throw new Error("Promotion reservation state changed before commit.");

      await tx.mobilityPromotionCampaign.update({
        where: { id: reservation.campaignId },
        data: { reservedMinor: { decrement: reservation.amountMinor }, spentMinor: { increment: reservation.amountMinor } },
      });
      return tx.mobilityPromotionReservation.findUnique({ where: { id: reservation.id } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async release(rideId: string) {
    return prisma.$transaction(async (tx) => {
      const reservation = await tx.mobilityPromotionReservation.findUnique({ where: { rideId } });
      if (!reservation || reservation.status === "RELEASED") return reservation;
      if (reservation.status !== "RESERVED") throw new Error("Only an uncommitted promotion reservation can be released.");

      const changed = await tx.mobilityPromotionReservation.updateMany({
        where: { id: reservation.id, status: "RESERVED" },
        data: { status: "RELEASED", releasedAt: new Date() },
      });
      if (changed.count !== 1) throw new Error("Promotion reservation state changed before release.");

      await tx.mobilityPromotionCampaign.update({
        where: { id: reservation.campaignId },
        data: { reservedMinor: { decrement: reservation.amountMinor } },
      });
      return tx.mobilityPromotionReservation.findUnique({ where: { id: reservation.id } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}

export const mobilityPromotionBudgetService = new MobilityPromotionBudgetService();
