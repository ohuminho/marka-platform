import { MobilityDriverStatus } from "@prisma/client";

import {
  canTransitionDriverStatus,
  transitionDriverStatus,
} from "@/services/mobility/drivers/mobility-driver.state-machine";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertThrows(
  callback: () => unknown,
  expectedCode: string,
  message: string
): void {
  try {
    callback();
  } catch (error) {
    const domainError = error as { code?: string };

    assert(
      domainError.code === expectedCode,
      `${message} (expected code ${expectedCode}, received ${domainError.code ?? "unknown"})`
    );

    return;
  }

  throw new Error(
    `Assertion failed: ${message} (expected an error)`
  );
}

assert(
  canTransitionDriverStatus(
    MobilityDriverStatus.PENDING,
    MobilityDriverStatus.ACTIVE
  ),
  "PENDING should transition to ACTIVE"
);

assert(
  canTransitionDriverStatus(
    MobilityDriverStatus.PENDING,
    MobilityDriverStatus.BLOCKED
  ),
  "PENDING should transition to BLOCKED"
);

assert(
  canTransitionDriverStatus(
    MobilityDriverStatus.ACTIVE,
    MobilityDriverStatus.SUSPENDED
  ),
  "ACTIVE should transition to SUSPENDED"
);

assert(
  canTransitionDriverStatus(
    MobilityDriverStatus.ACTIVE,
    MobilityDriverStatus.INACTIVE
  ),
  "ACTIVE should transition to INACTIVE"
);

assert(
  canTransitionDriverStatus(
    MobilityDriverStatus.SUSPENDED,
    MobilityDriverStatus.ACTIVE
  ),
  "SUSPENDED should transition to ACTIVE"
);

assert(
  canTransitionDriverStatus(
    MobilityDriverStatus.SUSPENDED,
    MobilityDriverStatus.BLOCKED
  ),
  "SUSPENDED should transition to BLOCKED"
);

assert(
  canTransitionDriverStatus(
    MobilityDriverStatus.INACTIVE,
    MobilityDriverStatus.ACTIVE
  ),
  "INACTIVE should transition to ACTIVE"
);

assert(
  !canTransitionDriverStatus(
    MobilityDriverStatus.BLOCKED,
    MobilityDriverStatus.ACTIVE
  ),
  "BLOCKED should not transition to ACTIVE"
);

assert(
  !canTransitionDriverStatus(
    MobilityDriverStatus.BLOCKED,
    MobilityDriverStatus.SUSPENDED
  ),
  "BLOCKED should not transition to SUSPENDED"
);

assert(
  !canTransitionDriverStatus(
    MobilityDriverStatus.PENDING,
    MobilityDriverStatus.SUSPENDED
  ),
  "PENDING should not transition directly to SUSPENDED"
);

assert(
  transitionDriverStatus(
    MobilityDriverStatus.PENDING,
    MobilityDriverStatus.ACTIVE
  ) === MobilityDriverStatus.ACTIVE,
  "Valid transition should return the new status"
);

assertThrows(
  () =>
    transitionDriverStatus(
      MobilityDriverStatus.BLOCKED,
      MobilityDriverStatus.ACTIVE
    ),
  "INVALID_DRIVER_STATUS_TRANSITION",
  "Invalid transition should be rejected"
);

assertThrows(
  () =>
    transitionDriverStatus(
      MobilityDriverStatus.ACTIVE,
      MobilityDriverStatus.ACTIVE
    ),
  "DRIVER_STATUS_UNCHANGED",
  "Unchanged status should be rejected"
);

console.log("Mobility driver state machine tests passed.");
