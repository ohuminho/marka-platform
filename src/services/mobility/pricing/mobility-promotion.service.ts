import { Prisma } from "@prisma/client";
import { prisma } from "@/database/client/prisma";
import { evaluateMobilityPromotion, type MobilityPromotionVehicle } from "./mobility-promotion-policy.service";
import { mobilityPromotionBudgetService } from "./mobility-promotion-budget.service";
import type { MobilityFareQuote } from "./mobility-tariff.service";

export interface MobilityPromotionQuote {
  campaignId: string;
  campaignCode: string;
  discountMinor: string;
  finalFareMinor: string;
  discountRateBps: number;
  reason: string;
}

export class MobilityPromotionService {
  async quote(serviceType: string, fare: MobilityFareQuote): Promise<MobilityPromotionQuote | null> {
    if (serviceType !== "TAXI" && serviceType !== "MOTO_TAXI") return null;
    const now = new Date();
    let campaigns;
    try {
      campaigns = await prisma.mobilityPromotionCampaign.findMany({
        where: {
          serviceType,
          currency: "AOA",
          enabled: true,
          AND: [
            { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
            { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
          ],
        },
        orderBy: { createdAt: "asc" },
      });
    } catch (error) {
      // Promotion schema may not yet be migrated in an environment. The
      // passenger flow must continue with the normal server tariff.
      console.warn("[MOBILITY_PROMOTION_SCHEMA_UNAVAILABLE]", error);
      return null;
    }

    // Try eligible campaigns in deterministic order. An older campaign that
    // has no budget or does not meet the distance threshold must not mask a
    // later campaign that can legitimately fund this trip.
    for (const campaign of campaigns) {
      const availableBudget = campaign.budgetMinor - campaign.spentMinor - campaign.reservedMinor;
      const result = evaluateMobilityPromotion({
        vehicle: serviceType as MobilityPromotionVehicle,
        estimatedDistanceMeters: fare.distanceMeters,
        longDistanceThresholdMeters: campaign.longDistanceThresholdMeters,
        isPeakHour: false,
        quotedFareMinor: BigInt(fare.totalMinor),
        distanceFareMinor: BigInt(fare.distanceFareMinor),
        minimumPayableFareMinor: campaign.minimumPayableFareMinor > BigInt(fare.minimumFareMinor)
          ? campaign.minimumPayableFareMinor
          : BigInt(fare.minimumFareMinor),
        availablePromotionBudgetMinor: availableBudget > BigInt(0) ? availableBudget : BigInt(0),
        enabled: campaign.enabled,
      });
      if (!result.eligible) continue;
      return {
        campaignId: campaign.id,
        campaignCode: campaign.code,
        discountMinor: result.discountMinor.toString(),
        finalFareMinor: result.finalFareMinor.toString(),
        discountRateBps: result.discountRateBps,
        reason: result.reason,
      };
    }
    return null;
  }

  async reserveForRide(input: {
    rideId: string;
    idempotencyKey: string;
    promotion: MobilityPromotionQuote | null;
    originalFareMinor: string;
    currency: string;
  }): Promise<{ applied: boolean; finalFareMinor: string }> {
    if (!input.promotion || input.currency !== "AOA") {
      return { applied: false, finalFareMinor: input.originalFareMinor };
    }

    try {
      const existing = await prisma.mobilityPromotionReservation.findUnique({
        where: { rideId: input.rideId },
      });
      if (existing) {
        const applied = existing.status === "RESERVED" || existing.status === "COMMITTED";
        if (!applied) return { applied: false, finalFareMinor: input.originalFareMinor };
        const persistedRide = await prisma.mobilityRide.findUnique({
          where: { id: input.rideId },
          select: { metadata: true },
        });
        const persistedMetadata = persistedRide?.metadata && typeof persistedRide.metadata === "object" && !Array.isArray(persistedRide.metadata)
          ? persistedRide.metadata as Record<string, unknown>
          : {};
        const persistedFare = typeof persistedMetadata.estimatedFareMinor === "string"
          ? persistedMetadata.estimatedFareMinor
          : (BigInt(input.originalFareMinor) - existing.amountMinor).toString();
        return { applied: true, finalFareMinor: persistedFare };
      }
      await mobilityPromotionBudgetService.reserve({
        campaignId: input.promotion.campaignId,
        rideId: input.rideId,
        idempotencyKey: input.idempotencyKey,
        amountMinor: BigInt(input.promotion.discountMinor),
      });

      const ride = await prisma.mobilityRide.findUnique({
        where: { id: input.rideId },
        select: { metadata: true },
      });
      const metadata = ride?.metadata && typeof ride.metadata === "object" && !Array.isArray(ride.metadata)
        ? ride.metadata as Record<string, unknown>
        : {};
      const pricingSnapshot = metadata.pricingSnapshot && typeof metadata.pricingSnapshot === "object" && !Array.isArray(metadata.pricingSnapshot)
        ? metadata.pricingSnapshot as Record<string, unknown>
        : {};
      const finalFareMinor = input.promotion.finalFareMinor;
      await prisma.mobilityRide.update({
        where: { id: input.rideId },
        data: {
          metadata: {
            ...metadata,
            estimatedFareMinor: finalFareMinor,
            pricingSnapshot: { ...pricingSnapshot, totalMinor: finalFareMinor, promotion: {
              campaignCode: input.promotion.campaignCode,
              discountMinor: input.promotion.discountMinor,
              discountRateBps: input.promotion.discountRateBps,
              funding: "MARKA_PROMOTION_BUDGET",
            } },
          } as Prisma.InputJsonValue,
        },
      });
      return { applied: true, finalFareMinor };
    } catch (error) {
      // A campaign budget race must never leave an unfunded discount on a ride.
      try { await mobilityPromotionBudgetService.release(input.rideId); } catch { /* preserve original fare */ }
      console.error("[MOBILITY_PROMOTION_RESERVATION_FAILED]", error);
      return { applied: false, finalFareMinor: input.originalFareMinor };
    }
  }
}

export const mobilityPromotionService = new MobilityPromotionService();
