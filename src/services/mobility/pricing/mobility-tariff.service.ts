import { mobilityPricingService } from "./mobility-pricing.service";

export interface MobilityFareQuote {
  currency: "AOA";
  totalMinor: string;
  totalAOA: number;
  distanceMeters: number;
  durationSeconds: number;
}

type MobilityTariff = {
  baseFareMinor: bigint;
  distanceRateMinorPerKm: bigint;
  durationRateMinorPerMinute: bigint;
  minimumFareMinor: bigint;
};

// MARKA's initial AOA tariffs are internal defaults. Environment values can override them.
const DEFAULT_TARIFFS: Record<string, MobilityTariff> = {
  TAXI: {
    baseFareMinor: 25_000n,
    distanceRateMinorPerKm: 7_500n,
    durationRateMinorPerMinute: 3_000n,
    minimumFareMinor: 50_000n,
  },
  MOTO_TAXI: {
    baseFareMinor: 15_000n,
    distanceRateMinorPerKm: 10_000n,
    durationRateMinorPerMinute: 2_000n,
    minimumFareMinor: 35_000n,
  },
};

function readMinor(name: string): bigint | undefined {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") return undefined;
  if (!/^[0-9]+$/.test(value)) throw new Error("Invalid MARKA Mobility tariff value: " + name);
  return BigInt(value);
}

/** Server-authoritative tariff calculation in AOA minor units (centavos). */
export function quoteMobilityFare(serviceType: string, distanceMeters: number, durationSeconds: number): MobilityFareQuote | null {
  const normalizedType = serviceType.trim().toUpperCase();
  const defaults = DEFAULT_TARIFFS[normalizedType];
  if (!defaults) return null;
  const prefix = "MARKA_MOBILITY_" + normalizedType + "_";
  const baseFareMinor = readMinor(prefix + "BASE_FARE_MINOR") ?? defaults.baseFareMinor;
  const distanceRateMinorPerKm = readMinor(prefix + "DISTANCE_RATE_MINOR_PER_KM") ?? defaults.distanceRateMinorPerKm;
  const durationRateMinorPerMinute = readMinor(prefix + "DURATION_RATE_MINOR_PER_MINUTE") ?? defaults.durationRateMinorPerMinute;
  const minimumFareMinor = readMinor(prefix + "MINIMUM_FARE_MINOR") ?? defaults.minimumFareMinor;
  const bookingFeeMinor = readMinor(prefix + "BOOKING_FEE_MINOR");
  const result = mobilityPricingService.calculate({
    currency: "AOA", baseFareMinor, distanceRateMinorPerKm, durationRateMinorPerMinute,
    estimatedDistanceMeters: distanceMeters, estimatedDurationSeconds: durationSeconds,
    ...(bookingFeeMinor === undefined ? {} : { bookingFeeMinor }),
    minimumFareMinor,
  });
  if (result.totalMinor > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Configured mobility fare exceeds the supported display range.");
  return { currency: "AOA", totalMinor: result.totalMinor.toString(), totalAOA: Number(result.totalMinor) / 100, distanceMeters, durationSeconds };
}
