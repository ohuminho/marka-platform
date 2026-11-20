export type MobilitySplitServiceType = "taxi" | "moto" | "carga";

export interface MobilitySplit {
  totalKz: number;
  commissionRate: number;
  platformFeeKz: number;
  providerAmountKz: number;
}

export interface MobilitySplitMinor {
  totalKz: bigint;
  commissionRate: number;
  platformFeeKz: bigint;
  providerAmountKz: bigint;
}

const COMMISSION_RATE_BPS: Record<MobilitySplitServiceType, number> = {
  taxi: 1_200,
  moto: 1_000,
  carga: 1_000,
};
const BPS_TOTAL = 10_000n;

/**
 * Resolve persisted Mobility service names to the commercial split class.
 * Unknown services fail closed: they must never silently inherit taxi rates.
 */
export function resolveMobilitySplitServiceType(serviceType: string): MobilitySplitServiceType {
  const normalized = serviceType.trim().toUpperCase().replace(/[\s-]+/g, "_");

  if (["TAXI", "CAR", "STANDARD_TAXI", "NORMAL_TAXI"].includes(normalized)) return "taxi";
  if (["MOTO", "MOTO_TAXI", "MOTOTAXI"].includes(normalized)) return "moto";
  if ([
    "CARGA",
    "CARGO",
    "CARGO_SHIPMENT",
    "FREIGHT",
    "MOTO_BOX",
    "VAN",
    "PICKUP",
    "LIGHT_TRUCK",
    "MEDIUM_TRUCK",
    "TRUCK",
    "TIPPER_TRUCK",
    "HEAVY_TRUCK",
  ].includes(normalized)) return "carga";

  throw new RangeError(`Unsupported MARKA Mobility service type: ${serviceType}`);
}

export function getMobilityCommissionRateBps(serviceType: string): number {
  return COMMISSION_RATE_BPS[resolveMobilitySplitServiceType(serviceType)];
}

/**
 * Exact integer-Kz split for internal/server financial processing.
 * Half-Kz ties are rounded up; provider amount is the exact remainder.
 */
export function calculateSplitMinor(
  totalKz: bigint,
  serviceType: MobilitySplitServiceType,
): MobilitySplitMinor {
  if (totalKz < 0n) throw new RangeError("totalKz cannot be negative.");

  const rateBps = COMMISSION_RATE_BPS[serviceType];
  const platformFeeKz = (totalKz * BigInt(rateBps) + BPS_TOTAL / 2n) / BPS_TOTAL;

  return {
    totalKz,
    commissionRate: rateBps / Number(BPS_TOTAL),
    platformFeeKz,
    providerAmountKz: totalKz - platformFeeKz,
  };
}

/**
 * Public number-based API for previews/admin screens.
 * Accepts whole Kz only and uses BigInt internally to avoid floating-point
 * percentage arithmetic. Monetary results are returned as safe integers.
 */
export function calculateSplit(
  totalKz: number,
  serviceType: MobilitySplitServiceType,
): MobilitySplit {
  if (!Number.isSafeInteger(totalKz) || totalKz < 0) {
    throw new RangeError("totalKz must be a non-negative safe integer in whole Kz.");
  }

  const split = calculateSplitMinor(BigInt(totalKz), serviceType);
  const platformFeeKz = Number(split.platformFeeKz);
  const providerAmountKz = Number(split.providerAmountKz);

  if (!Number.isSafeInteger(platformFeeKz) || !Number.isSafeInteger(providerAmountKz)) {
    throw new RangeError("Calculated split exceeds JavaScript's safe integer range.");
  }

  return {
    totalKz,
    commissionRate: split.commissionRate,
    platformFeeKz,
    providerAmountKz,
  };
}
