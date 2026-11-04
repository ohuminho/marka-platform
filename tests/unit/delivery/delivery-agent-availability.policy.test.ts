import assert from "node:assert/strict";
import {
  assertDeliveryAgentAvailabilityChange,
} from "@/services/delivery/agents/delivery-agent-availability.policy";

assert.doesNotThrow(() =>
  assertDeliveryAgentAvailabilityChange(0, "AVAILABLE"),
);
assert.doesNotThrow(() =>
  assertDeliveryAgentAvailabilityChange(0, "OFFLINE"),
);
assert.doesNotThrow(() =>
  assertDeliveryAgentAvailabilityChange(2, "BUSY"),
);
assert.throws(
  () => assertDeliveryAgentAvailabilityChange(1, "AVAILABLE"),
  /DELIVERY_AGENT_HAS_ACTIVE_DELIVERY/,
);
assert.throws(
  () => assertDeliveryAgentAvailabilityChange(1, "OFFLINE"),
  /DELIVERY_AGENT_HAS_ACTIVE_DELIVERY/,
);
assert.throws(
  () => assertDeliveryAgentAvailabilityChange(1, "SUSPENDED"),
  /DELIVERY_AGENT_HAS_ACTIVE_DELIVERY/,
);
assert.throws(
  () => assertDeliveryAgentAvailabilityChange(-1, "BUSY"),
  /DELIVERY_AGENT_ACTIVE_DELIVERY_COUNT_INVALID/,
);

console.log("Delivery agent availability policy tests passed.");
