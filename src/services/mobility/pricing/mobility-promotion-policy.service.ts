/**
 * MARKA Mobility promotional pricing policy.
 *
 * Amounts use the pricing engine's minor-unit convention. For AOA, 1 Kz = 100
 * minor units. The policy is deliberately pure: callers must supply verified
 * trip facts, the configured long-distance threshold, and an authorized
 * platform-funded promotion budget. It does not alter driver commission or
 * settlement calculations.
 */
export type MobilityPromotionVehicle = "TAXI" | "MOTO_TAXI";

export interface MobilityPromotionInput {
  vehicle: MobilityPromotionVehicle;
  estimatedDistanceMeters: number;
  longDistanceThresholdMeters: number;
  isPeakHour: boolean;
  quotedFareMinor: bigint;
  minimumPayableFareMinor: bigint;
  availablePromotionBudgetMinor: bigint;
  enabled?: boolean;
}

export interface MobilityPromotionResult {
  eligible: boolean;
  reason: "DISABLED" | "SHORT_OFF_PEAK" | "BUDGET_INSUFFICIENT" | "MINIMUM_FARE_PROTECTED" | "ELIGIBLE";
  discountMinor: bigint;
  finalFareMinor: bigint;
  maximumDiscountMinor: bigint;
  fundingRequiredMinor: bigint;
}

const AOA_MINOR_UNITS_PER_KWANZA = BigInt(100);
const TAXI_DISCOUNT_KWANZAS = BigInt(1_000);
const MOTO_TAXI_DISCOUNT_KWANZAS = BigInt(500);

export function evaluateMobilityPromotion(
  input: MobilityPromotionInput,
): MobilityPromotionResult {
  if (
    !Number.isFinite(input.estimatedDistanceMeters) ||
    input.estimatedDistanceMeters < 0 ||
    !Number.isFinite(input.longDistanceThresholdMeters) ||
    input.longDistanceThresholdMeters <= 0
  ) {
    throw new Error("Promotion distance must be non-negative and the long-distance threshold must be positive.");
  }

  if (
    input.quotedFareMinor < BigInt(0) ||
    input.minimumPayableFareMinor < BigInt(0) ||
    input.availablePromotionBudgetMinor < BigInt(0)
  ) {
    throw new Error("Promotion money values cannot be negative.");
  }

  const maximumDiscountMinor =
    (input.vehicle === "TAXI"
      ? TAXI_DISCOUNT_KWANZAS
      : MOTO_TAXI_DISCOUNT_KWANZAS) *
    AOA_MINOR_UNITS_PER_KWANZA;

  const longDistance =
    input.estimatedDistanceMeters >= input.longDistanceThresholdMeters;
  const eligible = longDistance || input.isPeakHour;

  if (input.enabled === false) {
    return {
      eligible: false,
      reason: "DISABLED",
      discountMinor: BigInt(0),
      finalFareMinor: input.quotedFareMinor,
      maximumDiscountMinor,
      fundingRequiredMinor: BigInt(0),
    };
  }

  if (!eligible) {
    return {
      eligible: false,
      reason: "SHORT_OFF_PEAK",
      discountMinor: BigInt(0),
      finalFareMinor: input.quotedFareMinor,
      maximumDiscountMinor,
      fundingRequiredMinor: BigInt(0),
    };
  }

  // MARKA's published saving is a fixed minimum, not a variable partial
  // discount. If the platform cannot fund the full amount or the fare floor
  // would be breached, do not advertise/apply the promotion on this quote.
  if (input.quotedFareMinor - maximumDiscountMinor < input.minimumPayableFareMinor) {
    return {
      eligible: false,
      reason: "MINIMUM_FARE_PROTECTED",
      discountMinor: BigInt(0),
      finalFareMinor: input.quotedFareMinor,
      maximumDiscountMinor,
      fundingRequiredMinor: BigInt(0),
    };
  }

  if (input.availablePromotionBudgetMinor < maximumDiscountMinor) {
    return {
      eligible: false,
      reason: "BUDGET_INSUFFICIENT",
      discountMinor: BigInt(0),
      finalFareMinor: input.quotedFareMinor,
      maximumDiscountMinor,
      fundingRequiredMinor: BigInt(0),
    };
  }

  return {
    eligible: true,
    reason: "ELIGIBLE",
    discountMinor: maximumDiscountMinor,
    finalFareMinor: input.quotedFareMinor - maximumDiscountMinor,
    maximumDiscountMinor,
    fundingRequiredMinor: maximumDiscountMinor,
  };
}
