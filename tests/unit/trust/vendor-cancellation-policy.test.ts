import assert from "node:assert/strict";
import { shouldFlagRepeatedVendorCancellations } from "../../../src/core/trust/record-vendor-cancellation";

assert.equal(shouldFlagRepeatedVendorCancellations(0), false);
assert.equal(shouldFlagRepeatedVendorCancellations(1), false);
assert.equal(shouldFlagRepeatedVendorCancellations(2), false);
assert.equal(shouldFlagRepeatedVendorCancellations(3), true);
assert.equal(shouldFlagRepeatedVendorCancellations(5), true);

console.log("MARKA repeated vendor cancellation policy tests passed.");
