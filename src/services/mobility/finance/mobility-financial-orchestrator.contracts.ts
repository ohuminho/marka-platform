import type {
  MobilityPaymentMethod,
} from "@/services/mobility/payments/mobility-payment-engine.types";

import type {
  MobilityPaymentResult,
} from "@/services/mobility/payments/mobility-payment-engine.contracts";

import type {
  MobilitySettlementEngineResult,
} from "@/services/mobility/settlement/mobility-settlement-engine.contracts";

export interface InitializeMobilityFinancialsInput {
  organizationId: string;
  rideId: string;
  riderId: string;
  driverId?: string;

  paymentMethod: MobilityPaymentMethod;

  currency: string;

  estimatedFareMinor: bigint;
  finalFareMinor?: bigint;

  commissionRateBps: number;

  commissionPolicyKey: string;
  commissionPolicyVersion: number;

  pricingSnapshot?: Record<string, unknown>;
  metadata?: Record<string, unknown>;

  idempotencyKey: string;

  actorUserId?: string;
  correlationId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface FinalizeMobilityFinancialsInput {
  organizationId: string;
  rideId: string;

  finalFareMinor: bigint;

  availableDigitalProceedsMinor?: bigint;

  sourceReference?: string;

  actorUserId?: string;
  correlationId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;

  paymentIdempotencyKey: string;
  settlementIdempotencyKey: string;
  settlementCompletionIdempotencyKey: string;

  metadata?: Record<string, unknown>;
}

export interface MobilityFinancialOrchestrationResult {
  payment: MobilityPaymentResult;

  settlement:
    | MobilitySettlementEngineResult
    | null;

  financialState:
    | "PAYMENT_INITIALIZED"
    | "PAYMENT_COLLECTED"
    | "SETTLEMENT_PENDING"
    | "SETTLEMENT_COMPLETED";

  paymentMethod: MobilityPaymentMethod;

  grossFareMinor: string;
  commissionAmountMinor: string;
  driverNetAmountMinor: string;

  cashObligationCreatedMinor: string;
  cashObligationSettledMinor: string;
}
