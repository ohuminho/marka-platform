// FILE: /workspaces/marka-platform/tests/unit/mobility/assignments/mobility-driver-vehicle.rules.test.ts

import {
  MobilityDriverStatus,
  MobilityVehicleStatus,
} from "@prisma/client";

import {
  validateAssignmentEligibility,
  validatePrimaryEligibility,
} from "@/services/mobility/assignments/mobility-driver-vehicle.rules";

function assert(
  condition: boolean,
  message: string
): void {
  if (!condition) {
    throw new Error(message);
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
    const code =
      error &&
      typeof error === "object" &&
      "code" in error
        ? String((error as { code: unknown }).code)
        : undefined;

    assert(
      code === expectedCode,
      `${message} Expected code ${expectedCode}, received ${code}.`
    );

    return;
  }

  throw new Error(
    `${message} Expected an exception.`
  );
}

validateAssignmentEligibility(
  MobilityDriverStatus.PENDING,
  MobilityVehicleStatus.PENDING
);

validateAssignmentEligibility(
  MobilityDriverStatus.ACTIVE,
  MobilityVehicleStatus.ACTIVE
);

validateAssignmentEligibility(
  MobilityDriverStatus.SUSPENDED,
  MobilityVehicleStatus.ACTIVE
);

assertThrows(
  () =>
    validateAssignmentEligibility(
      MobilityDriverStatus.BLOCKED,
      MobilityVehicleStatus.ACTIVE
    ),
  "BLOCKED_DRIVER_ASSIGNMENT",
  "Blocked drivers must not be assigned."
);

assertThrows(
  () =>
    validateAssignmentEligibility(
      MobilityDriverStatus.INACTIVE,
      MobilityVehicleStatus.ACTIVE
    ),
  "INACTIVE_DRIVER_ASSIGNMENT",
  "Inactive drivers must not be assigned."
);

assertThrows(
  () =>
    validateAssignmentEligibility(
      MobilityDriverStatus.ACTIVE,
      MobilityVehicleStatus.BLOCKED
    ),
  "BLOCKED_VEHICLE_ASSIGNMENT",
  "Blocked vehicles must not be assigned."
);

assertThrows(
  () =>
    validateAssignmentEligibility(
      MobilityDriverStatus.ACTIVE,
      MobilityVehicleStatus.RETIRED
    ),
  "RETIRED_VEHICLE_ASSIGNMENT",
  "Retired vehicles must not be assigned."
);

validatePrimaryEligibility(
  MobilityDriverStatus.ACTIVE,
  MobilityVehicleStatus.ACTIVE
);

assertThrows(
  () =>
    validatePrimaryEligibility(
      MobilityDriverStatus.PENDING,
      MobilityVehicleStatus.ACTIVE
    ),
  "PRIMARY_DRIVER_NOT_ACTIVE",
  "Pending drivers must not have a primary vehicle."
);

assertThrows(
  () =>
    validatePrimaryEligibility(
      MobilityDriverStatus.SUSPENDED,
      MobilityVehicleStatus.ACTIVE
    ),
  "PRIMARY_DRIVER_NOT_ACTIVE",
  "Suspended drivers must not have a primary vehicle."
);

assertThrows(
  () =>
    validatePrimaryEligibility(
      MobilityDriverStatus.ACTIVE,
      MobilityVehicleStatus.PENDING
    ),
  "PRIMARY_VEHICLE_NOT_ACTIVE",
  "Pending vehicles must not be primary."
);

assertThrows(
  () =>
    validatePrimaryEligibility(
      MobilityDriverStatus.ACTIVE,
      MobilityVehicleStatus.SUSPENDED
    ),
  "PRIMARY_VEHICLE_NOT_ACTIVE",
  "Suspended vehicles must not be primary."
);

console.log(
  "Mobility driver-vehicle assignment rules tests passed."
);
