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
