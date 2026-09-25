import assert from "node:assert/strict";

import {
  assertCashObligation,
  assertDigitalCapture,
  assertFinancialAllocation,
  createIdempotencyStore,
  executeIdempotently,
} from "./mobility-validation.fixtures";

type Scenario = {
  name: string;
  paymentMethod:
    | "CASH"
    | "DIGITAL";
  grossFareMinor: bigint;
  commissionMinor: bigint;
  priorCashObligationsSettledMinor: bigint;
  driverNetMinor: bigint;
};

const scenarios: Scenario[] = [
  {
    name:
      "DIGITAL without previous CASH obligation",

    paymentMethod:
      "DIGITAL",

    grossFareMinor:
      BigInt(10000),

    commissionMinor:
      BigInt(1200),

    priorCashObligationsSettledMinor:
      BigInt(0),

    driverNetMinor:
      BigInt(8800),
  },

  {
    name:
      "CASH creates commission obligation",

    paymentMethod:
      "CASH",

    grossFareMinor:
      BigInt(10000),

    commissionMinor:
      BigInt(1200),

    priorCashObligationsSettledMinor:
      BigInt(0),

    driverNetMinor:
      BigInt(8800),
  },

  {
    name:
      "DIGITAL settles previous CASH obligation",

    paymentMethod:
      "DIGITAL",

    grossFareMinor:
      BigInt(10000),

    commissionMinor:
      BigInt(1200),

    priorCashObligationsSettledMinor:
      BigInt(1200),

    driverNetMinor:
      BigInt(7600),
  },
];

for (const scenario of scenarios) {
  if (
    scenario.paymentMethod ===
    "CASH"
  ) {
    assertCashObligation(
      scenario,
    );
  } else {
    assertDigitalCapture(
      scenario,
    );
  }

  assertFinancialAllocation(
    scenario,
  );
}

/*
 * CASH:
 *
 * 10,000
 *   ├── 1,200 commission obligation
 *   └── 8,800 driver net
 */
assert.equal(
  scenarios[1]
    .commissionMinor,
  BigInt(1200),
);

assert.equal(
  scenarios[1]
    .driverNetMinor,
  BigInt(8800),
);

/*
 * Next DIGITAL ride:
 *
 * 10,000
 *   ├── 1,200 current commission
 *   ├── 1,200 previous CASH obligation
 *   └── 7,600 driver net
 */
assert.equal(
  scenarios[2]
    .priorCashObligationsSettledMinor,
  BigInt(1200),
);

assert.equal(
  scenarios[2]
    .driverNetMinor,
  BigInt(7600),
);

/*
 * Idempotent replay.
 */
const store =
  createIdempotencyStore();

const first =
  executeIdempotently(
    store,
    "mobility:ride-1:settlement",
    "settlement-1",
  );

const replay =
  executeIdempotently(
    store,
    "mobility:ride-1:settlement",
    "settlement-1",
  );

assert.equal(
  first,
  replay,
);

assert.equal(
  store.size,
  1,
);

console.log(
  "Mobility E2E scenario tests passed.",
);
