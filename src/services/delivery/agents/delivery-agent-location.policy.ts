export const DELIVERY_LOCATION_MIN_INTERVAL_MS = 5_000;

export function getDeliveryLocationCutoff(now: Date): Date {
  return new Date(now.getTime() - DELIVERY_LOCATION_MIN_INTERVAL_MS);
}

export function isDeliveryLocationUpdateThrottled(
  lastLocationAt: Date | null,
  now: Date,
): boolean {
  if (!lastLocationAt) return false;
  return lastLocationAt.getTime() > getDeliveryLocationCutoff(now).getTime();
}
