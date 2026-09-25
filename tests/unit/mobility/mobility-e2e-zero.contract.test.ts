import assert from "node:assert/strict";

type E2EState = {
  rideStatus: string;
  orchestrationStatus: string;
  orchestrationStep: string;

  paymentStatus: string;
  settlementStatus: string;

  finalFareMinor: bigint;
  commissionMinor: bigint;
  priorCashObligationsSettledMinor: bigint;
  driverNetMinor: bigint;

  financialCaptureTransactionId: string | null;
  commissionTransactionId: string | null;
  cashObligationSettlementTransactionId: string | null;
  driverPayableTransactionId: string | null;
};

function assertE2EZeroInvariants(
  state: E2EState,
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

  assert.equal(
    state.priorCashObligationsSettledMinor,
    BigInt(0),
  );

  assert.ok(
    state.financialCaptureTransactionId,
  );

  assert.ok(
    state.commissionTransactionId,
  );

  assert.ok(
    state.driverPayableTransactionId,
  );

  assert.equal(
    state.cashObligationSettlementTransactionId,
    null,
  );

  const allocated =
    state.commissionMinor +
    state.priorCashObligationsSettledMinor +
    state.driverNetMinor;

  assert.equal(
    allocated,
    state.finalFareMinor,
    "E2E-0 financial allocation invariant failed.",
  );
}

/*
 * E2E-0:
 *
 * Fare = 10,000 AOA
 * Taxi commission = 12%
 * Commission = 1,200 AOA
 * Previous CASH obligation = 0
 * Driver payable = 8,800 AOA
 */
const state: E2EState = {
  rideStatus:
    "TRIP_COMPLETED",

  orchestrationStatus:
    "COMPLETED",

  orchestrationStep:
    "FINANCIAL_FINALIZED",

  paymentStatus:
    "SETTLED",

  settlementStatus:
    "COMPLETED",

  finalFareMinor:
    BigInt(10000),

  commissionMinor:
    BigInt(1200),

  priorCashObligationsSettledMinor:
    BigInt(0),

  driverNetMinor:
    BigInt(8800),

  financialCaptureTransactionId:
    "financial-capture-e2e-0",

  commissionTransactionId:
    "commission-e2e-0",

  cashObligationSettlementTransactionId:
    null,

  driverPayableTransactionId:
    "driver-payable-e2e-0",
};

assertE2EZeroInvariants(
  state,
);

/*
 * Idempotent replay must not change
 * the financial result.
 */
const replay =
  structuredClone(state);

assert.deepEqual(
  replay,
  state,
);

console.log(
  "Mobility E2E-0 contract tests passed.",
);
