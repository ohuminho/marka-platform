export type FreightProviderAvailabilityState =
  | "OFFLINE"
  | "AVAILABLE"
  | "BUSY"
  | "PAUSED";

export type RequestedFreightProviderAvailability = "AVAILABLE" | "OFFLINE" | "PAUSED";

/**
 * Do not expose a provider as AVAILABLE while they still have active jobs.
 * This protects the UI state when availability changes race with assignments.
 */
export function resolveRequestedFreightAvailability(
  requested: RequestedFreightProviderAvailability,
  remainingActiveAssignments: number,
): FreightProviderAvailabilityState {
  if (!Number.isSafeInteger(remainingActiveAssignments) || remainingActiveAssignments < 0) {
    throw new RangeError("remainingActiveAssignments must be a non-negative safe integer");
  }
  if (requested === "AVAILABLE" && remainingActiveAssignments > 0) return "BUSY";
  return requested;
}

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
