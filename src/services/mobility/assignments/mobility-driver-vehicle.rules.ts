// FILE: /workspaces/marka-platform/src/services/mobility/assignments/mobility-driver-vehicle.rules.ts

import {
  MobilityDriverStatus,
  MobilityVehicleStatus,
} from "@prisma/client";

import { MobilityDomainError } from "@/services/mobility/errors/mobility-domain.error";

export function validateAssignmentEligibility(
  driverStatus: MobilityDriverStatus,
  vehicleStatus: MobilityVehicleStatus
): void {
  if (driverStatus === MobilityDriverStatus.BLOCKED) {
    throw new MobilityDomainError(
      "A blocked driver cannot be assigned to a vehicle.",
      "BLOCKED_DRIVER_ASSIGNMENT"
    );
  }

  if (driverStatus === MobilityDriverStatus.INACTIVE) {
    throw new MobilityDomainError(
      "An inactive driver cannot be assigned to a vehicle.",
      "INACTIVE_DRIVER_ASSIGNMENT"
    );
  }

  if (vehicleStatus === MobilityVehicleStatus.BLOCKED) {
    throw new MobilityDomainError(
      "A blocked vehicle cannot be assigned to a driver.",
      "BLOCKED_VEHICLE_ASSIGNMENT"
    );
  }

  if (vehicleStatus === MobilityVehicleStatus.RETIRED) {
    throw new MobilityDomainError(
      "A retired vehicle cannot be assigned to a driver.",
      "RETIRED_VEHICLE_ASSIGNMENT"
    );
  }
}

export function validatePrimaryEligibility(
  driverStatus: MobilityDriverStatus,
  vehicleStatus: MobilityVehicleStatus
): void {
  if (driverStatus !== MobilityDriverStatus.ACTIVE) {
    throw new MobilityDomainError(
      "Only an active driver can have a primary vehicle.",
      "PRIMARY_DRIVER_NOT_ACTIVE"
    );
  }

  if (vehicleStatus !== MobilityVehicleStatus.ACTIVE) {
    throw new MobilityDomainError(
      "Only an active vehicle can be a driver's primary vehicle.",
      "PRIMARY_VEHICLE_NOT_ACTIVE"
    );
  }
}
