export type FreightCapacityUnit = "KG" | "TON" | "M3" | "LITRE";

type CapacityValue = number | string | null | undefined;

type NormalizedCapacity = { dimension: "MASS" | "VOLUME"; baseUnits: number };

function normalizeCapacity(value: CapacityValue, unit: string | null | undefined): NormalizedCapacity | null {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  switch (unit) {
    case "KG":
      return { dimension: "MASS", baseUnits: amount };
    case "TON":
      return { dimension: "MASS", baseUnits: amount * 1000 };
    case "LITRE":
      return { dimension: "VOLUME", baseUnits: amount };
    case "M3":
      return { dimension: "VOLUME", baseUnits: amount * 1000 };
    default:
      return null;
  }
}

/**
 * Checks a provider vehicle's registered capacity against a freight request.
 * Mass and volume are deliberately incomparable; unknown capacities never pass.
 */
export function canVehicleCarryQuantity(
  vehicleCapacity: CapacityValue,
  vehicleUnit: string | null | undefined,
  requestedQuantity: CapacityValue,
  requestedUnit: string | null | undefined,
): boolean {
  const available = normalizeCapacity(vehicleCapacity, vehicleUnit);
  const requested = normalizeCapacity(requestedQuantity, requestedUnit);
  if (!available || !requested || available.dimension !== requested.dimension) return false;

  // Small decimal tolerance avoids rejecting equal capacities due to floating-point representation.
  return available.baseUnits + Math.max(1, requested.baseUnits) * 1e-9 >= requested.baseUnits;
}
