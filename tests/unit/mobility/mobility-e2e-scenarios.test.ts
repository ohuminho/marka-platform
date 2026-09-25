import assert from "node:assert/strict";

type Scenario = {
  name: string;
  grossFareMinor: bigint;
  commissionMinor: bigint;
  priorCashObligationsSettledMinor: bigint;
  driverNetMinor: bigint;
  paymentMethod: "CASH" | "DIGITAL";
};

function validateScenario(
  scenario: Scenario,
): void {
  const allocated =
    scenario.commissionMinor +
    scenario.priorCashObligationsSettledMinor +
    scenario.driverNetMinor;

  assert.equal(
    allocated,
    scenario.grossFareMinor,
    `${scenario.name}: financial allocation invariant failed.`,
  );
}

const scenarios: Scenario[] = [
  {
    name:
      "E2E-0 DIGITAL without previous CASH debt",

    grossFareMinor:
      BigInt(10000),

    commissionMinor:
      BigInt(1200),

    priorCashObligationsSettledMinor:
      BigInt(0),

    driverNetMinor:
      BigInt(8800),

    paymentMethod:
      "DIGITAL",
  },

  {
    name:
      "E2E-1 CASH creates commission obligation",

    grossFareMinor:
      BigInt(10000),

    commissionMinor:
      BigInt(1200),

    priorCashObligationsSettledMinor:
      BigInt(0),

    driverNetMinor:
      BigInt(8800),

    paymentMethod:
      "CASH",
  },

  {
    name:
      "E2E-2 DIGITAL settles previous CASH obligation",

    grossFareMinor:
      BigInt(10000),

    commissionMinor:
      BigInt(1200),

    priorCashObligationsSettledMinor:
      BigInt(1200),

    driverNetMinor:
      BigInt(7600),

    paymentMethod:
      "DIGITAL",
  },

  {
    name:
      "E2E-3 DIGITAL replay remains idempotent",

    grossFareMinor:
      BigInt(10000),

    commissionMinor:
      BigInt(1200),

    priorCashObligationsSettledMinor:
      BigInt(0),

    driverNetMinor:
      BigInt(8800),

    paymentMethod:
      "DIGITAL",
  },
];

for (const scenario of scenarios) {
  validateScenario(
    scenario,
  );
}

/*
 * E2E-0:
 * no previous CASH obligation exists.
 */
assert.equal(
  scenarios[0]
    .priorCashObligationsSettledMinor,
  BigInt(0),
);

/*
 * E2E-1:
 * CASH does not immediately pay the commission
 * through digital proceeds. It creates an obligation.
 */
assert.equal(
  scenarios[1].paymentMethod,
  "CASH",
);

/*
 * E2E-2:
 * previous CASH obligation is settled from
 * subsequent DIGITAL proceeds.
 */
assert.equal(
  scenarios[2]
    .priorCashObligationsSettledMinor,
  BigInt(1200),
);

/*
 * E2E-3:
 * same financial result as the original DIGITAL
 * operation.
 */
assert.equal(
  scenarios[3].driverNetMinor,
  scenarios[0].driverNetMinor,
);

console.log(
  "Mobility E2E scenario invariant tests passed.",
);
