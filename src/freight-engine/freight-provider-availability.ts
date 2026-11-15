import { haversineDistanceKm } from "./freight-proximity";

export type FreightProviderAvailabilityState =
  | "OFFLINE"
  | "AVAILABLE"
  | "BUSY"
  | "PAUSED";

export function canAcceptAdditionalFreightAssignment(
  availability: FreightProviderAvailabilityState,
): boolean {
  return availability === "AVAILABLE" || availability === "BUSY";
}

export function shouldReleaseFreightProvider(
  remainingActiveAssignments: number,
): boolean {
  return Number.isInteger(remainingActiveAssignments) &&
    remainingActiveAssignments === 0;
}

type CapacityAssignment = {
  requestType: string;
  assignedVehicleId: string | null;
  quantity: number | null;
  quantityUnit: string | null;
  destinationLatitude: number | null;
  destinationLongitude: number | null;
  details: unknown;
};

type FreightVehicleCapacity = {
  id: string;
  kind: string;
  capacity: number | string | null;
  capacityUnit: string | null;
  waterType: string | null;
};

function waterTypeOf(details: unknown): string | null {
  if (!details || typeof details !== "object" || Array.isArray(details)) return null;
  const value = (details as Record<string, unknown>).waterType;
  return typeof value === "string" ? value : null;
}

function toCapacityBaseUnits(quantity: number, unit: string, requestType: string): number | null {
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  if (requestType === "WATER_DELIVERY") {
    if (unit === "LITRE") return quantity;
    if (unit === "M3") return quantity * 1000;
    return null;
  }
  if (requestType === "CARGO_SHIPMENT") {
    if (unit === "KG") return quantity;
    if (unit === "TON") return quantity * 1000;
    if (unit === "M3") return quantity;
    return null;
  }
  return null;
}

function capacityBaseUnit(unit: string, requestType: string): string | null {
  if (requestType === "WATER_DELIVERY") {
    return unit === "LITRE" || unit === "M3" ? "LITRE" : null;
  }
  if (requestType === "CARGO_SHIPMENT") {
    if (unit === "KG" || unit === "TON") return "KG";
    if (unit === "M3") return "M3";
  }
  return null;
}

/**
 * Multiple jobs are safe only when they use the same vehicle, same service
 * family and nearby delivery destinations, and their combined declared
 * quantity fits the registered vehicle capacity. Roadside jobs remain single.
 */
export function canAcceptFreightAlongsideActiveAssignments(input: {
  activeAssignments: CapacityAssignment[];
  candidate: CapacityAssignment;
  vehicle: FreightVehicleCapacity;
  maxDestinationDistanceKm?: number;
}): boolean {
  const { activeAssignments, candidate, vehicle } = input;
  if (activeAssignments.length === 0) return true;
  if (
    candidate.requestType !== "WATER_DELIVERY" &&
    candidate.requestType !== "CARGO_SHIPMENT"
  ) return false;
  if (!vehicle.capacity || !vehicle.capacityUnit || candidate.assignedVehicleId !== vehicle.id) return false;

  if (candidate.requestType === "WATER_DELIVERY") {
    if (vehicle.kind !== "WATER_TANKER" || !vehicle.waterType) return false;
    if (waterTypeOf(candidate.details) !== vehicle.waterType) return false;
  } else if (vehicle.kind === "WATER_TANKER") {
    return false;
  }

  const targetUnit = capacityBaseUnit(vehicle.capacityUnit, candidate.requestType);
  const capacity = toCapacityBaseUnits(Number(vehicle.capacity), vehicle.capacityUnit, candidate.requestType);
  const candidateQuantity = candidate.quantity === null || !candidate.quantityUnit
    ? null
    : toCapacityBaseUnits(candidate.quantity, candidate.quantityUnit, candidate.requestType);
  if (targetUnit === null || capacity === null || candidateQuantity === null) return false;
  if (capacityBaseUnit(candidate.quantityUnit!, candidate.requestType) !== targetUnit) return false;

  if (
    candidate.destinationLatitude === null ||
    candidate.destinationLongitude === null
  ) return false;

  let totalQuantity = candidateQuantity;
  for (const active of activeAssignments) {
    if (
      active.requestType !== candidate.requestType ||
      active.assignedVehicleId !== vehicle.id ||
      active.destinationLatitude === null ||
      active.destinationLongitude === null ||
      active.quantity === null ||
      !active.quantityUnit ||
      capacityBaseUnit(active.quantityUnit, candidate.requestType) !== targetUnit
    ) return false;

    if (
      candidate.requestType === "WATER_DELIVERY" &&
      waterTypeOf(active.details) !== vehicle.waterType
    ) return false;

    const activeQuantity = toCapacityBaseUnits(
      active.quantity,
      active.quantityUnit,
      candidate.requestType,
    );
    if (activeQuantity === null) return false;
    totalQuantity += activeQuantity;

    const distance = haversineDistanceKm(
      { latitude: candidate.destinationLatitude, longitude: candidate.destinationLongitude },
      { latitude: active.destinationLatitude, longitude: active.destinationLongitude },
    );
    if (distance > (input.maxDestinationDistanceKm ?? 5)) return false;
  }

  return totalQuantity <= capacity;
}
