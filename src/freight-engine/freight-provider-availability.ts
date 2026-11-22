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

export function canReceiveFreightOffers(
  availability: FreightProviderAvailabilityState,
  hasFreshAccurateLocation: boolean,
): boolean {
  return hasFreshAccurateLocation && canAcceptAdditionalFreightAssignment(availability);
}

export function shouldReleaseFreightProvider(
  remainingActiveAssignments: number,
): boolean {
  return Number.isInteger(remainingActiveAssignments) &&
    remainingActiveAssignments === 0;
}
