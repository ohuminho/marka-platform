import { OrderStatus } from "@/services/orders/types/order.types";
import {
  canTransitionOrderStatus,
  transitionOrderStatus,
} from "@/services/orders/order.state-machine";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error("Assertion failed: " + message);
  }
}

function assertThrows(callback: () => unknown, expectedCode: string): void {
  try {
    callback();
  } catch (error) {
    const domainError = error as { code?: string };
    assert(
      domainError.code === expectedCode,
      "Expected " + expectedCode + ", received " + (domainError.code ?? "unknown"),
    );
    return;
  }

  throw new Error("Expected error " + expectedCode);
}

assert(canTransitionOrderStatus(OrderStatus.PENDING, OrderStatus.CONFIRMED), "PENDING -> CONFIRMED");
assert(canTransitionOrderStatus(OrderStatus.CONFIRMED, OrderStatus.PROCESSING), "CONFIRMED -> PROCESSING");
assert(canTransitionOrderStatus(OrderStatus.PROCESSING, OrderStatus.SHIPPED), "PROCESSING -> SHIPPED");
assert(canTransitionOrderStatus(OrderStatus.SHIPPED, OrderStatus.DELIVERED), "SHIPPED -> DELIVERED");
assert(canTransitionOrderStatus(OrderStatus.DELIVERED, OrderStatus.REFUNDED), "DELIVERED -> REFUNDED");
assert(canTransitionOrderStatus(OrderStatus.PENDING, OrderStatus.CANCELLED), "PENDING -> CANCELLED");
assert(!canTransitionOrderStatus(OrderStatus.PENDING, OrderStatus.DELIVERED), "PENDING must not jump to DELIVERED");
assert(!canTransitionOrderStatus(OrderStatus.PROCESSING, OrderStatus.DELIVERED), "PROCESSING must not jump to DELIVERED");

assert(
  transitionOrderStatus(OrderStatus.PENDING, OrderStatus.CONFIRMED) === OrderStatus.CONFIRMED,
  "Valid transition returns target",
);
assertThrows(
  () => transitionOrderStatus(OrderStatus.PENDING, OrderStatus.DELIVERED),
  "INVALID_ORDER_STATUS_TRANSITION",
);
assertThrows(
  () => transitionOrderStatus(OrderStatus.CONFIRMED, OrderStatus.CONFIRMED),
  "ORDER_STATUS_UNCHANGED",
);

console.log("Order state machine tests passed.");
