import {
  MobilityAvailabilityStatus,
  MobilityDriverStatus,
  MobilityVehicleStatus,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/database/client/prisma";

export interface MobilityMatchRequest {
  organizationId: string;
  pickupLatitude: number;
  pickupLongitude: number;
  serviceType: string;
  vehicleTypes?: string[];
  radiusMeters?: number;
  limit?: number;
}

export interface MobilityMatchCandidate {
  driverId: string;
  vehicleId: string;
  distanceMeters: number;
  score: number;
  driverDisplayName: string | null;
  vehicleType: string;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleColor: string | null;
  vehicleRegistrationNumber: string | null;
  metadata: Record<string, unknown>;
}

export class MobilityMatchingService {
  async findCandidates(
    input: MobilityMatchRequest
  ): Promise<MobilityMatchCandidate[]> {
    this.validate(input);

    const radiusMeters =
      input.radiusMeters ?? 10_000;

    const limit = Math.min(
      input.limit ?? 10,
      50
    );

    const drivers =
      await prisma.mobilityDriver.findMany({
        where: {
          organizationId: input.organizationId,
          status: MobilityDriverStatus.ACTIVE,

          availability: {
            status:
              MobilityAvailabilityStatus.AVAILABLE,
          },

          vehicles: {
            some: {
              isPrimary: true,
              activeUntil: null,
              vehicle: {
                status: MobilityVehicleStatus.ACTIVE,
                ...(input.vehicleTypes &&
                input.vehicleTypes.length > 0
                  ? {
                      type: {
                        in: input.vehicleTypes as any,
                      },
                    }
                  : {}),
              },
            },
          },

          location: {
            isNot: null,
          },
        },

        include: {
          availability: true,

          location: true,

          vehicles: {
            where: {
              isPrimary: true,
              activeUntil: null,
              vehicle: {
                status: MobilityVehicleStatus.ACTIVE,
              },
            },
            include: {
              vehicle: true,
            },
          },
        },
      });

    const candidates: MobilityMatchCandidate[] =
      [];

    for (const driver of drivers) {
      const location = driver.location;

      if (!location) {
        continue;
      }

      const primaryAssignment =
        driver.vehicles[0];

      if (!primaryAssignment) {
        continue;
      }

      const vehicle =
        primaryAssignment.vehicle;

      const distanceMeters =
        this.calculateDistanceMeters(
          input.pickupLatitude,
          input.pickupLongitude,
          Number(location.latitude),
          Number(location.longitude)
        );

      if (distanceMeters > radiusMeters) {
        continue;
      }

      const score =
        this.calculateScore(
          distanceMeters,
          Number(location.accuracyM ?? 0),
          Number(location.speedKph ?? 0)
        );

      candidates.push({
        driverId: driver.id,
        vehicleId: vehicle.id,
        distanceMeters,
        score,
        driverDisplayName:
          driver.displayName,
        vehicleType: vehicle.type,
        vehicleMake: vehicle.make,
        vehicleModel: vehicle.model,
        vehicleColor: vehicle.color,
        vehicleRegistrationNumber:
          vehicle.registrationNumber,
        metadata: {
          serviceType: input.serviceType,
          locationRecordedAt:
            location.recordedAt.toISOString(),
          locationSource: location.source,
        },
      });
    }

    candidates.sort(
      (a, b) =>
        b.score - a.score ||
        a.distanceMeters - b.distanceMeters
    );

    return candidates.slice(0, limit);
  }

  private calculateScore(
    distanceMeters: number,
    accuracyMeters: number,
    speedKph: number
  ): number {
    const distanceScore =
      Math.max(
        0,
        1_000_000 - distanceMeters
      );

    const accuracyPenalty =
      Math.min(
        100_000,
        accuracyMeters * 1_000
      );

    const movementBonus =
      Math.min(
        20_000,
        Math.max(0, speedKph * 500)
      );

    return (
      distanceScore -
      accuracyPenalty +
      movementBonus
    );
  }

  private calculateDistanceMeters(
    latitudeA: number,
    longitudeA: number,
    latitudeB: number,
    longitudeB: number
  ): number {
    const earthRadiusMeters = 6_371_000;

    const latA =
      this.toRadians(latitudeA);
    const latB =
      this.toRadians(latitudeB);

    const deltaLat =
      this.toRadians(
        latitudeB - latitudeA
      );

    const deltaLongitude =
      this.toRadians(
        longitudeB - longitudeA
      );

    const a =
      Math.sin(deltaLat / 2) ** 2 +
      Math.cos(latA) *
        Math.cos(latB) *
        Math.sin(deltaLongitude / 2) ** 2;

    const c =
      2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
      );

    return earthRadiusMeters * c;
  }

  private toRadians(
    degrees: number
  ): number {
    return (
      (degrees * Math.PI) / 180
    );
  }

  private validate(
    input: MobilityMatchRequest
  ): void {
    if (!input.organizationId.trim()) {
      throw new Error(
        "Mobility organizationId is required."
      );
    }

    if (
      !Number.isFinite(
        input.pickupLatitude
      ) ||
      input.pickupLatitude < -90 ||
      input.pickupLatitude > 90
    ) {
      throw new Error(
        "Invalid pickup latitude."
      );
    }

    if (
      !Number.isFinite(
        input.pickupLongitude
      ) ||
      input.pickupLongitude < -180 ||
      input.pickupLongitude > 180
    ) {
      throw new Error(
        "Invalid pickup longitude."
      );
    }

    if (
      input.radiusMeters !== undefined &&
      (!Number.isFinite(
        input.radiusMeters
      ) ||
        input.radiusMeters <= 0)
    ) {
      throw new Error(
        "Matching radius must be positive."
      );
    }

    if (
      input.limit !== undefined &&
      (!Number.isInteger(input.limit) ||
        input.limit <= 0)
    ) {
      throw new Error(
        "Matching limit must be a positive integer."
      );
    }
  }
}

export const mobilityMatchingService =
  new MobilityMatchingService();
