import assert from "node:assert/strict";

type FailureClassification =
  | "BUSINESS"
  | "CONCURRENCY"
  | "VALIDATION"
  | "DEPENDENCY"
  | "TRANSIENT"
  | "UNKNOWN";

function classifyFailure(
  message: string,
): {
  classification: FailureClassification;
  retryable: boolean;
} {
  const lower =
    message.toLowerCase();

  const concurrency =
    lower.includes(
      "concurrency",
    );

  const transient =
    lower.includes(
      "timeout",
    ) ||
    lower.includes(
      "temporarily",
    ) ||
    lower.includes(
      "deadlock",
    );

  const dependency =
    lower.includes(
      "provider",
    ) ||
    lower.includes(
      "database",
    ) ||
    lower.includes(
      "connection",
    );

  if (concurrency) {
    return {
      classification:
        "CONCURRENCY",
      retryable:
        true,
    };
  }

  if (transient) {
    return {
      classification:
        "TRANSIENT",
      retryable:
        true,
    };
  }

  if (dependency) {
    return {
      classification:
        "DEPENDENCY",
      retryable:
        true,
    };
  }

  return {
    classification:
      "BUSINESS",
    retryable:
      false,
  };
}

/*
 * Concurrent orchestration update:
 * retry/recovery required.
 */
assert.deepEqual(
  classifyFailure(
    "Mobility orchestration concurrency conflict.",
  ),
  {
    classification:
      "CONCURRENCY",
    retryable:
      true,
  },
);

/*
 * Database/provider failure:
 * retry/recovery required.
 */
assert.deepEqual(
  classifyFailure(
    "Database connection temporarily unavailable.",
  ),
  {
    classification:
      "TRANSIENT",
    retryable:
      true,
  },
);

/*
 * Provider failure:
 * retry/recovery required.
 */
assert.deepEqual(
  classifyFailure(
    "External payment provider unavailable.",
  ),
  {
    classification:
      "DEPENDENCY",
    retryable:
      true,
  },
);

/*
 * Business validation:
 * must not automatically mutate financial state.
 */
assert.deepEqual(
  classifyFailure(
    "Ride cancellation reason is required.",
  ),
  {
    classification:
      "BUSINESS",
    retryable:
      false,
  },
);

/*
 * Completed rides are terminal operationally.
 *
 * Financial recovery must not revert TRIP_COMPLETED.
 */
function assertRideStateAfterFinancialFailure(
  rideStatus: string,
): void {
  if (
    rideStatus !==
    "TRIP_COMPLETED"
  ) {
    throw new Error(
      "Completed Mobility ride must remain TRIP_COMPLETED after financial failure.",
    );
  }
}

assertRideStateAfterFinancialFailure(
  "TRIP_COMPLETED",
);

assert.throws(
  () => {
    assertRideStateAfterFinancialFailure(
      "TRIP_IN_PROGRESS",
    );
  },
  /Completed Mobility ride must remain/,
);

/*
 * Recovery must never turn a financial mismatch into an
 * automatic accounting mutation.
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

assert.throws(
  () => {
    assertRecoveryAllowed(
      "MISMATCH",
    );
  },
  /accounting mismatch/,
);

/*
 * Re-running recovery must be allowed only for incomplete
 * states. A reconciled state is already safe and complete.
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

console.log(
  "Mobility lifecycle failure/recovery tests passed.",
);
