export const FREIGHT_PROVIDER_LOCATION_MAX_AGE_MS = 3 * 60 * 1000;
export const FREIGHT_PROVIDER_MAX_PICKUP_DISTANCE_KM = 20;

export type GeoPoint = {
  latitude: number;
  longitude: number;
};

export function haversineDistanceKm(from: GeoPoint, to: GeoPoint): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const fromLatitude = radians(from.latitude);
  const toLatitude = radians(to.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 6371.0088 * 2 * Math.asin(Math.sqrt(Math.min(1, haversine)));
}

export function isFreightProviderLocationFresh(
  updatedAt: Date | null | undefined,
  now = Date.now(),
): boolean {
  if (!updatedAt || Number.isNaN(updatedAt.getTime())) return false;
  const age = now - updatedAt.getTime();
  return age >= 0 && age <= FREIGHT_PROVIDER_LOCATION_MAX_AGE_MS;
}

export function isWithinFreightPickupRadius(
  providerLocation: GeoPoint,
  pickup: GeoPoint,
  maxDistanceKm = FREIGHT_PROVIDER_MAX_PICKUP_DISTANCE_KM,
): boolean {
  if (!Number.isFinite(maxDistanceKm) || maxDistanceKm < 0) return false;
  return haversineDistanceKm(providerLocation, pickup) <= maxDistanceKm;
}
