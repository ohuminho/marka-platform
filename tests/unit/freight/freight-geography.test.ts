import { describe, expect, it } from "vitest";

import {
  haversineDistanceKm,
  isFreshAccurateProviderLocation,
  isValidGeoPoint,
} from "@/freight-engine/freight-geography";

describe("freight geography", () => {
  it("accepts valid coordinates including the equator and prime meridian", () => {
    expect(isValidGeoPoint({ latitude: 0, longitude: 0 })).toBe(true);
    expect(isValidGeoPoint({ latitude: 91, longitude: 0 })).toBe(false);
    expect(isValidGeoPoint({ latitude: 0, longitude: 181 })).toBe(false);
  });

  it("calculates a stable straight-line distance", () => {
    expect(haversineDistanceKm(
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 1 },
    )).toBeCloseTo(111.195, 2);
    expect(haversineDistanceKm(
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 0 },
    )).toBe(0);
  });

  it("rejects invalid points instead of returning a distance", () => {
    expect(haversineDistanceKm(
      { latitude: 95, longitude: 0 },
      { latitude: 0, longitude: 0 },
    )).toBeNull();
  });

  it("accepts a current accurate location and rejects stale, future or inaccurate fixes", () => {
    const now = Date.parse("2026-11-16T12:00:00.000Z");
    const base = {
      latitude: 0,
      longitude: 0,
      accuracyMeters: 25,
      updatedAt: new Date(now - 30_000),
      now,
    };
    expect(isFreshAccurateProviderLocation(base)).toBe(true);
    expect(isFreshAccurateProviderLocation({ ...base, updatedAt: new Date(now - 181_000) })).toBe(false);
    expect(isFreshAccurateProviderLocation({ ...base, updatedAt: new Date(now + 1_000) })).toBe(false);
    expect(isFreshAccurateProviderLocation({ ...base, accuracyMeters: 1001 })).toBe(false);
    expect(isFreshAccurateProviderLocation({ ...base, latitude: null })).toBe(false);
  });
});
