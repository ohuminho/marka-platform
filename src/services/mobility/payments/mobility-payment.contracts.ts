export type MobilityPaymentMethod =
  | "CASH"
  | "DIGITAL";

export type MobilityCashObligationStatus =
  | "OPEN"
  | "PARTIALLY_SETTLED"
  | "SETTLED"
  | "CANCELLED";

export interface MobilityFinancialAuditContext {
  actorUserId?: string;
  correlationId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateMobilityCashObligationInput
  extends MobilityFinancialAuditContext {
  organizationId: string;
  driverId: string;
  rideId: string;

  currency: string;

  grossFareMinor: bigint;
  commissionRateBps: number;
  commissionAmountMinor: bigint;

  policyKey: string;
  policyVersion: number;

  idempotencyKey: string;

  metadata?: Record<string, unknown>;
}

export interface MobilityCashObligationResult {
  id: string;
  organizationId: string;
  driverId: string;
  rideId: string;

  currency: string;

  grossFareMinor: string;
  commissionRateBps: number;
  commissionAmountMinor: string;

  settledAmountMinor: string;
  remainingAmountMinor: string;

  status: MobilityCashObligationStatus;

  policyKey: string;
  policyVersion: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface ApplyMobilityCashSettlementInput
  extends MobilityFinancialAuditContext {
  organizationId: string;

  availableDigitalProceedsMinor: bigint;
  currentDigitalCommissionMinor: bigint;

  currency: string;

  sourceReference: string;
  idempotencyKey: string;

  driverId: string;

  metadata?: Record<string, unknown>;
}

export interface MobilityCashSettlementResult {
  driverId: string;
  currency: string;

  availableDigitalProceedsMinor: string;
  currentDigitalCommissionMinor: string;

  priorCashObligationsSettledMinor: string;

  totalDeductedMinor: string;

  driverNetProceedsMinor: string;

  remainingCashObligationMinor: string;

  settlements: Array<{
    obligationId: string;
    rideId: string;
    amountMinor: string;
    remainingObligationMinor: string;
  }>;
}

export interface MobilityCashObligationRecord {
  id: string;
  organizationId: string;
  driverId: string;
  rideId: string;

  currency: string;

  grossFareMinor: bigint;
  commissionRateBps: number;
  commissionAmountMinor: bigint;

  settledAmountMinor: bigint;
  remainingAmountMinor: bigint;

  status: MobilityCashObligationStatus;

  idempotencyKey: string;

  policyKey: string;
  policyVersion: number;

  metadata: unknown;

  createdAt: Date;
  updatedAt: Date;
}

export interface MobilityCashObligationSettlementRecord {
  id: string;
  organizationId: string;
  obligationId: string;

  settlementReference: string;
  sourceReference: string;

  amountMinor: bigint;
  currency: string;

  metadata: unknown;

  createdAt: Date;
}
