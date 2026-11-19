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
    const campaign = await prisma.mobilityPromotionCampaign.findFirst({
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
    if (!campaign) return null;

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
    if (!result.eligible) return null;
    return {
      campaignId: campaign.id,
      campaignCode: campaign.code,
      discountMinor: result.discountMinor.toString(),
      finalFareMinor: result.finalFareMinor.toString(),
      discountRateBps: result.discountRateBps,
      reason: result.reason,
    };
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

    const existing = await prisma.mobilityPromotionReservation.findUnique({
      where: { rideId: input.rideId },
    });
    if (existing) {
      const applied = existing.status === "RESERVED" || existing.status === "COMMITTED";
      return {
        applied,
        finalFareMinor: applied
          ? (BigInt(input.originalFareMinor) - existing.amountMinor).toString()
          : input.originalFareMinor,
      };
    }

    try {
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
          },
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
