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
  BigInt(1200),
  (BigInt(10000) * BigInt(1200)) /
    BigInt(10000),
);

assertAllocation({
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
    BigInt(10000),

  commissionMinor:
    BigInt(1200),

  priorCashObligationsSettledMinor:
    BigInt(1200),

  driverNetMinor:
    BigInt(7600),
});

/*
 * Zero driver payout is still valid.
 */
assertAllocation({
  grossFareMinor:
    BigInt(1200),

  commissionMinor:
    BigInt(1200),

  priorCashObligationsSettledMinor:
    BigInt(0),

  driverNetMinor:
    BigInt(0),
});

/*
 * Detect under-allocation.
 */
assertThrows(
  () => {
    assertAllocation({
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
  "Mobility financial allocation must reconcile",
);

/*
 * Detect over-allocation.
 */
assertThrows(
  () => {
    assertAllocation({
      grossFareMinor:
        BigInt(10000),

      commissionMinor:
        BigInt(1200),

      priorCashObligationsSettledMinor:
        BigInt(1200),

      driverNetMinor:
        BigInt(8000),
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
  BigInt(10000),
  BigInt(10000),
);

assertThrows(
  () => {
    assertDigitalRecoveryAmount(
      BigInt(10000),
      BigInt(8800),
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
      BigInt(0) &&
    !input.commission
  ) {
    throw new Error(
      "COMMISSION_TRANSACTION",
    );
  }

  if (
    input.priorCashMinor >
      BigInt(0) &&
    !input.cashSettlement
  ) {
    throw new Error(
      "CASH_OBLIGATION_SETTLEMENT_TRANSACTION",
    );
  }

  if (
    input.driverNetMinor >
      BigInt(0) &&
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
    BigInt(1200),

  priorCashMinor:
    BigInt(1200),

  driverNetMinor:
    BigInt(7600),
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
        BigInt(1200),

      priorCashMinor:
        BigInt(1200),

      driverNetMinor:
        BigInt(7600),
    });
  },
  "COMMISSION_TRANSACTION",
);

/*
 * Recovery must distinguish between an incomplete state
 * and an accounting mismatch.
 */
function recoveryDisposition(
  status:
    | "RECONCILED"
    | "INCOMPLETE"
    | "MISMATCH",
): "NOOP" | "RECOVER" | "BLOCK" {
  if (
    status ===
    "RECONCILED"
  ) {
    return "NOOP";
  }

  if (
    status ===
    "INCOMPLETE"
  ) {
    return "RECOVER";
  }

  return "BLOCK";
}

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

/*
 * Recovery must never automatically mutate accounting
 * when reconciliation has detected a mismatch.
 */
function assertRecoveryAllowed(
  reconciliationStatus:
    | "RECONCILED"
    | "INCOMPLETE"
    | "MISMATCH",
): void {
  if (
    reconciliationStatus ===
    "MISMATCH"
  ) {
    throw new Error(
      "Mobility financial recovery is blocked because reconciliation detected an accounting mismatch.",
    );
  }
}

assertRecoveryAllowed(
  "RECONCILED",
);

assertRecoveryAllowed(
  "INCOMPLETE",
);

assertThrows(
  () => {
    assertRecoveryAllowed(
      "MISMATCH",
    );
  },
  "accounting mismatch",
);

/*
 * A completed settlement must have all required
 * financial links.
 */
function assertCompletedFinancialLinks(
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
      BigInt(0) &&
    !input.commission
  ) {
    throw new Error(
      "COMMISSION_TRANSACTION",
    );
  }

  if (
    input.priorCashMinor >
      BigInt(0) &&
    !input.cashSettlement
  ) {
    throw new Error(
      "CASH_OBLIGATION_SETTLEMENT_TRANSACTION",
    );
  }

  if (
    input.driverNetMinor >
      BigInt(0) &&
    !input.driverPayable
  ) {
    throw new Error(
      "DRIVER_PAYABLE_TRANSACTION",
    );
  }
}

assertCompletedFinancialLinks({
  capture:
    "capture-1",

  commission:
    "commission-1",

  cashSettlement:
    "cash-1",

  driverPayable:
    "driver-1",

  commissionMinor:
    BigInt(1200),

  priorCashMinor:
    BigInt(1200),

  driverNetMinor:
    BigInt(7600),
});

assertThrows(
  () => {
    assertCompletedFinancialLinks({
      capture:
        "capture-1",

      commission:
        null,

      cashSettlement:
        "cash-1",

      driverPayable:
        "driver-1",

      commissionMinor:
        BigInt(1200),

      priorCashMinor:
        BigInt(1200),

      driverNetMinor:
        BigInt(7600),
    });
  },
  "COMMISSION_TRANSACTION",
);

console.log(
  "Mobility financial recovery unit tests passed.",
);
