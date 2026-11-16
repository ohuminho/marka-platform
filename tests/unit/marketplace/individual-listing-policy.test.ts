import assert from "node:assert/strict";
import { canPublishIndividualListing } from "../../../src/marketplace-engine/individual-listing-policy";

assert.equal(canPublishIndividualListing(0), true);
assert.equal(canPublishIndividualListing(1), false);
assert.equal(canPublishIndividualListing(2), false);
assert.equal(canPublishIndividualListing(-1), false);
assert.equal(canPublishIndividualListing(0.5), false);

console.log("Individual listing publication policy tests passed.");
