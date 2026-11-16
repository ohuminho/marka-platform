import { mobilityPricingService } from "./mobility-pricing.service";

export interface MobilityFareQuote {
  currency: "AOA";
  totalMinor: bigint;
  totalAOA: number;
  distanceMeters: number;
  durationSeconds: number;
}

function readMinor(name: string): bigint | undefined {
  const value = process.env[name];
  if (!value || !/^[0-9]+$/.test(value)) return undefined;
  try { return BigInt(value); } catch { return undefined; }
}

/** Rates are supplied by MARKA-controlled production environment variables. */
export function quoteMobilityFare(serviceType: string, distanceMeters: number, durationSeconds: number): MobilityFareQuote | null {
  const prefix = "MARKA_MOBILITY_" + serviceType.trim().toUpperCase() + "_";
  const baseFareMinor = readMinor(prefix + "BASE_FARE_MINOR");
  const distanceRateMinorPerKm = readMinor(prefix + "DISTANCE_RATE_MINOR_PER_KM");
  const durationRateMinorPerMinute = readMinor(prefix + "DURATION_RATE_MINOR_PER_MINUTE");
  if (baseFareMinor === undefined || distanceRateMinorPerKm === undefined || durationRateMinorPerMinute === undefined) return null;
  const bookingFeeMinor = readMinor(prefix + "BOOKING_FEE_MINOR");
  const minimumFareMinor = readMinor(prefix + "MINIMUM_FARE_MINOR");
  const result = mobilityPricingService.calculate({
    currency: "AOA", baseFareMinor, distanceRateMinorPerKm, durationRateMinorPerMinute,
    estimatedDistanceMeters: distanceMeters, estimatedDurationSeconds: durationSeconds,
    ...(bookingFeeMinor === undefined ? {} : { bookingFeeMinor }),
    ...(minimumFareMinor === undefined ? {} : { minimumFareMinor }),
  });
  if (result.totalMinor > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Configured mobility fare exceeds the supported display range.");
  return { currency: "AOA", totalMinor: result.totalMinor, totalAOA: Number(result.totalMinor) / 100, distanceMeters, durationSeconds };
}
