import assert from "node:assert/strict";
import {
  canAcceptAdditionalFreightAssignment,
  canReceiveFreightOffers,
  shouldReleaseFreightProvider,
} from "../../../src/freight-engine/freight-provider-availability";

assert.equal(canAcceptAdditionalFreightAssignment("AVAILABLE"), true);
assert.equal(canAcceptAdditionalFreightAssignment("BUSY"), true);
assert.equal(canAcceptAdditionalFreightAssignment("OFFLINE"), false);
assert.equal(canAcceptAdditionalFreightAssignment("PAUSED"), false);

assert.equal(canReceiveFreightOffers("AVAILABLE", true), true);
assert.equal(canReceiveFreightOffers("BUSY", true), true);
assert.equal(canReceiveFreightOffers("AVAILABLE", false), false);
assert.equal(canReceiveFreightOffers("BUSY", false), false);
assert.equal(canReceiveFreightOffers("OFFLINE", true), false);
assert.equal(canReceiveFreightOffers("PAUSED", true), false);

assert.equal(shouldReleaseFreightProvider(0), true);
assert.equal(shouldReleaseFreightProvider(1), false);
assert.equal(shouldReleaseFreightProvider(3), false);
assert.equal(shouldReleaseFreightProvider(-1), false);
assert.equal(shouldReleaseFreightProvider(0.5), false);

console.log("Freight provider multi-assignment rules passed.");
