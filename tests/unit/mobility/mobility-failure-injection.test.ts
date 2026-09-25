import assert from "node:assert/strict";

import {
  assertFinancialAllocation,
  assertRecoveryAllowed,
  assertRequiredFinancialLinks,
  assertRideNeverRollsBack,
  recoveryDisposition,
} from "./mobility-validation.fixtures";

type FailurePoint =
  | "SAFETY"
  | "SEARCH"
  | "DISPATCH"
  | "ACCEPT"
  | "ARRIVAL"
  | "START_TRIP"
  | "COMPLETE_RIDE"
  | "PAYMENT"
  | "SETTLEMENT"
  | "FINANCIAL_CAPTURE"
  | "COMMISSION"
  | "CASH_OBLIGATION_SETTLEMENT"
  | "DRIVER_PAYABLE"
  | "RECONCILIATION";

function expectedRecoveryFor(
  point: FailurePoint,
):
  | "NONE"
  | "ORCHESTRATION"
  | "FINANCIAL_RECOVERY"
  | "BLOCK" {
  switch (point) {
    case "SAFETY":
    case "SEARCH":
    case "DISPATCH":
    case "ACCEPT":
    case "ARRIVAL":
    case "START_TRIP":
    case "COMPLETE_RIDE":
      return "ORCHESTRATION";

    case "PAYMENT":
    case "SETTLEMENT":
    case "FINANCIAL_CAPTURE":
    case "COMMISSION":
    case "CASH_OBLIGATION_SETTLEMENT":
    case "DRIVER_PAYABLE":
      return "FINANCIAL_RECOVERY";

    case "RECONCILIATION":
      return "BLOCK";
  }
}

assert.equal(
  expectedRecoveryFor("SAFETY"),
  "ORCHESTRATION",
);

assert.equal(
  expectedRecoveryFor("DISPATCH"),
  "ORCHESTRATION",
);

assert.equal(
  expectedRecoveryFor("PAYMENT"),
  "FINANCIAL_RECOVERY",
);

assert.equal(
  expectedRecoveryFor("FINANCIAL_CAPTURE"),
  "FINANCIAL_RECOVERY",
);

assert.equal(
  expectedRecoveryFor("DRIVER_PAYABLE"),
  "FINANCIAL_RECOVERY",
);

assert.equal(
  expectedRecoveryFor("RECONCILIATION"),
  "BLOCK",
);

/*
 * Completed ride must never roll backwards.
 */
assertRideNeverRollsBack(
  "TRIP_COMPLETED",
);

assert.throws(
  () => {
    assertRideNeverRollsBack(
      "TRIP_IN_PROGRESS",
    );
  },
  /Financial failure/,
);

/*
 * Complete DIGITAL allocation.
 */
assertFinancialAllocation({
  grossFareMinor:
    BigInt(10000),

  commissionMinor:
    BigInt(1200),

  priorCashObligationsSettledMinor:
    BigInt(0),

  driverNetMinor:
    BigInt(8800),
});

/*
 * DIGITAL after CASH debt.
 */
assertFinancialAllocation({
  grossFareMinor:
    BigInt(10000),

  commissionMinor:
    BigInt(1200),

  priorCashObligationsSettledMinor:
    BigInt(1200),

  driverNetMinor:
    BigInt(7600),
);

/*
 * Partial Financial Core state:
 * missing commission link must not be considered complete.
 */
assert.throws(
  () => {
    assertRequiredFinancialLinks({
      grossFareMinor:
        BigInt(10000),

      commissionMinor:
        BigInt(1200),

      priorCashObligationsSettledMinor:
        BigInt(0),

      driverNetMinor:
        BigInt(8800),

      captureTransactionId:
        "capture-1",

      commissionTransactionId:
        null,

      cashObligationSettlementTransactionId:
        null,

      driverPayableTransactionId:
        "driver-1",
    });
  },
  /Commission transaction is required/,
);

/*
 * Previous CASH debt requires its own
 * Financial Core settlement transaction.
 */
assert.throws(
  () => {
    assertRequiredFinancialLinks({
      grossFareMinor:
        BigInt(10000),

      commissionMinor:
        BigInt(1200),

      priorCashObligationsSettledMinor:
        BigInt(1200),

      driverNetMinor:
        BigInt(7600),

      captureTransactionId:
        "capture-1",

      commissionTransactionId:
        "commission-1",

      cashObligationSettlementTransactionId:
        null,

      driverPayableTransactionId:
        "driver-1",
    });
  },
  /Cash-obligation settlement transaction is required/,
);

/*
 * Reconciliation states.
 */
assert.equal(
  recoveryDisposition(
    "RECONCILED",
  ),
  "NOOP",
);

assert.equal(
  recoveryDisposition(
    "INCOMPLETE",
  ),
  "RECOVER",
);

assert.equal(
  recoveryDisposition(
    "MISMATCH",
  ),
  "BLOCK",
);

assertRecoveryAllowed(
  "RECONCILED",
);

assertRecoveryAllowed(
  "INCOMPLETE",
);

assert.throws(
  () => {
    assertRecoveryAllowed(
      "MISMATCH",
    );
  },
  /accounting mismatch/,
);

/*
 * Allocation mismatch must be rejected.
 */
assert.throws(
  () => {
    assertFinancialAllocation({
      grossFareMinor:
        BigInt(10000),

      commissionMinor:
        BigInt(1200),

      priorCashObligationsSettledMinor:
        BigInt(1200),

      driverNetMinor:
        BigInt(7000),
    });
  },
  /reconcile to gross fare/,
);

console.log(
  "Mobility failure injection tests passed.",
);
