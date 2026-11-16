export type GeoPoint = { latitude: number; longitude: number };

export function isValidGeoPoint(point: GeoPoint | null | undefined): point is GeoPoint {
  return Boolean(
    point &&
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    point.latitude >= -90 &&
    point.latitude <= 90 &&
    point.longitude >= -180 &&
    point.longitude <= 180
  );
}

export function haversineDistanceKm(from: GeoPoint, to: GeoPoint): number | null {
  if (!isValidGeoPoint(from) || !isValidGeoPoint(to)) return null;

  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const fromLatitude = radians(from.latitude);
  const toLatitude = radians(to.latitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  const bounded = Math.min(1, Math.max(0, a));
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(bounded), Math.sqrt(1 - bounded));
}

export function isFreshAccurateProviderLocation(input: {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  accuracyMeters: number | null | undefined;
  updatedAt: Date | null | undefined;
  now?: number;
  maxAgeMs?: number;
  maxAccuracyMeters?: number;
}): boolean {
  const { latitude, longitude, accuracyMeters, updatedAt } = input;
  const now = input.now ?? Date.now();
  const maxAgeMs = input.maxAgeMs ?? 3 * 60 * 1000;
  const maxAccuracyMeters = input.maxAccuracyMeters ?? 1000;

  if (!isValidGeoPoint(
    latitude === null || latitude === undefined || longitude === null || longitude === undefined
      ? null
      : { latitude, longitude }
  )) return false;
  if (!Number.isFinite(accuracyMeters) || (accuracyMeters ?? 0) <= 0 || (accuracyMeters ?? Infinity) > maxAccuracyMeters) return false;
  if (!(updatedAt instanceof Date) || !Number.isFinite(updatedAt.getTime())) return false;

  const ageMs = now - updatedAt.getTime();
  return ageMs >= 0 && ageMs <= maxAgeMs;
}
