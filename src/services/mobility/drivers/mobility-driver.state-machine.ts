import { MobilityDriverStatus } from "@prisma/client";

import { MobilityDomainError } from "@/services/mobility/errors/mobility-domain.error";

const allowedTransitions: Record<
  MobilityDriverStatus,
  readonly MobilityDriverStatus[]
> = {
  PENDING: [
    MobilityDriverStatus.ACTIVE,
    MobilityDriverStatus.BLOCKED,
  ],
  ACTIVE: [
    MobilityDriverStatus.SUSPENDED,
    MobilityDriverStatus.INACTIVE,
  ],
  SUSPENDED: [
    MobilityDriverStatus.ACTIVE,
    MobilityDriverStatus.BLOCKED,
  ],
  BLOCKED: [],
  INACTIVE: [
    MobilityDriverStatus.ACTIVE,
  ],
};

export function canTransitionDriverStatus(
  currentStatus: MobilityDriverStatus,
  nextStatus: MobilityDriverStatus
): boolean {
  return allowedTransitions[currentStatus].includes(nextStatus);
}

export function transitionDriverStatus(
  currentStatus: MobilityDriverStatus,
  nextStatus: MobilityDriverStatus
): MobilityDriverStatus {
  if (currentStatus === nextStatus) {
    throw new MobilityDomainError(
      `Driver is already in status ${currentStatus}.`,
      "DRIVER_STATUS_UNCHANGED"
    );
  }

  if (!canTransitionDriverStatus(currentStatus, nextStatus)) {
    throw new MobilityDomainError(
      `Invalid driver status transition from ${currentStatus} to ${nextStatus}.`,
      "INVALID_DRIVER_STATUS_TRANSITION"
    );
  }

  return nextStatus;
}
