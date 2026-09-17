import type { DomainEventEnvelope, EntityRef, LifecycleRecord, Money } from "@/core/domain/contracts";

export type OrderLifecycleStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "FULFILLING"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUNDED";

export interface OrderLine {
  id: string;
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice: Money;
  total: Money;
}

export interface OrderAggregate extends LifecycleRecord {
  buyer: EntityRef;
  seller?: EntityRef;
  lines: OrderLine[];
  subtotal: Money;
  fees: Money[];
  total: Money;
  status: OrderLifecycleStatus;
  idempotencyKey?: string;
}

export interface OrderCommand {
  orderId: string;
  reason?: string;
  metadata: Record<string, unknown>;
}

export type OrderEvent = DomainEventEnvelope<
  | "order.created"
  | "order.confirmed"
  | "order.processing"
  | "order.fulfillment.requested"
  | "order.completed"
  | "order.cancelled"
  | "order.refunded",
  OrderAggregate | OrderCommand
>;
