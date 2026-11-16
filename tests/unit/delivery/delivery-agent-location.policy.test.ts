import assert from "node:assert/strict";
import {
  DELIVERY_LOCATION_MIN_INTERVAL_MS,
  getDeliveryLocationCutoff,
  isDeliveryLocationUpdateThrottled,
} from "../../../src/services/delivery/agents/delivery-agent-location.policy";

const now = new Date("2026-11-16T10:00:00.000Z");

assert.equal(DELIVERY_LOCATION_MIN_INTERVAL_MS, 5_000);
assert.equal(
  getDeliveryLocationCutoff(now).toISOString(),
  "2026-11-16T09:59:55.000Z",
);
assert.equal(isDeliveryLocationUpdateThrottled(null, now), false);
assert.equal(
  isDeliveryLocationUpdateThrottled(new Date(now.getTime() - 4_999), now),
  true,
);
assert.equal(
  isDeliveryLocationUpdateThrottled(new Date(now.getTime() - 5_000), now),
  false,
);
assert.equal(
  isDeliveryLocationUpdateThrottled(new Date(now.getTime() - 5_001), now),
  false,
);

console.log("Delivery agent location policy tests passed.");
