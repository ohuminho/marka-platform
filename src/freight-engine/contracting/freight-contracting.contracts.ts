import type { LifecycleRecord, Money, EntityRef } from "@/core/domain/contracts";

export interface FreightOffer extends LifecycleRecord {
  shipmentId: string;
  carrier: EntityRef;
  amount: Money;
  validUntil: Date;
  terms: Record<string, unknown>;
}

export interface FreightRequestForQuotation extends LifecycleRecord {
  requester: EntityRef;
  shipmentId: string;
  responseDeadline: Date;
  requestedTerms: Record<string, unknown>;
}

export interface FreightContract extends LifecycleRecord {
  shipmentId: string;
  carrier: EntityRef;
  acceptedOfferId: string;
  terms: Record<string, unknown>;
  status: "DRAFT" | "ACTIVE" | "SUSPENDED" | "COMPLETED" | "TERMINATED";
}
