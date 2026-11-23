import assert from "node:assert/strict";
import { shouldFlagRepeatedDeliveryExceptions } from "../../../src/core/trust/record-delivery-exception";

assert.equal(shouldFlagRepeatedDeliveryExceptions(0), false);
assert.equal(shouldFlagRepeatedDeliveryExceptions(1), false);
assert.equal(shouldFlagRepeatedDeliveryExceptions(2), false);
assert.equal(shouldFlagRepeatedDeliveryExceptions(3), true);
assert.equal(shouldFlagRepeatedDeliveryExceptions(4), true);

console.log("MARKA repeated delivery exception policy tests passed.");
