import { MobilityRideStatus } from "@prisma/client";

export const MAX_ACTIVE_RIDES_PER_DRIVER = 2;
export const MAX_SHARED_PICKUP_DISTANCE_METERS = 2_000;
export const MAX_SHARED_DROPOFF_DISTANCE_METERS = 3_000;

export interface MobilityRideRoutePoint {
  pickupLatitude: number | { toString(): string };
  pickupLongitude: number | { toString(): string };
  dropoffLatitude: number | { toString(): string };
  dropoffLongitude: number | { toString(): string };
  serviceType: string;
  status: MobilityRideStatus;
  metadata?: unknown;
}

export function mobilityPassengerCount(metadata: unknown): number {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return 1;
  const count = (metadata as Record<string, unknown>).passengerCount;
  return typeof count === "number" && Number.isInteger(count) && count > 0 ? count : 1;
}

export function distanceBetweenCoordinatesMeters(
  latA: number,
  lonA: number,
  latB: number,
  lonB: number,
): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLat = radians(latB - latA);
  const deltaLon = radians(lonB - lonA);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(radians(latA)) *
      Math.cos(radians(latB)) *
      Math.sin(deltaLon / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Conservative endpoint-proximity gate for shared dispatch.
 * Only pre-pickup assignments may be grouped; an active passenger trip
 * is never combined with another request. This is a safety filter, not
 * a replacement for road-network route optimization.
 */
export function areMobilityRidesCompatible(
  requestedRide: MobilityRideRoutePoint,
  activeRides: readonly MobilityRideRoutePoint[],
  vehicleCapacity: number,
): boolean {
  if (activeRides.length >= MAX_ACTIVE_RIDES_PER_DRIVER) return false;
  if (activeRides.some((ride) =>
    ride.status !== MobilityRideStatus.DRIVER_ASSIGNED &&
    ride.status !== MobilityRideStatus.DRIVER_ARRIVING
  )) return false;

  const requestedService = requestedRide.serviceType.trim().toUpperCase();
  const requestedPassengers = mobilityPassengerCount(requestedRide.metadata);
  const activePassengers = activeRides.reduce(
    (total, ride) => total + mobilityPassengerCount(ride.metadata),
    0,
  );
  if (requestedPassengers + activePassengers > vehicleCapacity) return false;

  return activeRides.every((ride) => {
    if (ride.serviceType.trim().toUpperCase() !== requestedService) return false;
    const pickupDistance = distanceBetweenCoordinatesMeters(
      Number(requestedRide.pickupLatitude),
      Number(requestedRide.pickupLongitude),
      Number(ride.pickupLatitude),
      Number(ride.pickupLongitude),
    );
    const dropoffDistance = distanceBetweenCoordinatesMeters(
      Number(requestedRide.dropoffLatitude),
      Number(requestedRide.dropoffLongitude),
      Number(ride.dropoffLatitude),
      Number(ride.dropoffLongitude),
    );
    return (
      pickupDistance <= MAX_SHARED_PICKUP_DISTANCE_METERS &&
      dropoffDistance <= MAX_SHARED_DROPOFF_DISTANCE_METERS
    );
  });
}
