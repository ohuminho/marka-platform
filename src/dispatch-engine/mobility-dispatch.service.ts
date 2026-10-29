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

import { mobilitySafetyService } from "@/services/mobility/safety/mobility-safety.service";

import type { MobilitySafetyMode } from "@/services/mobility/orchestration/mobility-lifecycle.types";

export interface MobilityDispatchSearchInput {
  rideId: string;

  radiusMeters?: number;

  limit?: number;

  vehicleTypes?: string[];

  safetyMode?: MobilitySafetyMode;
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

  assignment:
    | MobilityDispatchAssignment
    | null;
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
          Number(
            ride.pickupLatitude
          ),

        pickupLongitude:
          Number(
            ride.pickupLongitude
          ),

        serviceType:
          ride.serviceType,

        vehicleTypes:
          input.vehicleTypes ??
          (ride.serviceType === "MOTO_TAXI"
            ? ["MOTORCYCLE"]
            : ride.serviceType === "TAXI"
              ? ["CAR"]
              : undefined),

        radiusMeters:
          input.radiusMeters,

        limit:
          input.limit,
      });

    if (
      candidates.length ===
      0
    ) {
      await mobilityRideService.markNoDriverFound(
        ride.id
      );

      return {
        rideId:
          ride.id,

        status:
          MobilityRideStatus.NO_DRIVER_FOUND,

        candidates: [],

        assignment:
          null,
      };
    }
