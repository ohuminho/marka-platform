import assert from "node:assert/strict";
import {
  shouldFlagRepeatedMobilityCancellations,
  shouldRecordMobilityCancellationForReview,
} from "../../../src/core/trust/record-mobility-cancellation";

assert.equal(shouldRecordMobilityCancellationForReview("REQUESTED"), false, "Cancellation before driver assignment is not flagged.");
assert.equal(shouldRecordMobilityCancellationForReview("SEARCHING"), false, "No driver has been assigned yet.");
assert.equal(shouldRecordMobilityCancellationForReview("DRIVER_ASSIGNED"), true);
assert.equal(shouldRecordMobilityCancellationForReview("DRIVER_ARRIVING"), true);
assert.equal(shouldRecordMobilityCancellationForReview("DRIVER_ARRIVED"), true);
assert.equal(shouldFlagRepeatedMobilityCancellations(1), false, "One cancellation is not enough to create a review signal.");
assert.equal(shouldFlagRepeatedMobilityCancellations(2), false, "Two cancellations are not enough to create a review signal.");
assert.equal(shouldFlagRepeatedMobilityCancellations(3), true, "Three cancellations in the rolling window require human review.");
assert.equal(shouldFlagRepeatedMobilityCancellations(4), true);

console.log("MARKA mobility cancellation policy tests passed.");
