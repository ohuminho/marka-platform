import assert from "node:assert/strict";

const reviewableStatuses = new Set(["DRIVER_ASSIGNED", "DRIVER_ARRIVING", "DRIVER_ARRIVED"]);
const shouldRecord = (status: string) => reviewableStatuses.has(status);
const shouldFlagForReview = (count: number) => count >= 3;

assert.equal(shouldRecord("REQUESTED"), false, "Cancellation before driver assignment is not flagged.");
assert.equal(shouldRecord("SEARCHING"), false, "No driver has been assigned yet.");
assert.equal(shouldRecord("DRIVER_ASSIGNED"), true);
assert.equal(shouldRecord("DRIVER_ARRIVING"), true);
assert.equal(shouldRecord("DRIVER_ARRIVED"), true);
assert.equal(shouldFlagForReview(1), false, "One cancellation is not enough to create a review signal.");
assert.equal(shouldFlagForReview(2), false, "Two cancellations are not enough to create a review signal.");
assert.equal(shouldFlagForReview(3), true, "Three cancellations in the rolling window require human review.");
assert.equal(shouldFlagForReview(4), true);

console.log("MARKA mobility cancellation policy tests passed.");
