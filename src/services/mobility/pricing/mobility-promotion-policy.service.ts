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
  reason: "DISABLED" | "SHORT_OFF_PEAK" | "ELIGIBLE";
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
    input.longDistanceThresholdMeters < 0
  ) {
    throw new Error("Promotion distance values must be valid non-negative numbers.");
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

  // The promotion must never make the fare negative or cross the configured floor.
  const affordableDiscountMinor =
    input.quotedFareMinor > input.minimumPayableFareMinor
      ? input.quotedFareMinor - input.minimumPayableFareMinor
      : BigInt(0);

  // The platform-funded budget caps the actual discount; driver earnings are untouched.
  const discountMinor = [
    maximumDiscountMinor,
    affordableDiscountMinor,
    input.availablePromotionBudgetMinor,
  ].reduce((minimum, amount) => amount < minimum ? amount : minimum);

  return {
    eligible: true,
    reason: "ELIGIBLE",
    discountMinor,
    finalFareMinor: input.quotedFareMinor - discountMinor,
    maximumDiscountMinor,
    fundingRequiredMinor: discountMinor,
  };
}
