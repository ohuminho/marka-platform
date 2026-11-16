import assert from "node:assert/strict";

import {
  haversineDistanceKm,
  isFreshAccurateProviderLocation,
  isValidGeoPoint,
} from "../../../src/freight-engine/freight-geography";

assert.equal(isValidGeoPoint({ latitude: 0, longitude: 0 }), true);
assert.equal(isValidGeoPoint({ latitude: 91, longitude: 0 }), false);
assert.equal(isValidGeoPoint({ latitude: 0, longitude: 181 }), false);

const oneDegreeDistance = haversineDistanceKm(
  { latitude: 0, longitude: 0 },
  { latitude: 0, longitude: 1 },
);
assert.notEqual(oneDegreeDistance, null);
assert.ok(Math.abs(oneDegreeDistance! - 111.195) < 0.01);
assert.equal(haversineDistanceKm(
  { latitude: 0, longitude: 0 },
  { latitude: 0, longitude: 0 },
), 0);
assert.equal(haversineDistanceKm(
  { latitude: 95, longitude: 0 },
  { latitude: 0, longitude: 0 },
), null);

const now = Date.parse("2026-11-16T12:00:00.000Z");
const base = {
  latitude: 0,
  longitude: 0,
  accuracyMeters: 25,
  updatedAt: new Date(now - 30_000),
  now,
};
assert.equal(isFreshAccurateProviderLocation(base), true);
assert.equal(isFreshAccurateProviderLocation({ ...base, updatedAt: new Date(now - 181_000) }), false);
assert.equal(isFreshAccurateProviderLocation({ ...base, updatedAt: new Date(now + 1_000) }), false);
assert.equal(isFreshAccurateProviderLocation({ ...base, accuracyMeters: 1001 }), false);
assert.equal(isFreshAccurateProviderLocation({ ...base, latitude: null }), false);

console.log("freight geography checks passed");
