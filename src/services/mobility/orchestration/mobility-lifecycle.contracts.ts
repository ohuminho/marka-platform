import type {
  MobilityLifecycleAction,
  MobilitySafetyMode,
} from "./mobility-lifecycle.types";

export interface MobilityLifecycleContext {
  organizationId: string;
  rideId: string;

  actorUserId?: string;

  correlationId?: string;
  requestId?: string;

  idempotencyKey: string;

  ipAddress?: string;
  userAgent?: string;

  safetyMode?: MobilitySafetyMode;

  metadata?: Record<string, unknown>;
}

export interface InitializeMobilityLifecycleInput {
  organizationId: string;
  rideId: string;

  actorUserId?: string;

  correlationId?: string;
  requestId?: string;

  idempotencyKey: string;

  ipAddress?: string;
  userAgent?: string;

  safetyMode?: MobilitySafetyMode;

  metadata?: Record<string, unknown>;
}

export interface MobilityLifecycleActionInput
  extends MobilityLifecycleContext {
  action: MobilityLifecycleAction;

  reason?: string;
}

export interface MobilityLifecycleInitializeFinancialsInput
  extends MobilityLifecycleContext {
  action: "INITIALIZE_FINANCIALS";

  estimatedFareMinor: bigint;

  finalFareMinor?: bigint;

  paymentMethod:
    | "CASH"
    | "DIGITAL";

  pricingSnapshot?: Record<string, unknown>;
}

export interface MobilityLifecycleCompleteInput
  extends MobilityLifecycleContext {
  action: "COMPLETE";

  estimatedFareMinor: bigint;

  finalFareMinor: bigint;

  paymentMethod:
    | "CASH"
    | "DIGITAL";

  availableDigitalProceedsMinor?: bigint;

  sourceReference?: string;

  paymentIdempotencyKey: string;

  settlementIdempotencyKey: string;

  settlementCompletionIdempotencyKey: string;

  pricingSnapshot?: Record<string, unknown>;
}

export type MobilityLifecycleExecuteInput =
  | MobilityLifecycleActionInput
  | MobilityLifecycleInitializeFinancialsInput
  | MobilityLifecycleCompleteInput;

export interface MobilityLifecycleResult {
  orchestrationId: string;

  rideId: string;

  status: string;

  currentStep: string;

  version: number;

  attemptCount: number;

  action: MobilityLifecycleAction;

  recoveryRequired: boolean;

  financialState?:
    | "PAYMENT_INITIALIZED"
    | "PAYMENT_COLLECTED"
    | "SETTLEMENT_PENDING"
    | "SETTLEMENT_COMPLETED";

  ride?: unknown;

  assignment?: unknown;

  financials?: unknown;

  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}
