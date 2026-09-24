import assert from "node:assert/strict";

type AllocationInput = {
  grossFareMinor: bigint;
  commissionMinor: bigint;
  priorCashObligationsSettledMinor: bigint;
  driverNetMinor: bigint;
};

function calculateAllocation(
  input: AllocationInput,
): bigint {
  return (
    input.commissionMinor +
    input.priorCashObligationsSettledMinor +
    input.driverNetMinor
  );
}

function assertAllocation(
  input: AllocationInput,
): void {
  const allocated =
    calculateAllocation(
      input,
    );

  assert.equal(
    allocated,
    input.grossFareMinor,
    "Mobility financial allocation must reconcile to gross fare.",
  );
}

function assertThrows(
  callback: () => void,
  message: string,
): void {
  assert.throws(
    callback,
    new RegExp(
      message.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      ),
    ),
  );
}

/*
 * CASH
 *
 * Ride:
 * 10,000 AOA
 * Commission:
 * 1,200 AOA
 *
 * The 1,200 AOA becomes an open financial obligation.
 */
assert.equal(
  1200n,
  10000n * 1200n / 10000n,
);

assertAllocation({
  grossFareMinor:
    10000n,

  commissionMinor:
    1200n,

  priorCashObligationsSettledMinor:
    0n,

  driverNetMinor:
    8800n,
});

/*
 * DIGITAL after a previous CASH obligation.
 *
 * Current ride:
 * 10,000 AOA
 * Current commission:
 * 1,200 AOA
 * Previous cash obligation settled:
 * 1,200 AOA
 * Driver receives:
 * 7,600 AOA
 */
assertAllocation({
  grossFareMinor:
    10000n,

  commissionMinor:
    1200n,

  priorCashObligationsSettledMinor:
    1200n,

  driverNetMinor:
    7600n,
});

/*
 * Zero driver payout is still valid.
 */
assertAllocation({
  grossFareMinor:
    1200n,

  commissionMinor:
    1200n,

  priorCashObligationsSettledMinor:
    0n,

  driverNetMinor:
    0n,
});

/*
 * Detect under-allocation.
 */
assertThrows(
  () => {
    assertAllocation({
      grossFareMinor:
        10000n,

      commissionMinor:
        1200n,

      priorCashObligationsSettledMinor:
        1200n,

      driverNetMinor:
        7000n,
    });
  },
  "Mobility financial allocation must reconcile",
);

/*
 * Detect over-allocation.
 */
assertThrows(
  () => {
    assertAllocation({
      grossFareMinor:
        10000n,

      commissionMinor:
        1200n,

      priorCashObligationsSettledMinor:
        1200n,

      driverNetMinor:
        8000n,
    });
  },
  "Mobility financial allocation must reconcile",
);

/*
 * Recovery must not accept a digital capture that differs
 * from the immutable final fare.
 */
function assertDigitalRecoveryAmount(
  finalFareMinor: bigint,
  availableDigitalProceedsMinor: bigint,
): void {
  if (
    finalFareMinor !==
    availableDigitalProceedsMinor
  ) {
    throw new Error(
      "Digital recovery proceeds must equal the immutable final fare.",
    );
  }
}

assertDigitalRecoveryAmount(
  10000n,
  10000n,
);

assertThrows(
  () => {
    assertDigitalRecoveryAmount(
      10000n,
      8800n,
    );
  },
  "Digital recovery proceeds must equal",
);

/*
 * A completed settlement must have a settled payment.
 */
function assertSettlementPaymentConsistency(
  settlementStatus: string,
  paymentStatus: string,
): void {
  if (
    settlementStatus ===
      "COMPLETED" &&
    paymentStatus !==
      "SETTLED"
  ) {
    throw new Error(
      "Completed Mobility settlement requires a SETTLED payment.",
    );
  }
}

assertSettlementPaymentConsistency(
  "COMPLETED",
  "SETTLED",
);

assertThrows(
  () => {
    assertSettlementPaymentConsistency(
      "COMPLETED",
      "COLLECTED",
    );
  },
  "Completed Mobility settlement requires",
);

/*
 * Partial Financial Core state must remain incomplete.
 */
function assertFinancialLinks(
  input: {
    capture: string | null;
    commission: string | null;
    cashSettlement: string | null;
    driverPayable: string | null;
    commissionMinor: bigint;
    priorCashMinor: bigint;
    driverNetMinor: bigint;
  },
): void {
  if (
    !input.capture
  ) {
    throw new Error(
      "FINANCIAL_CAPTURE_TRANSACTION",
    );
  }

  if (
    input.commissionMinor >
      0n &&
    !input.commission
  ) {
    throw new Error(
      "COMMISSION_TRANSACTION",
    );
  }

  if (
    input.priorCashMinor >
      0n &&
    !input.cashSettlement
  ) {
    throw new Error(
      "CASH_OBLIGATION_SETTLEMENT_TRANSACTION",
    );
  }

  if (
    input.driverNetMinor >
      0n &&
    !input.driverPayable
  ) {
    throw new Error(
      "DRIVER_PAYABLE_TRANSACTION",
    );
  }
}

assertFinancialLinks({
  capture:
    "capture-1",

  commission:
    "commission-1",

  cashSettlement:
    "cash-1",

  driverPayable:
    "driver-1",

  commissionMinor:
    1200n,

  priorCashMinor:
    1200n,

  driverNetMinor:
    7600n,
});

assertThrows(
  () => {
    assertFinancialLinks({
      capture:
        "capture-1",

      commission:
        null,

      cashSettlement:
        "cash-1",

      driverPayable:
        "driver-1",

      commissionMinor:
        1200n,

      priorCashMinor:
        1200n,

      driverNetMinor:
        7600n,
    });
  },
  "COMMISSION_TRANSACTION",
);

console.log(
  "Mobility financial recovery unit tests passed.",
);
