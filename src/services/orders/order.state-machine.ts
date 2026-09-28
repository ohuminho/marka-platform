import { OrderStatus } from "./types/order.types";

const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [OrderStatus.REFUNDED],
  [OrderStatus.CANCELLED]: [OrderStatus.REFUNDED],
  [OrderStatus.REFUNDED]: [],
};

export class OrderTransitionError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "OrderTransitionError";
  }
}

export function canTransitionOrderStatus(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function transitionOrderStatus(
  from: OrderStatus,
  to: OrderStatus,
): OrderStatus {
  if (from === to) {
    throw new OrderTransitionError(
      "ORDER_STATUS_UNCHANGED",
      "Order is already " + to + ".",
    );
  }

  if (!canTransitionOrderStatus(from, to)) {
    throw new OrderTransitionError(
      "INVALID_ORDER_STATUS_TRANSITION",
      "Order cannot transition from " + from + " to " + to + ".",
    );
  }

  return to;
}
