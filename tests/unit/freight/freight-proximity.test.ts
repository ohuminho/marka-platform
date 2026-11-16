import assert from "node:assert/strict";
import {
  FREIGHT_PROVIDER_LOCATION_MAX_AGE_MS,
  haversineDistanceKm,
  isFreightProviderLocationFresh,
  isWithinFreightPickupRadius,
} from "../../../src/freight-engine/freight-proximity";

const luanda = { latitude: -8.8389, longitude: 13.2894 };
const nearby = { latitude: -8.9, longitude: 13.3 };
const farAway = { latitude: -9.5, longitude: 13.3 };

assert.ok(haversineDistanceKm(luanda, nearby) < 10);
assert.ok(haversineDistanceKm(luanda, farAway) > 20);
assert.equal(isWithinFreightPickupRadius(luanda, nearby), true);
assert.equal(isWithinFreightPickupRadius(luanda, farAway), false);
assert.equal(isFreightProviderLocationFresh(new Date(1000), 1000 + FREIGHT_PROVIDER_LOCATION_MAX_AGE_MS), true);
assert.equal(isFreightProviderLocationFresh(new Date(1000), 1001 + FREIGHT_PROVIDER_LOCATION_MAX_AGE_MS), false);
assert.equal(isFreightProviderLocationFresh(null, 1000), false);
assert.equal(isFreightProviderLocationFresh(new Date(2000), 1000), false);

console.log("Freight proximity and location freshness rules passed.");
