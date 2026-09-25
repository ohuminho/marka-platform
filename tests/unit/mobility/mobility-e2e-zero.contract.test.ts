import assert from "node:assert/strict";

import {
  assertCompletedE2E,
  assertDigitalCapture,
  createIdempotencyStore,
  executeIdempotently,
  type MobilityE2EState,
} from "./mobility-validation.fixtures";

const state: MobilityE2EState = {
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

  grossFareMinor:
    BigInt(10000),

  commissionMinor:
    BigInt(1200),

  priorCashObligationsSettledMinor:
    BigInt(0),

  driverNetMinor:
    BigInt(8800),

  captureTransactionId:
    "financial-capture-e2e-0",

  commissionTransactionId:
    "commission-e2e-0",

  cashObligationSettlementTransactionId:
    null,

  driverPayableTransactionId:
    "driver-payable-e2e-0",
};

assertDigitalCapture(state);

assertCompletedE2E(state);

assert.equal(
  state.commissionMinor,
  BigInt(1200),
);

assert.equal(
  state.driverNetMinor,
  BigInt(8800),
);

assert.equal(
  state.priorCashObligationsSettledMinor,
  BigInt(0),
);

const idempotencyStore =
  createIdempotencyStore();

const first =
  executeIdempotently(
    idempotencyStore,
    "mobility:e2e-0:financial-finalization",
    "financial-finalized-e2e-0",
  );

const replay =
  executeIdempotently(
    idempotencyStore,
    "mobility:e2e-0:financial-finalization",
    "financial-finalized-e2e-0",
  );

assert.equal(
  first,
  replay,
);

assert.equal(
  idempotencyStore.size,
  1,
);

assert.deepEqual(
  state,
  {
    ...state,
  },
);

console.log(
  "Mobility E2E-0 contract tests passed.",
);
