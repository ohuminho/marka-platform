export const MOBILITY_DISPATCH_RECOVERY_LEASE_MS = 120_000;

export function isMobilityDispatchRecoveryLeaseActive(
  nextRetryAt: Date | null,
  nowMs = Date.now(),
): boolean {
  return nextRetryAt !== null && nextRetryAt.getTime() > nowMs;
}

export function createMobilityDispatchRecoveryLease(
  now = new Date(),
): Date {
  return new Date(now.getTime() + MOBILITY_DISPATCH_RECOVERY_LEASE_MS);
}

export function shouldHoldMobilityDispatchLease(
  nextStep: string,
  nextStatus: string,
): boolean {
  // A recovery-required ride is ready for an immediate recovery attempt.
  // The lease starts only after SEARCHING is claimed for dispatch.
  return nextStep === "SEARCHING" && nextStatus === "ACTIVE";
}
