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

type WaterDeliveryAssignment = {
  requestType: string;
  assignedVehicleId: string | null;
  quantity: number | null;
  quantityUnit: string | null;
  destinationLatitude: number | null;
  destinationLongitude: number | null;
  details: unknown;
};

type WaterTankerCapacity = {
  id: string;
  kind: string;
  capacity: number | string | null;
  capacityUnit: string | null;
  waterType: string | null;
};

function litres(quantity: number, unit: string): number | null {
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  if (unit === "LITRE") return quantity;
  if (unit === "M3") return quantity * 1000;
  return null;
}

function waterTypeOf(details: unknown): string | null {
  if (!details || typeof details !== "object" || Array.isArray(details)) return null;
  const value = (details as Record<string, unknown>).waterType;
  return typeof value === "string" ? value : null;
}

/**
 * Multiple active jobs are only safe for water deliveries at nearby
 * destinations, using the same registered tanker and within its remaining
 * capacity. Cargo weight/volume is not yet captured by the request form,
 * so cargo and roadside jobs remain single-assignment.
 */
export function canAcceptFreightAlongsideActiveAssignments(input: {
  activeAssignments: WaterDeliveryAssignment[];
  candidate: WaterDeliveryAssignment;
  vehicle: WaterTankerCapacity;
  maxDestinationDistanceKm?: number;
}): boolean {
  const { activeAssignments, candidate, vehicle } = input;
  if (activeAssignments.length === 0) return true;
  if (candidate.requestType !== "WATER_DELIVERY" || vehicle.kind !== "WATER_TANKER") return false;
  if (!vehicle.capacity || !vehicle.capacityUnit || !vehicle.waterType) return false;
  if (vehicle.capacityUnit !== "LITRE" && vehicle.capacityUnit !== "M3") return false;
  if (waterTypeOf(candidate.details) !== vehicle.waterType) return false;
  if (candidate.assignedVehicleId !== vehicle.id) return false;
  if (candidate.destinationLatitude === null || candidate.destinationLongitude === null) return false;

  const tankCapacity = litres(Number(vehicle.capacity), vehicle.capacityUnit);
  const candidateQuantity = candidate.quantity === null || !candidate.quantityUnit
    ? null
    : litres(candidate.quantity, candidate.quantityUnit);
  if (tankCapacity === null || candidateQuantity === null) return false;

  let totalLitres = candidateQuantity;
  for (const active of activeAssignments) {
    if (
      active.requestType !== "WATER_DELIVERY" ||
      active.assignedVehicleId !== vehicle.id ||
      active.destinationLatitude === null ||
      active.destinationLongitude === null ||
      waterTypeOf(active.details) !== vehicle.waterType ||
      active.quantity === null ||
      !active.quantityUnit
    ) return false;

    const activeQuantity = litres(active.quantity, active.quantityUnit);
    if (activeQuantity === null) return false;
    totalLitres += activeQuantity;

    const distance = haversineDistanceKm(
      { latitude: candidate.destinationLatitude, longitude: candidate.destinationLongitude },
      { latitude: active.destinationLatitude, longitude: active.destinationLongitude },
    );
    if (distance > (input.maxDestinationDistanceKm ?? 5)) return false;
  }

  return totalLitres <= tankCapacity;
}
