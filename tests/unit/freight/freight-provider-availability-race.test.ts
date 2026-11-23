import assert from "node:assert/strict";

import { resolveRequestedFreightAvailability } from "../../../src/freight-engine/freight-provider-availability";

assert.equal(resolveRequestedFreightAvailability("AVAILABLE", 0), "AVAILABLE");
assert.equal(resolveRequestedFreightAvailability("AVAILABLE", 1), "BUSY");
assert.equal(resolveRequestedFreightAvailability("AVAILABLE", 3), "BUSY");
assert.equal(resolveRequestedFreightAvailability("OFFLINE", 2), "OFFLINE");
assert.equal(resolveRequestedFreightAvailability("PAUSED", 1), "PAUSED");
assert.throws(() => resolveRequestedFreightAvailability("AVAILABLE", -1), RangeError);
assert.throws(() => resolveRequestedFreightAvailability("AVAILABLE", 1.5), RangeError);

console.log("Freight availability race rules passed.");
