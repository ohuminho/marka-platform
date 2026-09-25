import assert from "node:assert/strict";

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

type ExpectedRecovery =
  | "NONE"
  | "ORCHESTRATION"
  | "FINANCIAL_RECOVERY"
  | "BLOCK";

function expectedRecoveryFor(
  point: FailurePoint,
): ExpectedRecovery {
  switch (point) {
    case "SAFETY":
    case "SEARCH":
    case "DISPATCH":
    case "ACCEPT":
    case "ARRIVAL":
    case "START_TRIP":
      return "ORCHESTRATION";

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
  expectedRecoveryFor(
    "SAFETY",
  ),
  "ORCHESTRATION",
);

assert.equal(
  expectedRecoveryFor(
    "PAYMENT",
  ),
  "FINANCIAL_RECOVERY",
);

assert.equal(
  expectedRecoveryFor(
    "DRIVER_PAYABLE",
  ),
  "FINANCIAL_RECOVERY",
);

assert.equal(
  expectedRecoveryFor(
    "RECONCILIATION",
  ),
  "BLOCK",
);

/*
 * Ride completion is irreversible from the
 * financial perspective.
 */
function rideStateAfterFinancialFailure(
  rideCompleted: boolean,
): "TRIP_COMPLETED" | "NOT_COMPLETED" {
  return rideCompleted
    ? "TRIP_COMPLETED"
    : "NOT_COMPLETED";
}

assert.equal(
  rideStateAfterFinancialFailure(
    true,
  ),
  "TRIP_COMPLETED",
);

/*
 * A financial failure after ride completion
 * cannot roll the ride back.
 */
function assertRideNeverRollsBack(
  rideStatus: string,
): void {
  assert.equal(
    rideStatus,
    "TRIP_COMPLETED",
  );
}

assertRideNeverRollsBack(
  rideStateAfterFinancialFailure(
    true,
  ),
);

/*
 * Financial Core completion requires all
 * mandatory links that actually carry value.
 */
function validateFinancialLinks(input: {
  capture: boolean;
  commission: boolean;
  cashObligationSettlement: boolean;
  driverPayable: boolean;
  commissionMinor: bigint;
  priorCashMinor: bigint;
  driverNetMinor: bigint;
}): void {
  if (!input.capture) {
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
    !input.cashObligationSettlement
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

validateFinancialLinks({
  capture: true,
  commission: true,
  cashObligationSettlement: false,
  driverPayable: true,
  commissionMinor: BigInt(1200),
  priorCashMinor: BigInt(0),
  driverNetMinor: BigInt(8800),
});

assert.throws(
  () => {
    validateFinancialLinks({
      capture: true,
      commission: false,
      cashObligationSettlement: false,
      driverPayable: true,
      commissionMinor: BigInt(1200),
      priorCashMinor: BigInt(0),
      driverNetMinor: BigInt(8800),
    });
  },
  /COMMISSION_TRANSACTION/,
);

/*
 * Reconciliation mismatch must block
 * automatic financial mutation.
 */
function allowRecovery(
  reconciliation:
    | "RECONCILED"
    | "INCOMPLETE"
    | "MISMATCH",
): boolean {
  return (
    reconciliation !==
    "MISMATCH"
  );
}

assert.equal(
  allowRecovery(
    "RECONCILED",
  ),
  true,
);

assert.equal(
  allowRecovery(
    "INCOMPLETE",
  ),
  true,
);

assert.equal(
  allowRecovery(
    "MISMATCH",
  ),
  false,
);

/*
 * Final allocation invariant.
 */
function assertAllocation(
  grossFareMinor: bigint,
  commissionMinor: bigint,
  priorCashMinor: bigint,
  driverNetMinor: bigint,
): void {
  const allocated =
    commissionMinor +
    priorCashMinor +
    driverNetMinor;

  assert.equal(
    allocated,
    grossFareMinor,
    "Mobility financial allocation mismatch.",
  );
}

assertAllocation(
  BigInt(10000),
  BigInt(1200),
  BigInt(0),
  BigInt(8800),
);

assertAllocation(
  BigInt(10000),
  BigInt(1200),
  BigInt(1200),
  BigInt(7600),
);

assert.throws(
  () => {
    assertAllocation(
      BigInt(10000),
      BigInt(1200),
      BigInt(1200),
      BigInt(7000),
    );
  },
  /Mobility financial allocation mismatch/,
);

console.log(
  "Mobility failure injection tests passed.",
);
