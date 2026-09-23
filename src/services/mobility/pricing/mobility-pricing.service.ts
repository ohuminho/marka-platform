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
}

const BPS_TOTAL = 10_000;

export class MobilityPricingService {
  calculate(
    input: MobilityPricingInput
  ): MobilityPriceBreakdown {
    this.validate(input);

    const distanceKm =
      input.estimatedDistanceMeters / 1_000;

    const durationMinutes =
      input.estimatedDurationSeconds / 60;

    const distanceFareMinor =
      this.roundMinor(
        BigInt(
          Math.round(
            Number(input.distanceRateMinorPerKm) *
              distanceKm
          )
        )
      );

    const durationFareMinor =
      this.roundMinor(
        BigInt(
          Math.round(
            Number(input.durationRateMinorPerMinute) *
              durationMinutes
          )
        )
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
      input.estimatedDistanceMeters < 0
    ) {
      throw new Error(
        "Estimated distance must be a valid non-negative number."
      );
    }

    if (
      !Number.isFinite(input.estimatedDurationSeconds) ||
      input.estimatedDurationSeconds < 0
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

  private roundMinor(
    amountMinor: bigint
  ): bigint {
    return amountMinor < BigInt(0)
      ? BigInt(0)
      : amountMinor;
  }
}

export const mobilityPricingService =
  new MobilityPricingService();
