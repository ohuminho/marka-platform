import type {
  DomainEventEnvelope,
  EntityRef,
  LifecycleRecord,
  Money,
  PolicyPort,
} from "@/core/domain/contracts";

export type CommerceStatus =
  | "DRAFT"
  | "ACTIVE"
  | "SUSPENDED"
  | "CLOSED";

export interface CommercialEntity extends LifecycleRecord {
  type: string;
  owner: EntityRef;
  displayName: string;
  countryCode: string;
  metadata: Record<string, unknown>;
}

export interface CommerceOperation extends LifecycleRecord {
  entityId: string;
  buyer?: EntityRef;
  seller?: EntityRef;
  total?: Money;
  metadata: Record<string, unknown>;
}

export interface CommercePolicyDecision {
  allowed: boolean;
  reasons: string[];
  metadata: Record<string, unknown>;
}

export type CommercePolicyPort = PolicyPort<CommerceOperation, CommercePolicyDecision>;

export type CommerceEvent = DomainEventEnvelope<
  | "commerce.entity.created"
  | "commerce.entity.updated"
  | "commerce.operation.created"
  | "commerce.operation.completed"
  | "commerce.operation.cancelled",
  CommerceOperation | CommercialEntity
>;
