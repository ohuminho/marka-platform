import type {
  MobilitySettlementResult,
} from "@/services/mobility/settlement/mobility-settlement-engine.types";

export interface CreateMobilitySettlementInput {
  organizationId: string;
  paymentId: string;

  actorUserId?: string;
  correlationId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;

  idempotencyKey: string;

  metadata?: Record<string, unknown>;
}

export interface CompleteMobilitySettlementInput {
  organizationId: string;
  paymentId: string;

  actorUserId?: string;
  correlationId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;

  idempotencyKey: string;

  availableDigitalProceedsMinor?: bigint;

  sourceReference?: string;

  metadata?: Record<string, unknown>;
}

export interface CancelMobilitySettlementInput {
  organizationId: string;
  paymentId: string;

  reason: string;

  actorUserId?: string;
  correlationId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;

  idempotencyKey: string;
}

export interface MobilitySettlementEngineResult {
  settlement: MobilitySettlementResult;

  paymentStatus:
    | "PENDING"
    | "AUTHORIZED"
    | "COLLECTED"
    | "SETTLED"
    | "FAILED"
    | "CANCELLED"
    | "REFUNDED"
    | "DISPUTED";

  cashObligationCreatedMinor: string;
  cashObligationSettledMinor: string;

  driverNetAmountMinor: string;
}
