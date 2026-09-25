import assert from "node:assert/strict";

export type MobilityPaymentMethod =
  | "CASH"
  | "DIGITAL";

export type MobilityReconciliationStatus =
  | "RECONCILED"
  | "INCOMPLETE"
  | "MISMATCH";

export type MobilityRecoveryDisposition =
  | "NOOP"
  | "RECOVER"
  | "BLOCK";

export interface MobilityFinancialAllocation {
  grossFareMinor: bigint;
  commissionMinor: bigint;
  priorCashObligationsSettledMinor: bigint;
  driverNetMinor: bigint;
}

export interface MobilityFinancialLinks {
  captureTransactionId: string | null;
  commissionTransactionId: string | null;
  cashObligationSettlementTransactionId: string | null;
  driverPayableTransactionId: string | null;
}

export interface MobilityE2EState
  extends MobilityFinancialAllocation,
    MobilityFinancialLinks {
  rideStatus: string;
  orchestrationStatus: string;
  orchestrationStep: string;
  paymentStatus: string;
  settlementStatus: string;
}

export function calculateAllocatedMinor(
  input: MobilityFinancialAllocation,
): bigint {
  return (
    input.commissionMinor +
    input.priorCashObligationsSettledMinor +
    input.driverNetMinor
  );
}

export function assertFinancialAllocation(
  input: MobilityFinancialAllocation,
): void {
  assert.equal(
    calculateAllocatedMinor(input),
    input.grossFareMinor,
    "Mobility financial allocation must reconcile to gross fare.",
  );

  assert.ok(
    input.grossFareMinor >= BigInt(0),
    "Gross fare cannot be negative.",
  );

  assert.ok(
    input.commissionMinor >= BigInt(0),
    "Commission cannot be negative.",
  );

  assert.ok(
    input.priorCashObligationsSettledMinor >=
      BigInt(0),
    "Previous cash obligations cannot be negative.",
  );

  assert.ok(
    input.driverNetMinor >= BigInt(0),
    "Driver net cannot be negative.",
  );
}

export function assertDigitalCapture(
  input: MobilityFinancialAllocation,
): void {
  assertFinancialAllocation(input);

  assert.ok(
    input.grossFareMinor >=
      input.commissionMinor,
    "Commission cannot exceed gross fare.",
  );

  assert.ok(
    input.grossFareMinor >=
      input.priorCashObligationsSettledMinor,
    "Previous cash obligations cannot exceed gross fare.",
  );
}

export function assertCashObligation(
  input: MobilityFinancialAllocation,
): void {
  assert.equal(
    input.priorCashObligationsSettledMinor,
    BigInt(0),
    "A CASH ride must not report a previous digital settlement obligation.",
  );

  assert.ok(
    input.commissionMinor > BigInt(0),
    "A commission-bearing CASH ride must create a financial obligation.",
  );

  assertFinancialAllocation(input);
}

export function assertRequiredFinancialLinks(
  input: MobilityFinancialLinks &
    MobilityFinancialAllocation,
): void {
  assert.ok(
    input.captureTransactionId,
    "Financial capture transaction is required.",
  );

  if (
    input.commissionMinor >
    BigInt(0)
  ) {
    assert.ok(
      input.commissionTransactionId,
      "Commission transaction is required.",
    );
  }

  if (
    input.priorCashObligationsSettledMinor >
    BigInt(0)
  ) {
    assert.ok(
      input.cashObligationSettlementTransactionId,
      "Cash-obligation settlement transaction is required.",
    );
  }

  if (
    input.driverNetMinor >
    BigInt(0)
  ) {
    assert.ok(
      input.driverPayableTransactionId,
      "Driver payable transaction is required.",
    );
  }
}

export function recoveryDisposition(
  status: MobilityReconciliationStatus,
): MobilityRecoveryDisposition {
  switch (status) {
    case "RECONCILED":
      return "NOOP";

    case "INCOMPLETE":
      return "RECOVER";

    case "MISMATCH":
      return "BLOCK";
  }
}

export function assertRecoveryAllowed(
  status: MobilityReconciliationStatus,
): void {
  assert.notEqual(
    recoveryDisposition(status),
    "BLOCK",
    "Mobility financial recovery is blocked because reconciliation detected an accounting mismatch.",
  );
}

export function assertCompletedE2E(
  state: MobilityE2EState,
): void {
  assert.equal(
    state.rideStatus,
    "TRIP_COMPLETED",
  );

  assert.equal(
    state.orchestrationStatus,
    "COMPLETED",
  );

  assert.equal(
    state.orchestrationStep,
    "FINANCIAL_FINALIZED",
  );

  assert.equal(
    state.paymentStatus,
    "SETTLED",
  );

  assert.equal(
    state.settlementStatus,
    "COMPLETED",
  );

  assertFinancialAllocation(state);

  assertRequiredFinancialLinks(state);

  assert.equal(
    state.cashObligationSettlementTransactionId,
    state.priorCashObligationsSettledMinor >
      BigInt(0)
      ? state.cashObligationSettlementTransactionId
      : null,
  );
}

export function createIdempotencyStore(): Map<
  string,
  string
> {
  return new Map<string, string>();
}

export function executeIdempotently(
  store: Map<string, string>,
  idempotencyKey: string,
  result: string,
): string {
  const existing =
    store.get(idempotencyKey);

  if (existing) {
    return existing;
  }

  store.set(
    idempotencyKey,
    result,
  );

  return result;
}

export function assertRideNeverRollsBack(
  rideStatus: string,
): void {
  assert.equal(
    rideStatus,
    "TRIP_COMPLETED",
    "Financial failure must never roll a completed Mobility ride backwards.",
  );
}
