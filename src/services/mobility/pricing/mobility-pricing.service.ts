import {
  evaluateMobilityPromotion,
  type MobilityPromotionResult,
  type MobilityPromotionVehicle,
} from "./mobility-promotion-policy.service";

export interface MobilityPricingInput {
  currency: string;

  baseFareMinor: bigint;
  bookingFeeMinor?: bigint;
  minimumFareMinor?: bigint;

  estimatedDistanceMeters: number;
  estimatedDurationSeconds: number;

  distanceRateMinorPerKm: bigint;
  durationRateMinorPerMinute: bigint;

  surgeMultiplierBps?: number;

  metadata?: Record<string, unknown>;
  promotion?: {
    vehicle: MobilityPromotionVehicle;
    longDistanceThresholdMeters: number;
    isPeakHour: boolean;
    minimumPayableFareMinor: bigint;
    availablePromotionBudgetMinor: bigint;
    enabled?: boolean;
  };
}

export interface MobilityPriceBreakdown {
  currency: string;
  baseFareMinor: bigint;
  distanceFareMinor: bigint;
  durationFareMinor: bigint;
  bookingFeeMinor: bigint;
  subtotalMinor: bigint;
  surgeAdjustmentMinor: bigint;
  totalMinor: bigint;

  estimatedDistanceMeters: number;
  estimatedDurationSeconds: number;

  surgeMultiplierBps: number;

  metadata?: Record<string, unknown>;
  promotion?: MobilityPromotionResult;
}

const BPS_TOTAL = 10_000;

export class MobilityPricingService {
  calculate(
    input: MobilityPricingInput
  ): MobilityPriceBreakdown {
    this.validate(input);

    // Keep all monetary arithmetic in bigint. Converting large minor-unit
    // rates to Number can silently lose precision and under/overcharge.
    // Route providers return metric measurements; normalize to whole metres
    // and seconds, then round the resulting minor-unit amount half-up.
    const distanceMeters = BigInt(
      Math.round(input.estimatedDistanceMeters)
    );
    const durationSeconds = BigInt(
      Math.round(input.estimatedDurationSeconds)
    );

    const distanceFareMinor =
      this.roundRatio(
        input.distanceRateMinorPerKm * distanceMeters,
        BigInt(1_000)
      );

    const durationFareMinor =
      this.roundRatio(
        input.durationRateMinorPerMinute * durationSeconds,
        BigInt(60)
      );

    const bookingFeeMinor =
      input.bookingFeeMinor ?? BigInt(0);

    const subtotalMinor =
      input.baseFareMinor +
      distanceFareMinor +
      durationFareMinor +
      bookingFeeMinor;

    const surgeMultiplierBps =
      input.surgeMultiplierBps ?? BPS_TOTAL;

    const surgeTotalMinor =
      (subtotalMinor *
        BigInt(surgeMultiplierBps)) /
      BigInt(BPS_TOTAL);

    const surgeAdjustmentMinor =
      surgeTotalMinor - subtotalMinor;

    let totalMinor =
      subtotalMinor + surgeAdjustmentMinor;

    if (
      input.minimumFareMinor !== undefined &&
      totalMinor < input.minimumFareMinor
    ) {
      totalMinor = input.minimumFareMinor;
    }

    if (input.promotion && input.currency !== "AOA") {
      throw new Error("MARKA Mobility promotions are currently defined in AOA only.");
    }

    const promotion = input.promotion
      ? evaluateMobilityPromotion({
          vehicle: input.promotion.vehicle,
          estimatedDistanceMeters: input.estimatedDistanceMeters,
          longDistanceThresholdMeters:
            input.promotion.longDistanceThresholdMeters,
          isPeakHour: input.promotion.isPeakHour,
          quotedFareMinor: totalMinor,
          minimumPayableFareMinor:
            input.promotion.minimumPayableFareMinor,
          availablePromotionBudgetMinor:
            input.promotion.availablePromotionBudgetMinor,
          enabled: input.promotion.enabled,
        })
      : undefined;

    if (promotion) {
      totalMinor = promotion.finalFareMinor;
    }

    return {
      currency: input.currency,
      baseFareMinor: input.baseFareMinor,
      distanceFareMinor,
      durationFareMinor,
      bookingFeeMinor,
      subtotalMinor,
      surgeAdjustmentMinor,
      totalMinor,
      estimatedDistanceMeters:
        input.estimatedDistanceMeters,
      estimatedDurationSeconds:
        input.estimatedDurationSeconds,
      surgeMultiplierBps,
      metadata: input.metadata,
      promotion,
    };
  }

  private validate(
    input: MobilityPricingInput
  ): void {
    if (!/^[A-Z]{3}$/.test(input.currency)) {
      throw new Error(
        "Mobility currency must be a valid ISO 4217 code."
      );
    }

    if (
      input.baseFareMinor < BigInt(0) ||
      input.distanceRateMinorPerKm < BigInt(0) ||
      input.durationRateMinorPerMinute < BigInt(0)
    ) {
      throw new Error(
        "Mobility pricing values cannot be negative."
      );
    }

    if (
      input.bookingFeeMinor !== undefined &&
      input.bookingFeeMinor < BigInt(0)
    ) {
      throw new Error(
        "Mobility booking fee cannot be negative."
      );
    }

    if (
      input.minimumFareMinor !== undefined &&
      input.minimumFareMinor < BigInt(0)
    ) {
      throw new Error(
        "Mobility minimum fare cannot be negative."
      );
    }

    if (
      !Number.isFinite(input.estimatedDistanceMeters) ||
      input.estimatedDistanceMeters < 0 ||
      input.estimatedDistanceMeters > Number.MAX_SAFE_INTEGER
    ) {
      throw new Error(
        "Estimated distance must be a valid non-negative number."
      );
    }

    if (
      !Number.isFinite(input.estimatedDurationSeconds) ||
      input.estimatedDurationSeconds < 0 ||
      input.estimatedDurationSeconds > Number.MAX_SAFE_INTEGER
    ) {
      throw new Error(
        "Estimated duration must be a valid non-negative number."
      );
    }

    const surgeMultiplierBps =
      input.surgeMultiplierBps ?? BPS_TOTAL;

    if (
      !Number.isInteger(surgeMultiplierBps) ||
      surgeMultiplierBps <= 0
    ) {
      throw new Error(
        "Surge multiplier must be a positive integer in basis points."
      );
    }
  }

  private roundRatio(
    numerator: bigint,
    denominator: bigint
  ): bigint {
    if (numerator < BigInt(0) || denominator <= BigInt(0)) {
      throw new Error("Mobility pricing ratio must be non-negative with a positive denominator.");
    }

    return (numerator + denominator / BigInt(2)) / denominator;
  }
}

export const mobilityPricingService =
  new MobilityPricingService();
