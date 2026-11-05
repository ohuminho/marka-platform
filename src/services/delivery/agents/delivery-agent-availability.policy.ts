export type DeliveryAgentAvailability = "OFFLINE" | "AVAILABLE" | "BUSY" | "SUSPENDED";

export function assertDeliveryAgentAvailabilityChange(
  activeDeliveries: number,
  requestedAvailability: DeliveryAgentAvailability,
): void {
  if (!Number.isInteger(activeDeliveries) || activeDeliveries < 0) {
    throw new Error("DELIVERY_AGENT_ACTIVE_DELIVERY_COUNT_INVALID");
  }
  if (activeDeliveries > 0 && requestedAvailability !== "BUSY") {
    throw new Error("DELIVERY_AGENT_HAS_ACTIVE_DELIVERY");
  }
}
