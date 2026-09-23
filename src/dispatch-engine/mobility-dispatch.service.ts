import {
  MobilityAvailabilityStatus,
  MobilityDriverStatus,
  MobilityRideStatus,
  MobilityVehicleStatus,
} from "@prisma/client";

import { prisma } from "@/database/client/prisma";
import { DispatchDomainError } from "@/dispatch-engine/dispatch.errors";
import {
  mobilityMatchingService,
  type MobilityMatchCandidate,
} from "@/services/mobility/matching/mobility-matching.service";
import {
  mobilityRideService,
  type AssignMobilityDriverInput,
} from "@/services/mobility/rides/mobility-ride.service";

export interface MobilityDispatchSearchInput {
  rideId: string;
  radiusMeters?: number;
  limit?: number;
  vehicleTypes?: string[];
}

export interface MobilityDispatchAssignment {
  rideId: string;
  driverId: string;
  vehicleId: string;
  distanceMeters: number;
  score: number;
}

export interface MobilityDispatchResult {
  rideId: string;
  status: MobilityRideStatus;
  candidates: MobilityMatchCandidate[];
  assignment: MobilityDispatchAssignment | null;
}

export class MobilityDispatchService {
  async dispatch(
    input: MobilityDispatchSearchInput
  ): Promise<MobilityDispatchResult> {
    const ride =
      await this.requireDispatchableRide(
        input.rideId
      );

    const candidates =
      await mobilityMatchingService.findCandidates({
        organizationId:
          ride.organizationId,
        pickupLatitude:
          Number(ride.pickupLatitude),
        pickupLongitude:
          Number(ride.pickupLongitude),
        serviceType:
          ride.serviceType,
        vehicleTypes:
          input.vehicleTypes,
        radiusMeters:
          input.radiusMeters,
        limit:
          input.limit,
      });

    if (candidates.length === 0) {
      await mobilityRideService.markNoDriverFound(
        ride.id
      );

      return {
        rideId:
          ride.id,
        status:
          MobilityRideStatus.NO_DRIVER_FOUND,
        candidates: [],
        assignment: null,
      };
    }

    await this.ensureSearching(
      ride.id
    );

    const selected =
      candidates[0];

    const assignment =
      await this.assignCandidate(
        ride.id,
        selected.driverId,
        selected.vehicleId
      );

    return {
      rideId:
        ride.id,
      status:
        MobilityRideStatus.DRIVER_ASSIGNED,
      candidates,
      assignment: {
        rideId:
          ride.id,
        driverId:
          assignment.driverId,
        vehicleId:
          assignment.vehicleId,
        distanceMeters:
          selected.distanceMeters,
        score:
          selected.score,
      },
    };
  }

  async redispatch(
    input: MobilityDispatchSearchInput
  ): Promise<MobilityDispatchResult> {
    const ride =
      await this.requireRide(
        input.rideId
      );

    if (
      ride.status ===
        MobilityRideStatus.TRIP_STARTED ||
      ride.status ===
        MobilityRideStatus.TRIP_IN_PROGRESS ||
      ride.status ===
        MobilityRideStatus.TRIP_COMPLETED
    ) {
      throw new DispatchDomainError(
        "An active trip cannot be redispatched.",
        "RIDE_ALREADY_IN_PROGRESS"
      );
    }

    if (
      ride.status ===
        MobilityRideStatus.CANCELLED ||
      ride.status ===
        MobilityRideStatus.EXPIRED ||
      ride.status ===
        MobilityRideStatus.FAILED ||
      ride.status ===
        MobilityRideStatus.NO_DRIVER_FOUND
    ) {
      throw new DispatchDomainError(
        `Ride cannot be redispatched from status ${ride.status}.`,
        "RIDE_NOT_REDISPATCHABLE"
      );
    }

    await this.releaseCurrentAssignment(
      ride.id
    );

    if (
      ride.status !==
      MobilityRideStatus.SEARCHING
    ) {
      await mobilityRideService.startSearch(
        ride.id
      );
    }

    return this.dispatch(
      input
    );
  }

  async acceptAssignment(
    rideId: string,
    driverId: string
  ) {
    const ride =
      await this.requireRide(
        rideId
      );

    if (
      ride.status !==
      MobilityRideStatus.DRIVER_ASSIGNED
    ) {
      throw new DispatchDomainError(
        `Ride cannot be accepted from status ${ride.status}.`,
        "RIDE_NOT_AWAITING_ACCEPTANCE"
      );
    }

    if (
      ride.driverId !==
      driverId
    ) {
      throw new DispatchDomainError(
        "Driver is not assigned to this ride.",
        "DRIVER_NOT_ASSIGNED"
      );
    }

    const driver =
      await prisma.mobilityDriver.findUnique({
        where: {
          id: driverId,
        },
        include: {
          availability: true,
        },
      });

    if (!driver) {
      throw new DispatchDomainError(
        "Driver was not found.",
        "DRIVER_NOT_FOUND"
      );
    }

    if (
      driver.status !==
      MobilityDriverStatus.ACTIVE
    ) {
      throw new DispatchDomainError(
        "Driver is not active.",
        "DRIVER_NOT_ACTIVE"
      );
    }

    if (
      driver.availability?.status !==
      MobilityAvailabilityStatus.AVAILABLE
    ) {
      throw new DispatchDomainError(
        "Driver is no longer available.",
        "DRIVER_NOT_AVAILABLE"
      );
    }

    return mobilityRideService.markDriverArriving(
      rideId
    );
  }

  async rejectAssignment(
    rideId: string,
    driverId: string,
    reason: string
  ): Promise<MobilityDispatchResult> {
    const normalizedReason =
      reason.trim();

    if (!normalizedReason) {
      throw new DispatchDomainError(
        "Assignment rejection reason is required.",
        "DISPATCH_REJECTION_REASON_REQUIRED"
      );
    }

    const ride =
      await this.requireRide(
        rideId
      );

    if (
      ride.driverId !==
      driverId
    ) {
      throw new DispatchDomainError(
        "Driver is not assigned to this ride.",
        "DRIVER_NOT_ASSIGNED"
      );
    }

    await this.releaseCurrentAssignment(
      ride.id
    );

    const refreshed =
      await prisma.mobilityRide.findUnique({
        where: {
          id: ride.id,
        },
      });

    if (!refreshed) {
      throw new DispatchDomainError(
        "Ride was not found after assignment rejection.",
        "RIDE_NOT_FOUND"
      );
    }

    if (
      refreshed.status ===
      MobilityRideStatus.DRIVER_ASSIGNED
    ) {
      await mobilityRideService.startSearch(
        refreshed.id
      );
    }

    return this.dispatch({
      rideId:
        refreshed.id,
    });
  }

  async getCandidates(
    input: MobilityDispatchSearchInput
  ): Promise<MobilityMatchCandidate[]> {
    const ride =
      await this.requireRide(
        input.rideId
      );

    if (
      ride.status ===
        MobilityRideStatus.TRIP_COMPLETED ||
      ride.status ===
        MobilityRideStatus.CANCELLED ||
      ride.status ===
        MobilityRideStatus.EXPIRED
    ) {
      throw new DispatchDomainError(
        "Candidates cannot be requested for a completed or inactive ride.",
        "RIDE_NOT_SEARCHABLE"
      );
    }

    return mobilityMatchingService.findCandidates({
      organizationId:
        ride.organizationId,
      pickupLatitude:
        Number(ride.pickupLatitude),
      pickupLongitude:
        Number(ride.pickupLongitude),
      serviceType:
        ride.serviceType,
      radiusMeters:
        input.radiusMeters,
      limit:
        input.limit,
      vehicleTypes:
        input.vehicleTypes,
    });
  }

  private async assignCandidate(
    rideId: string,
    driverId: string,
    vehicleId: string
  ): Promise<AssignMobilityDriverInput> {
    const ride =
      await this.requireRide(
        rideId
      );

    const driver =
      await prisma.mobilityDriver.findUnique({
        where: {
          id: driverId,
        },
        include: {
          availability: true,
          vehicles: {
            where: {
              vehicleId,
              isPrimary: true,
              activeUntil: null,
            },
            include: {
              vehicle: true,
            },
          },
        },
      });

    if (!driver) {
      throw new DispatchDomainError(
        "Selected driver was not found.",
        "DRIVER_NOT_FOUND"
      );
    }

    if (
      driver.organizationId !==
      ride.organizationId
    ) {
      throw new DispatchDomainError(
        "Driver and ride belong to different organizations.",
        "DISPATCH_ORGANIZATION_MISMATCH"
      );
    }

    if (
      driver.status !==
      MobilityDriverStatus.ACTIVE
    ) {
      throw new DispatchDomainError(
        "Selected driver is not active.",
        "DRIVER_NOT_ACTIVE"
      );
    }

    if (
      driver.availability?.status !==
      MobilityAvailabilityStatus.AVAILABLE
    ) {
      throw new DispatchDomainError(
        "Selected driver is not available.",
        "DRIVER_NOT_AVAILABLE"
      );
    }

    const assignment =
      driver.vehicles[0];

    if (!assignment) {
      throw new DispatchDomainError(
        "Selected vehicle is not the driver's active primary vehicle.",
        "INVALID_DRIVER_VEHICLE_ASSIGNMENT"
      );
    }

    if (
      assignment.vehicle.organizationId !==
      ride.organizationId
    ) {
      throw new DispatchDomainError(
        "Vehicle and ride belong to different organizations.",
        "DISPATCH_VEHICLE_ORGANIZATION_MISMATCH"
      );
    }

    if (
      assignment.vehicle.status !==
      MobilityVehicleStatus.ACTIVE
    ) {
      throw new DispatchDomainError(
        "Selected vehicle is not active.",
        "VEHICLE_NOT_ACTIVE"
      );
    }

    const result =
      await mobilityRideService.assignDriver({
        rideId,
        driverId,
        vehicleId,
      });

    return {
      rideId,
      driverId:
        result.driverId!,
      vehicleId:
        result.vehicleId!,
    };
  }

  private async ensureSearching(
    rideId: string
  ): Promise<void> {
    const ride =
      await this.requireRide(
        rideId
      );

    if (
      ride.status ===
      MobilityRideStatus.REQUESTED
    ) {
      await mobilityRideService.startSearch(
        rideId
      );
    }
  }

  private async releaseCurrentAssignment(
    rideId: string
  ): Promise<void> {
    const ride =
      await this.requireRide(
        rideId
      );

    if (
      !ride.driverId &&
      !ride.vehicleId
    ) {
      return;
    }

    /*
     * Assignment history will be introduced through
     * the dedicated Dispatch persistence model.
     *
     * Until then, MobilityRide remains the authoritative
     * persisted aggregate for the active assignment.
     */
  }

  private async requireDispatchableRide(
    rideId: string
  ) {
    const ride =
      await this.requireRide(
        rideId
      );

    if (
      ride.status ===
        MobilityRideStatus.TRIP_STARTED ||
      ride.status ===
        MobilityRideStatus.TRIP_IN_PROGRESS ||
      ride.status ===
        MobilityRideStatus.TRIP_COMPLETED ||
      ride.status ===
        MobilityRideStatus.CANCELLED ||
      ride.status ===
        MobilityRideStatus.EXPIRED
    ) {
      throw new DispatchDomainError(
        `Ride cannot be dispatched from status ${ride.status}.`,
        "RIDE_NOT_DISPATCHABLE"
      );
    }

    return ride;
  }

  private async requireRide(
    rideId: string
  ) {
    const normalizedId =
      rideId.trim();

    if (!normalizedId) {
      throw new DispatchDomainError(
        "Ride id is required.",
        "RIDE_ID_REQUIRED"
      );
    }

    const ride =
      await prisma.mobilityRide.findUnique({
        where: {
          id:
            normalizedId,
        },
      });

    if (!ride) {
      throw new DispatchDomainError(
        "Mobility ride was not found.",
        "RIDE_NOT_FOUND"
      );
    }

    return ride;
  }
}

export const mobilityDispatchService =
  new MobilityDispatchService();
