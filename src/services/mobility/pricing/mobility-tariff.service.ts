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

function readMinor(name: string): bigint | undefined {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") return undefined;
  if (!/^[0-9]+$/.test(value)) throw new Error("Invalid MARKA Mobility tariff value: " + name);
  return BigInt(value);
}

function readTariff(serviceType: string): MobilityTariff | null {
  const prefix = "MARKA_MOBILITY_" + serviceType + "_";
  const baseFareMinor = readMinor(prefix + "BASE_FARE_MINOR");
  const distanceRateMinorPerKm = readMinor(prefix + "DISTANCE_RATE_MINOR_PER_KM");
  const durationRateMinorPerMinute = readMinor(prefix + "DURATION_RATE_MINOR_PER_MINUTE");
  const minimumFareMinor = readMinor(prefix + "MINIMUM_FARE_MINOR");

  // Never silently apply test or fallback prices in production. Every category
  // must have an explicitly approved tariff in the active environment.
  if (
    baseFareMinor === undefined ||
    distanceRateMinorPerKm === undefined ||
    durationRateMinorPerMinute === undefined ||
    minimumFareMinor === undefined
  ) return null;

  return { baseFareMinor, distanceRateMinorPerKm, durationRateMinorPerMinute, minimumFareMinor };
}

/** Server-authoritative tariff calculation in AOA minor units (centavos). */
export function quoteMobilityFare(serviceType: string, distanceMeters: number, durationSeconds: number): MobilityFareQuote | null {
  const normalizedType = serviceType.trim().toUpperCase();
  if (!["TAXI", "MOTO_TAXI"].includes(normalizedType)) return null;

  const tariff = readTariff(normalizedType);
  if (!tariff) return null;

  const bookingFeeMinor = readMinor("MARKA_MOBILITY_" + normalizedType + "_BOOKING_FEE_MINOR");
  const result = mobilityPricingService.calculate({
    currency: "AOA",
    ...tariff,
    estimatedDistanceMeters: distanceMeters,
    estimatedDurationSeconds: durationSeconds,
    ...(bookingFeeMinor === undefined ? {} : { bookingFeeMinor }),
  });
  if (result.totalMinor > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Configured mobility fare exceeds the supported display range.");
  return {
    currency: "AOA",
    totalMinor: result.totalMinor.toString(),
    totalAOA: Number(result.totalMinor) / 100,
    distanceMeters,
    durationSeconds,
  };
}
