import { MobilityRideStatus } from "@prisma/client";

import { MobilityDomainError } from "@/services/mobility/errors/mobility-domain.error";

const allowedTransitions: Record<
  MobilityRideStatus,
  readonly MobilityRideStatus[]
> = {
  REQUESTED: [
    MobilityRideStatus.SEARCHING,
    MobilityRideStatus.CANCELLED,
    MobilityRideStatus.EXPIRED,
    MobilityRideStatus.FAILED,
  ],

  SEARCHING: [
    MobilityRideStatus.MATCHED,
    MobilityRideStatus.DRIVER_ASSIGNED,
    MobilityRideStatus.CANCELLED,
    MobilityRideStatus.EXPIRED,
    MobilityRideStatus.NO_DRIVER_FOUND,
    MobilityRideStatus.FAILED,
  ],

  MATCHED: [
    MobilityRideStatus.DRIVER_ASSIGNED,
    MobilityRideStatus.SEARCHING,
    MobilityRideStatus.CANCELLED,
    MobilityRideStatus.FAILED,
  ],

  DRIVER_ASSIGNED: [
    MobilityRideStatus.DRIVER_ARRIVING,
    MobilityRideStatus.SEARCHING,
    MobilityRideStatus.CANCELLED,
    MobilityRideStatus.FAILED,
  ],

  DRIVER_ARRIVING: [
    MobilityRideStatus.DRIVER_ARRIVED,
    MobilityRideStatus.SEARCHING,
    MobilityRideStatus.CANCELLED,
    MobilityRideStatus.FAILED,
  ],

  DRIVER_ARRIVED: [
    MobilityRideStatus.TRIP_STARTED,
    MobilityRideStatus.CANCELLED,
    MobilityRideStatus.FAILED,
  ],

  TRIP_STARTED: [
    MobilityRideStatus.TRIP_IN_PROGRESS,
    MobilityRideStatus.TRIP_COMPLETED,
    MobilityRideStatus.CANCELLED,
    MobilityRideStatus.DISPUTED,
    MobilityRideStatus.FAILED,
  ],

  TRIP_IN_PROGRESS: [
    MobilityRideStatus.TRIP_COMPLETED,
    MobilityRideStatus.CANCELLED,
    MobilityRideStatus.DISPUTED,
    MobilityRideStatus.FAILED,
  ],

  TRIP_COMPLETED: [
    MobilityRideStatus.DISPUTED,
  ],

  CANCELLED: [],
  EXPIRED: [],
  NO_DRIVER_FOUND: [],
  FAILED: [],
  DISPUTED: [],
};

export function canTransitionRideStatus(
  currentStatus: MobilityRideStatus,
  nextStatus: MobilityRideStatus
): boolean {
  const transitions = allowedTransitions[currentStatus];

  if (!transitions) {
    return false;
  }

  for (const allowedStatus of transitions) {
    if (allowedStatus === nextStatus) {
      return true;
    }
  }

  return false;
}

export function transitionRideStatus(
  currentStatus: MobilityRideStatus,
  nextStatus: MobilityRideStatus
): MobilityRideStatus {
  if (currentStatus === nextStatus) {
    throw new MobilityDomainError(
      `Ride is already in status ${currentStatus}.`,
      "RIDE_STATUS_UNCHANGED"
    );
  }

  if (!canTransitionRideStatus(currentStatus, nextStatus)) {
    throw new MobilityDomainError(
      `Invalid ride status transition from ${currentStatus} to ${nextStatus}.`,
      "INVALID_RIDE_STATUS_TRANSITION"
    );
  }

  return nextStatus;
}

export function isTerminalRideStatus(
  status: MobilityRideStatus
): boolean {
  switch (status) {
    case MobilityRideStatus.TRIP_COMPLETED:
    case MobilityRideStatus.CANCELLED:
    case MobilityRideStatus.EXPIRED:
    case MobilityRideStatus.NO_DRIVER_FOUND:
    case MobilityRideStatus.FAILED:
      return true;

    default:
      return false;
  }
}

export function isActiveRideStatus(
  status: MobilityRideStatus
): boolean {
  switch (status) {
    case MobilityRideStatus.REQUESTED:
    case MobilityRideStatus.SEARCHING:
    case MobilityRideStatus.MATCHED:
    case MobilityRideStatus.DRIVER_ASSIGNED:
    case MobilityRideStatus.DRIVER_ARRIVING:
    case MobilityRideStatus.DRIVER_ARRIVED:
    case MobilityRideStatus.TRIP_STARTED:
    case MobilityRideStatus.TRIP_IN_PROGRESS:
      return true;

    default:
      return false;
  }
}
