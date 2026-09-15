// FILE: /workspaces/marka-platform/tests/unit/mobility/vehicles/mobility-vehicle.state-machine.test.ts

import { MobilityVehicleStatus } from "@prisma/client";

import {
  canTransitionVehicleStatus,
  transitionVehicleStatus,
} from "@/services/mobility/vehicles/mobility-vehicle.state-machine";

function assert(
  condition: boolean,
  message: string
): void {
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
    const domainError = error as {
      code?: string;
    };

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
  canTransitionVehicleStatus(
    MobilityVehicleStatus.PENDING,
    MobilityVehicleStatus.ACTIVE
  ),
  "PENDING should transition to ACTIVE"
);

assert(
  canTransitionVehicleStatus(
    MobilityVehicleStatus.PENDING,
    MobilityVehicleStatus.BLOCKED
  ),
  "PENDING should transition to BLOCKED"
);

assert(
  canTransitionVehicleStatus(
    MobilityVehicleStatus.ACTIVE,
    MobilityVehicleStatus.SUSPENDED
  ),
  "ACTIVE should transition to SUSPENDED"
);

assert(
  canTransitionVehicleStatus(
    MobilityVehicleStatus.ACTIVE,
    MobilityVehicleStatus.RETIRED
  ),
  "ACTIVE should transition to RETIRED"
);

assert(
  canTransitionVehicleStatus(
    MobilityVehicleStatus.SUSPENDED,
    MobilityVehicleStatus.ACTIVE
  ),
  "SUSPENDED should transition to ACTIVE"
);

assert(
  canTransitionVehicleStatus(
    MobilityVehicleStatus.SUSPENDED,
    MobilityVehicleStatus.BLOCKED
  ),
  "SUSPENDED should transition to BLOCKED"
);

assert(
  canTransitionVehicleStatus(
    MobilityVehicleStatus.SUSPENDED,
    MobilityVehicleStatus.RETIRED
  ),
  "SUSPENDED should transition to RETIRED"
);

assert(
  !canTransitionVehicleStatus(
    MobilityVehicleStatus.BLOCKED,
    MobilityVehicleStatus.ACTIVE
  ),
  "BLOCKED should not transition to ACTIVE"
);

assert(
  !canTransitionVehicleStatus(
    MobilityVehicleStatus.BLOCKED,
    MobilityVehicleStatus.RETIRED
  ),
  "BLOCKED should not transition to RETIRED"
);

assert(
  !canTransitionVehicleStatus(
    MobilityVehicleStatus.RETIRED,
    MobilityVehicleStatus.ACTIVE
  ),
  "RETIRED should not transition to ACTIVE"
);

assert(
  !canTransitionVehicleStatus(
    MobilityVehicleStatus.PENDING,
    MobilityVehicleStatus.SUSPENDED
  ),
  "PENDING should not transition directly to SUSPENDED"
);

assert(
  transitionVehicleStatus(
    MobilityVehicleStatus.PENDING,
    MobilityVehicleStatus.ACTIVE
  ) === MobilityVehicleStatus.ACTIVE,
  "Valid transition should return the new status"
);

assertThrows(
  () =>
    transitionVehicleStatus(
      MobilityVehicleStatus.BLOCKED,
      MobilityVehicleStatus.ACTIVE
    ),
  "INVALID_VEHICLE_STATUS_TRANSITION",
  "Invalid transition should be rejected"
);

assertThrows(
  () =>
    transitionVehicleStatus(
      MobilityVehicleStatus.ACTIVE,
      MobilityVehicleStatus.ACTIVE
    ),
  "VEHICLE_STATUS_UNCHANGED",
  "Unchanged status should be rejected"
);

console.log(
  "Mobility vehicle state machine tests passed."
);
