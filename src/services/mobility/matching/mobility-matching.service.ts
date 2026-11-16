import {
  MobilityAvailabilityStatus,
  MobilityDriverStatus,
  MobilityRideStatus,
  MobilityVehicleStatus,
  MobilityVerificationStatus,
} from "@prisma/client";

import { prisma } from "@/database/client/prisma";
import { areMobilityRidesCompatible, isSharedRideSequenceWithinDetour } from "@/services/mobility/matching/mobility-ride-compatibility";
import { mobilityRoutingService } from "@/services/mobility/pricing/mobility-routing.service";

export interface MobilityMatchRequest {
  organizationId: string;
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffLatitude: number;
  dropoffLongitude: number;
  serviceType: string;
  vehicleTypes?: string[];
  passengerCount?: number;
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

    const now = new Date();
    const requiredDriverDocuments = ["IDENTITY_DOCUMENT", "DRIVING_LICENSE", "CRIMINAL_RECORD"];
    const requiredVehicleDocuments = ["VEHICLE_REGISTRATION", "VEHICLE_OWNERSHIP", "VEHICLE_INSURANCE", "VEHICLE_INSPECTION", "VEHICLE_SERVICE_LICENSE"];
    const currentVerifiedDocument = (documentType: string) => ({
      verifications: {
        some: {
          documentType,
          status: MobilityVerificationStatus.VERIFIED,
          OR: [{ documentExpiry: null }, { documentExpiry: { gt: now } }],
        },
      },
    });

    const drivers =
      await prisma.mobilityDriver.findMany({
        where: {
          organizationId: input.organizationId,
          status: MobilityDriverStatus.ACTIVE,
          AND: [
            ...requiredDriverDocuments.map(currentVerifiedDocument),
            {
              vehicles: {
                some: {
                  isPrimary: true,
                  activeUntil: null,
                  vehicle: {
                    status: MobilityVehicleStatus.ACTIVE,
                    capacity: { gte: input.passengerCount ?? 1 },
                    AND: requiredVehicleDocuments.map((documentType) => currentVerifiedDocument(documentType)),
                  },
                },
              },
            },
          ],

          availability: {
            status: {
              in: [
                MobilityAvailabilityStatus.AVAILABLE,
                MobilityAvailabilityStatus.BUSY,
              ],
            },
          },

          vehicles: {
            some: {
              isPrimary: true,
              activeUntil: null,
              vehicle: {
                status: MobilityVehicleStatus.ACTIVE,
                capacity: {
                  gte: input.passengerCount ?? 1,
                },
                AND: requiredVehicleDocuments.map((documentType) =>
                  currentVerifiedDocument(documentType)
                ),
                ...(input.vehicleTypes &&
                input.vehicleTypes.length > 0
                  ? {
                      type: {
                        in: input.vehicleTypes as Array<"CAR" | "MOTORCYCLE" | "VAN" | "MINIBUS" | "BUS" | "COACH" | "TRUCK" | "OTHER">,
                      },
                    }
                  : {}),
              },
            },
          },

          location: {
            is: {
              recordedAt: {
                gte: new Date(Date.now() - 2 * 60 * 1000),
              },
            },
          },
        },

        include: {
          availability: true,

          location: true,

          ridesAsDriver: {
            where: {
              status: {
                in: [
                  "DRIVER_ASSIGNED",
                  "DRIVER_ARRIVING",
                  "DRIVER_ARRIVED",
                  "TRIP_STARTED",
                  "TRIP_IN_PROGRESS",
                ],
              },
            },
            select: {
              pickupLatitude: true,
              pickupLongitude: true,
              dropoffLatitude: true,
              dropoffLongitude: true,
              serviceType: true,
              status: true,
              metadata: true,
            },
          },

          vehicles: {
            where: {
              isPrimary: true,
              activeUntil: null,
              vehicle: {
                status: MobilityVehicleStatus.ACTIVE,
                capacity: { gte: input.passengerCount ?? 1 },
                AND: requiredVehicleDocuments.map(currentVerifiedDocument),
                ...(input.vehicleTypes?.length
                  ? { type: { in: input.vehicleTypes as Array<"CAR" | "MOTORCYCLE" | "VAN" | "MINIBUS" | "BUS" | "COACH" | "TRUCK" | "OTHER"> } }
                  : {}),
              },
            },
            include: { vehicle: true },
          },
        },
      });

    const candidates: MobilityMatchCandidate[] =
      [];
    // Prioritize nearby drivers so the bounded OSRM checks are spent on
    // the most promising shared-ride candidates first.
    drivers.sort((a, b) => {
      if (!a.location) return 1;
      if (!b.location) return -1;
      return this.calculateDistanceMeters(
        input.pickupLatitude,
        input.pickupLongitude,
        Number(a.location.latitude),
        Number(a.location.longitude),
      ) - this.calculateDistanceMeters(
        input.pickupLatitude,
        input.pickupLongitude,
        Number(b.location.latitude),
        Number(b.location.longitude),
      );
    });

    let sharedRouteChecks = 0;

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

      const activeRides = driver.ridesAsDriver ?? [];
      if (
        driver.availability?.status === MobilityAvailabilityStatus.BUSY &&
        activeRides.length === 0
      ) {
        continue;
      }
      if (
        activeRides.length > 0 &&
        !areMobilityRidesCompatible(
          {
            pickupLatitude: input.pickupLatitude,
            pickupLongitude: input.pickupLongitude,
            dropoffLatitude: input.dropoffLatitude,
            dropoffLongitude: input.dropoffLongitude,
            serviceType: input.serviceType,
            status: MobilityRideStatus.SEARCHING,
            metadata: { passengerCount: input.passengerCount ?? 1 },
          },
          activeRides,
          Number(vehicle.capacity ?? 1),
        )
      ) {
        continue;
      }

      // Executive is a service class, not a separate vehicle type. Until
      // dedicated executive verification is introduced, only vehicles
      // explicitly registered as LUXURY_SEDAN may receive these requests.
      const requestedService = input.serviceType.trim().toUpperCase();
      const expectedTruckSubtype: Record<string, string> = {
        PICKUP: "PICKUP",
        LIGHT_TRUCK: "LIGHT_TRUCK",
        MEDIUM_TRUCK: "MEDIUM_TRUCK",
        TIPPER_TRUCK: "TIPPER_TRUCK",
        HEAVY_TRUCK: "HEAVY_TRUCK",
      };
      const expectedSubtype = expectedTruckSubtype[requestedService];
      if (expectedSubtype) {
        const metadata = vehicle.metadata && typeof vehicle.metadata === "object" && !Array.isArray(vehicle.metadata)
          ? vehicle.metadata as Record<string, unknown>
          : {};
        if (metadata.vehicleSubtype !== expectedSubtype) continue;
      }

      if (input.serviceType.trim().toUpperCase() === "EXECUTIVE") {
        const vehicleMetadata = vehicle.metadata && typeof vehicle.metadata === "object" && !Array.isArray(vehicle.metadata)
          ? vehicle.metadata as Record<string, unknown>
          : {};
        if (vehicleMetadata.vehicleSubtype !== "LUXURY_SEDAN") continue;
      }

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

      if (activeRides.length > 0) {
        // Bound external routing calls during dispatch. If the OSRM matrix
        // cannot be verified, fail closed for shared assignments; ordinary
        // AVAILABLE drivers remain unaffected.
        if (sharedRouteChecks >= 10) continue;
        sharedRouteChecks += 1;
        const activeRide = activeRides[0];
        try {
          const durationMatrix = await mobilityRoutingService.getDurationMatrix([
            {
              latitude: Number(location.latitude),
              longitude: Number(location.longitude),
            },
            {
              latitude: Number(activeRide.pickupLatitude),
              longitude: Number(activeRide.pickupLongitude),
            },
            {
              latitude: Number(activeRide.dropoffLatitude),
              longitude: Number(activeRide.dropoffLongitude),
            },
            {
              latitude: input.pickupLatitude,
              longitude: input.pickupLongitude,
            },
            {
              latitude: input.dropoffLatitude,
              longitude: input.dropoffLongitude,
            },
          ]);
          if (
            !isSharedRideSequenceWithinDetour(
              durationMatrix,
              activeRide.status === MobilityRideStatus.DRIVER_ARRIVING,
            )
          ) continue;
        } catch {
          continue;
        }
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
      !Number.isFinite(input.dropoffLatitude) ||
      input.dropoffLatitude < -90 ||
      input.dropoffLatitude > 90
    ) {
      throw new Error("Invalid dropoff latitude.");
    }

    if (
      !Number.isFinite(input.dropoffLongitude) ||
      input.dropoffLongitude < -180 ||
      input.dropoffLongitude > 180
    ) {
      throw new Error("Invalid dropoff longitude.");
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
