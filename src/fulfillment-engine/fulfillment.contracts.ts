import type { DomainEventEnvelope, EntityRef, LifecycleRecord } from "@/core/domain/contracts";

export type FulfillmentStatus =
  | "REQUESTED"
  | "ASSIGNED"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "COMPLETED"
  | "EXCEPTION"
  | "CANCELLED";

export interface FulfillmentRequest extends LifecycleRecord {
  orderId: string;
  pickup: EntityRef;
  destination: EntityRef;
  status: FulfillmentStatus;
  assignedAgentId?: string;
  exceptionCode?: string;
}

export interface FulfillmentAssignment {
  fulfillmentId: string;
  agentId: string;
  assignedAt: Date;
  acceptedAt?: Date;
}

export interface FulfillmentPort {
  request(input: Omit<FulfillmentRequest, keyof LifecycleRecord>, correlationId?: string): Promise<FulfillmentRequest>;
  assign(fulfillmentId: string, agentId: string): Promise<FulfillmentAssignment>;
  transition(fulfillmentId: string, status: FulfillmentStatus, reason?: string): Promise<FulfillmentRequest>;
}

export type FulfillmentEvent = DomainEventEnvelope<
  | "fulfillment.requested"
  | "fulfillment.assigned"
  | "fulfillment.preparation.started"
  | "fulfillment.picked_up"
  | "fulfillment.completed"
  | "fulfillment.exceptioned"
  | "fulfillment.cancelled",
  FulfillmentRequest | FulfillmentAssignment
>;
