import assert from "node:assert/strict";

type Step =
  | "REQUESTED"
  | "SAFETY_READY"
  | "SEARCHING"
  | "DRIVER_ASSIGNED"
  | "DRIVER_ACCEPTED"
  | "DRIVER_ARRIVING"
  | "DRIVER_ARRIVED"
  | "TRIP_STARTED"
  | "TRIP_IN_PROGRESS"
  | "TRIP_COMPLETED"
  | "PAYMENT_INITIALIZED"
  | "FINANCIAL_FINALIZED"
  | "CANCELLED"
  | "FAILED"
  | "RECOVERY_REQUIRED";

type Status =
  | "ACTIVE"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "RECOVERY_REQUIRED";

const transitions: Record<Step, readonly Step[]> = {
  REQUESTED: [
    "SAFETY_READY",
    "SEARCHING",
    "PAYMENT_INITIALIZED",
    "CANCELLED",
    "FAILED",
    "RECOVERY_REQUIRED",
  ],

  SAFETY_READY: [
    "SEARCHING",
    "PAYMENT_INITIALIZED",
    "CANCELLED",
    "FAILED",
    "RECOVERY_REQUIRED",
  ],

  SEARCHING: [
    "DRIVER_ASSIGNED",
    "PAYMENT_INITIALIZED",
    "CANCELLED",
    "FAILED",
    "RECOVERY_REQUIRED",
  ],

  DRIVER_ASSIGNED: [
    "DRIVER_ACCEPTED",
    "PAYMENT_INITIALIZED",
    "CANCELLED",
    "FAILED",
    "RECOVERY_REQUIRED",
  ],

  DRIVER_ACCEPTED: [
    "DRIVER_ARRIVING",
    "PAYMENT_INITIALIZED",
    "CANCELLED",
    "FAILED",
    "RECOVERY_REQUIRED",
  ],

  DRIVER_ARRIVING: [
    "DRIVER_ARRIVED",
    "PAYMENT_INITIALIZED",
    "CANCELLED",
    "FAILED",
    "RECOVERY_REQUIRED",
  ],

  DRIVER_ARRIVED: [
    "TRIP_STARTED",
    "PAYMENT_INITIALIZED",
    "CANCELLED",
    "FAILED",
    "RECOVERY_REQUIRED",
  ],

  TRIP_STARTED: [
    "TRIP_IN_PROGRESS",
    "TRIP_COMPLETED",
    "PAYMENT_INITIALIZED",
    "CANCELLED",
    "FAILED",
    "RECOVERY_REQUIRED",
  ],

  TRIP_IN_PROGRESS: [
    "TRIP_COMPLETED",
    "PAYMENT_INITIALIZED",
    "CANCELLED",
    "FAILED",
    "RECOVERY_REQUIRED",
  ],

  TRIP_COMPLETED: [
    "PAYMENT_INITIALIZED",
    "FINANCIAL_FINALIZED",
    "RECOVERY_REQUIRED",
    "FAILED",
  ],

  PAYMENT_INITIALIZED: [
    "FINANCIAL_FINALIZED",
    "RECOVERY_REQUIRED",
    "FAILED",
  ],

  FINANCIAL_FINALIZED: [],

  CANCELLED: [],

  FAILED: [
    "RECOVERY_REQUIRED",
  ],

  RECOVERY_REQUIRED: [
    "PAYMENT_INITIALIZED",
    "FINANCIAL_FINALIZED",
    "FAILED",
    "CANCELLED",
  ],
};

function canTransition(
  from: Step,
  to: Step,
): boolean {
  return transitions[from].includes(to);
}

function assertValidTransition(
  from: Step,
  to: Step,
): void {
  assert.equal(
    canTransition(from, to),
    true,
    `Invalid mobility orchestration transition: ${from} -> ${to}`,
  );
}

function assertInvalidTransition(
  from: Step,
  to: Step,
): void {
  assert.equal(
    canTransition(from, to),
    false,
    `Transition must be rejected: ${from} -> ${to}`,
  );
}

/*
 * Normal lifecycle.
 */
assertValidTransition(
  "REQUESTED",
  "SAFETY_READY",
);

assertValidTransition(
  "SAFETY_READY",
  "SEARCHING",
);

assertValidTransition(
  "SEARCHING",
  "DRIVER_ASSIGNED",
);

assertValidTransition(
  "DRIVER_ASSIGNED",
  "DRIVER_ACCEPTED",
);

assertValidTransition(
  "DRIVER_ACCEPTED",
  "DRIVER_ARRIVING",
);

assertValidTransition(
  "DRIVER_ARRIVING",
  "DRIVER_ARRIVED",
);

assertValidTransition(
  "DRIVER_ARRIVED",
  "TRIP_STARTED",
);

assertValidTransition(
  "TRIP_STARTED",
  "TRIP_IN_PROGRESS",
);

assertValidTransition(
  "TRIP_IN_PROGRESS",
  "TRIP_COMPLETED",
);

assertValidTransition(
  "TRIP_COMPLETED",
  "PAYMENT_INITIALIZED",
);

assertValidTransition(
  "PAYMENT_INITIALIZED",
  "FINANCIAL_FINALIZED",
);

/*
 * A completed orchestration is terminal.
 */
assertInvalidTransition(
  "FINANCIAL_FINALIZED",
  "RECOVERY_REQUIRED",
);

assertInvalidTransition(
  "FINANCIAL_FINALIZED",
  "FAILED",
);

/*
 * A completed ride may enter recovery,
 * but must not be moved backwards.
 */
assertValidTransition(
  "TRIP_COMPLETED",
  "RECOVERY_REQUIRED",
);

assertInvalidTransition(
  "RECOVERY_REQUIRED",
  "TRIP_COMPLETED",
);

assertInvalidTransition(
  "RECOVERY_REQUIRED",
  "TRIP_IN_PROGRESS",
);

/*
 * OCC simulation.
 *
 * Two workers read version 4.
 * Worker A succeeds and creates version 5.
 * Worker B still owns version 4 and must fail.
 */
function compareAndAdvance(
  currentVersion: number,
  expectedVersion: number,
): number {
  if (
    currentVersion !==
    expectedVersion
  ) {
    throw new Error(
      "Mobility orchestration concurrency conflict.",
    );
  }

  return currentVersion + 1;
}

assert.equal(
  compareAndAdvance(4, 4),
  5,
);

assert.throws(
  () => {
    compareAndAdvance(5, 4);
  },
  /concurrency conflict/,
);

/*
 * Idempotency simulation.
 */
function idempotentResult(
  store: Map<string, string>,
  key: string,
  value: string,
): string {
  const existing =
    store.get(key);

  if (existing) {
    return existing;
  }

  store.set(
    key,
    value,
  );

  return value;
}

const idempotencyStore =
  new Map<string, string>();

const first =
  idempotentResult(
    idempotencyStore,
    "ride:1:dispatch",
    "assignment:1",
  );

const second =
  idempotentResult(
    idempotencyStore,
    "ride:1:dispatch",
    "assignment:1",
  );

assert.equal(
  first,
  second,
);

assert.equal(
  idempotencyStore.size,
  1,
);

/*
 * Recovery disposition.
 */
function recoveryDisposition(
  status:
    | "RECONCILED"
    | "INCOMPLETE"
    | "MISMATCH",
): "NOOP" | "RECOVER" | "BLOCK" {
  switch (status) {
    case "RECONCILED":
      return "NOOP";

    case "INCOMPLETE":
      return "RECOVER";

    case "MISMATCH":
      return "BLOCK";
  }
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
 * Status invariants.
 */
function assertTerminalConsistency(
  status: Status,
  step: Step,
): void {
  if (
    status === "COMPLETED"
  ) {
    assert.equal(
      step,
      "FINANCIAL_FINALIZED",
    );
  }

  if (
    status === "CANCELLED"
  ) {
    assert.equal(
      step,
      "CANCELLED",
    );
  }

  if (
    status === "RECOVERY_REQUIRED"
  ) {
    assert.equal(
      step,
      "RECOVERY_REQUIRED",
    );
  }
}

assertTerminalConsistency(
  "COMPLETED",
  "FINANCIAL_FINALIZED",
);

assertTerminalConsistency(
  "CANCELLED",
  "CANCELLED",
);

assertTerminalConsistency(
  "RECOVERY_REQUIRED",
  "RECOVERY_REQUIRED",
);

console.log(
  "Mobility orchestration contract tests passed.",
);
