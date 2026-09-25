import type {
  DomainEventEnvelope,
  EntityRef,
  GeoPoint,
  LifecycleRecord,
} from "@/core/domain/contracts";

export type DispatchServiceType =
  | "DELIVERY"
  | "MOBILITY"
  | "FREIGHT";

export type DispatchStatus =
  | "CREATED"
  | "SEARCHING"
  | "OFFERED"
  | "ASSIGNED"
  | "ACCEPTED"
  | "REASSIGNING"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED";

export interface DispatchRequest
  extends LifecycleRecord {
  serviceType: DispatchServiceType;
  subject: EntityRef;
  origin: GeoPoint;
  destination?: GeoPoint;
  status: DispatchStatus;
  candidatePolicyRef?: string;
}

export interface DispatchCandidate {
  agentId: string;
  score?: number;
  distanceMeters?: number;
  available: boolean;
  metadata: Record<string, unknown>;
}

export interface DispatchPort {
  discoverCandidates(
    request: DispatchRequest,
  ): Promise<DispatchCandidate[]>;

  assign(
    requestId: string,
    agentId: string,
  ): Promise<DispatchRequest>;

  accept(
    requestId: string,
    agentId: string,
  ): Promise<DispatchRequest>;

  reassign(
    requestId: string,
    reason: string,
  ): Promise<DispatchRequest>;
}

export type DispatchEvent =
  DomainEventEnvelope<
    | "dispatch.created"
    | "dispatch.candidates.discovered"
    | "dispatch.assigned"
    | "dispatch.accepted"
    | "dispatch.reassigned"
    | "dispatch.completed"
    | "dispatch.cancelled",
    DispatchRequest |
      DispatchCandidate
  >;
