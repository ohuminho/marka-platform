// FILE: /workspaces/marka-platform/src/services/mobility/vehicles/mobility-vehicle.state-machine.ts

import { MobilityVehicleStatus } from "@prisma/client";

import { MobilityDomainError } from "@/services/mobility/errors/mobility-domain.error";

const allowedTransitions: Record<
  MobilityVehicleStatus,
  readonly MobilityVehicleStatus[]
> = {
  PENDING: [
    MobilityVehicleStatus.ACTIVE,
    MobilityVehicleStatus.BLOCKED,
  ],
  ACTIVE: [
    MobilityVehicleStatus.SUSPENDED,
    MobilityVehicleStatus.RETIRED,
  ],
  SUSPENDED: [
    MobilityVehicleStatus.ACTIVE,
    MobilityVehicleStatus.BLOCKED,
    MobilityVehicleStatus.RETIRED,
  ],
  BLOCKED: [],
  RETIRED: [],
};

export function canTransitionVehicleStatus(
  currentStatus: MobilityVehicleStatus,
  nextStatus: MobilityVehicleStatus
): boolean {
  return allowedTransitions[currentStatus].includes(nextStatus);
}

export function transitionVehicleStatus(
  currentStatus: MobilityVehicleStatus,
  nextStatus: MobilityVehicleStatus
): MobilityVehicleStatus {
  if (currentStatus === nextStatus) {
    throw new MobilityDomainError(
      `Vehicle is already in status ${currentStatus}.`,
      "VEHICLE_STATUS_UNCHANGED"
    );
  }

  if (!canTransitionVehicleStatus(currentStatus, nextStatus)) {
    throw new MobilityDomainError(
      `Invalid vehicle status transition from ${currentStatus} to ${nextStatus}.`,
      "INVALID_VEHICLE_STATUS_TRANSITION"
    );
  }

  return nextStatus;
}
