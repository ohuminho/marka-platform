import { createHash } from "node:crypto";

import {
  MobilityAvailabilityStatus,
  MobilityRideStatus,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/database/client/prisma";

import {
  isTerminalRideStatus,
  resolveDriverAvailabilityForActiveRides,
  transitionRideStatus,
} from "@/services/mobility/rides/mobility-ride.state-machine";

import { MobilityDomainError } from "@/services/mobility/errors/mobility-domain.error";
import { areMobilityRidesCompatible, mobilityPassengerCount } from "@/services/mobility/matching/mobility-ride-compatibility";

import {
  MobilityMatchCandidate,
  MobilityMatchingService,
} from "@/services/mobility/matching/mobility-matching.service";

export interface CreateMobilityRideInput {
  organizationId: string;
  riderId: string;

  serviceType: string;

  currency?: string;
  estimatedFareMinor?: bigint;

  pickupLatitude: number;
  pickupLongitude: number;
  pickupAddress?: string;

  dropoffLatitude: number;
  dropoffLongitude: number;
  dropoffAddress?: string;

  stops?: Array<{
    sequence: number;
    type: "PICKUP" | "STOP" | "DROPOFF";
    latitude: number;
    longitude: number;
    address?: string;
  }>;

  metadata?: Prisma.InputJsonValue;
}

export interface AssignMobilityDriverInput {
  rideId: string;
  driverId: string;
  vehicleId: string;
}

export class MobilityRideService {
  private readonly matchingService =
    new MobilityMatchingService();

  async create(
    input: CreateMobilityRideInput
  ) {
    this.validateCreateInput(input);

    const rider =
      await prisma.user.findUnique({
        where: {
          id: input.riderId,
        },
        select: {
          id: true,
          status: true,
        },
      });

    if (!rider) {
      throw new MobilityDomainError(
        "Rider was not found.",
        "RIDER_NOT_FOUND"
      );
    }

    const reference =
      await this.generateReference();

    return prisma.$transaction(
      async (tx) => {
        const ride =
          await tx.mobilityRide.create({
            data: {
              organizationId:
                input.organizationId,
              riderId: input.riderId,
              status:
                MobilityRideStatus.REQUESTED,
              reference,
              serviceType:
                input.serviceType.trim(),
              currency:
                input.currency ?? "AOA",
              pickupLatitude:
                input.pickupLatitude,
              pickupLongitude:
                input.pickupLongitude,
              pickupAddress:
                input.pickupAddress,

              dropoffLatitude:
                input.dropoffLatitude,
              dropoffLongitude:
                input.dropoffLongitude,
              dropoffAddress:
                input.dropoffAddress,

              requestedAt: new Date(),

              metadata: withEstimatedFare(input.metadata, input.estimatedFareMinor),

              stops:
                input.stops &&
                input.stops.length > 0
                  ? {
                      create:
                        input.stops.map(
                          (stop) => ({
                            sequence:
                              stop.sequence,
                            type: stop.type,
                            latitude:
                              stop.latitude,
                            longitude:
                              stop.longitude,
                            address:
                              stop.address,
                          })
                        ),
                    }
                  : undefined,
            },

            include: {
              stops: {
                orderBy: {
                  sequence: "asc",
                },
              },
            },
          });

        return ride;
      }
    );
  }


  async createIdempotent(
    input: CreateMobilityRideInput,
    idempotencyKey: string,
  ) {
    this.validateCreateInput(input);

    const key = idempotencyKey.trim();
    if (!key || key.length > 255) {
      throw new MobilityDomainError(
        "A valid internal request identity is required.",
        "INVALID_IDEMPOTENCY_KEY",
      );
    }

    const scope = `mobility:ride:create:${input.organizationId}:${input.riderId}`;
    const { estimatedFareMinor: _fareForReplay, ...requestIdentity } = input;
    const requestHash = createHash("sha256")
      .update(JSON.stringify(normalizeIdempotencyValue(requestIdentity)))
      .digest("hex");

    const existingResult = async () => {
      const record = await prisma.idempotencyRecord.findUnique({
        where: { key },
      });
      if (!record) return null;
      if (record.scope !== scope || record.requestHash !== requestHash) {
        throw new MobilityDomainError(
          "This request identity is already associated with different trip details.",
          "IDEMPOTENCY_PAYLOAD_MISMATCH",
        );
      }
      if (record.status !== "COMPLETED" || !record.resourceId) {
        throw new MobilityDomainError(
          "The original trip request is still being recovered. Retry the same request shortly.",
          "IDEMPOTENCY_OPERATION_IN_PROGRESS",
        );
      }
      const ride = await prisma.mobilityRide.findFirst({
        where: {
          id: record.resourceId,
          organizationId: input.organizationId,
          riderId: input.riderId,
        },
        include: {
          stops: { orderBy: { sequence: "asc" } },
        },
      });
      if (!ride) {
        throw new MobilityDomainError(
          "The previously registered trip could not be recovered.",
          "IDEMPOTENCY_RESOURCE_MISSING",
        );
      }
      return { ride, replayed: true as const };
    };

    const alreadyCreated = await existingResult();
    if (alreadyCreated) return alreadyCreated;

    const rider = await prisma.user.findUnique({
      where: { id: input.riderId },
      select: { id: true, status: true },
    });
    if (!rider || rider.status !== "ACTIVE") {
      throw new MobilityDomainError(
        "Rider account is not available.",
        "RIDER_NOT_AVAILABLE",
      );
    }

    const reference = await this.generateReference();
    try {
      const ride = await prisma.$transaction(async (tx) => {
        await tx.idempotencyRecord.create({
          data: {
            key,
            scope,
            userId: input.riderId,
            requestHash,
            status: "IN_PROGRESS",
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });

        const created = await tx.mobilityRide.create({
          data: {
            organizationId: input.organizationId,
            riderId: input.riderId,
            status: MobilityRideStatus.REQUESTED,
            reference,
            serviceType: input.serviceType.trim(),
            currency: input.currency ?? "AOA",
            pickupLatitude: input.pickupLatitude,
            pickupLongitude: input.pickupLongitude,
            pickupAddress: input.pickupAddress,
            dropoffLatitude: input.dropoffLatitude,
            dropoffLongitude: input.dropoffLongitude,
            dropoffAddress: input.dropoffAddress,
            requestedAt: new Date(),
            metadata: withEstimatedFare(input.metadata, input.estimatedFareMinor),
            stops: input.stops?.length
              ? {
                  create: input.stops.map((stop) => ({
                    sequence: stop.sequence,
                    type: stop.type,
                    latitude: stop.latitude,
                    longitude: stop.longitude,
                    address: stop.address,
                  })),
                }
              : undefined,
          },
          include: {
            stops: { orderBy: { sequence: "asc" } },
          },
        });

        await tx.idempotencyRecord.update({
          where: { key },
          data: {
            status: "COMPLETED",
            responseStatus: 201,
            responseBody: { rideId: created.id },
            resourceType: "MOBILITY_RIDE",
            resourceId: created.id,
          },
        });
        return created;
      });

      return { ride, replayed: false as const };
    } catch (error) {
      const recovered = await existingResult();
      if (recovered) return recovered;
      throw error;
    }
  }

  async startSearch(
    rideId: string
  ) {
    const ride =
      await this.requireRide(rideId);

    transitionRideStatus(
      ride.status,
      MobilityRideStatus.SEARCHING
    );

    return prisma.mobilityRide.update({
      where: {
        id: rideId,
      },
      data: {
        status:
          MobilityRideStatus.SEARCHING,
      },
      include: {
        stops: {
          orderBy: {
            sequence: "asc",
          },
        },
      },
    });
  }

  async findCandidates(
    rideId: string,
    options?: {
      radiusMeters?: number;
      limit?: number;
      vehicleTypes?: string[];
    }
  ): Promise<MobilityMatchCandidate[]> {
    const ride =
      await this.requireRide(rideId);

    if (
      ride.status !==
        MobilityRideStatus.SEARCHING &&
      ride.status !==
        MobilityRideStatus.REQUESTED
    ) {
      throw new MobilityDomainError(
        `Ride ${rideId} is not available for matching in status ${ride.status}.`,
        "RIDE_NOT_SEARCHABLE"
      );
    }

    if (
      ride.status ===
      MobilityRideStatus.REQUESTED
    ) {
      await this.startSearch(rideId);
    }

    return this.matchingService.findCandidates(
      {
        organizationId:
          ride.organizationId,

        pickupLatitude:
          Number(ride.pickupLatitude),

        pickupLongitude:
          Number(ride.pickupLongitude),

        dropoffLatitude:
          Number(ride.dropoffLatitude),

        dropoffLongitude:
          Number(ride.dropoffLongitude),

        serviceType:
          ride.serviceType,

        passengerCount: mobilityPassengerCount(ride.metadata),

        radiusMeters:
          options?.radiusMeters,

        limit:
          options?.limit,

        vehicleTypes:
          options?.vehicleTypes,
      }
    );
  }

  async markMatched(
    rideId: string
  ) {
    return this.transition(
      rideId,
      MobilityRideStatus.MATCHED,
      {
        matchedAt: new Date(),
      }
    );
  }

  async assignDriver(
    input: AssignMobilityDriverInput
  ) {
    const ride =
      await this.requireRide(
        input.rideId
      );

    if (
      ride.status !==
        MobilityRideStatus.MATCHED &&
      ride.status !==
        MobilityRideStatus.SEARCHING
    ) {
      throw new MobilityDomainError(
        `Ride ${input.rideId} cannot be assigned in status ${ride.status}.`,
        "RIDE_NOT_ASSIGNABLE"
      );
    }

    const assignment =
      await prisma.mobilityDriverVehicle.findUnique(
        {
          where: {
            driverId_vehicleId: {
              driverId:
                input.driverId,
              vehicleId:
                input.vehicleId,
            },
          },

          include: {
            driver: {
              select: {
                id: true,
                organizationId: true,
                status: true,
              },
            },

            vehicle: {
              select: {
                id: true,
                organizationId: true,
                status: true,
                capacity: true,
              },
            },
          },
        }
      );

    if (!assignment) {
      throw new MobilityDomainError(
        "Driver is not assigned to this vehicle.",
        "DRIVER_VEHICLE_ASSIGNMENT_NOT_FOUND"
      );
    }

    if (
      assignment.activeUntil !== null
    ) {
      throw new MobilityDomainError(
        "Driver-vehicle assignment is inactive.",
        "INACTIVE_DRIVER_VEHICLE_ASSIGNMENT"
      );
    }

    if (
      assignment.driver.organizationId !==
      ride.organizationId
    ) {
      throw new MobilityDomainError(
        "Driver and ride belong to different organizations.",
        "RIDE_DRIVER_ORGANIZATION_MISMATCH"
      );
    }

    if (
      assignment.vehicle.organizationId !==
      ride.organizationId
    ) {
      throw new MobilityDomainError(
        "Vehicle and ride belong to different organizations.",
        "RIDE_VEHICLE_ORGANIZATION_MISMATCH"
      );
    }

    return prisma.$transaction(
      async (tx) => {
        const current =
          await tx.mobilityRide.findUnique(
            {
              where: {
                id: input.rideId,
              },
              select: {
                status: true,
              },
            }
          );

        if (!current) {
          throw new MobilityDomainError(
            "Ride was not found.",
            "RIDE_NOT_FOUND"
          );
        }

        if (
          current.status !==
            MobilityRideStatus.MATCHED &&
          current.status !==
            MobilityRideStatus.SEARCHING
        ) {
          throw new MobilityDomainError(
            `Ride cannot be assigned from status ${current.status}.`,
            "RIDE_NOT_ASSIGNABLE"
          );
        }

        // Serialize claims for the same driver and vehicle. Without row locks,
        // two concurrent requests for different rides could both observe no
        // conflicting assignment and claim the same resources.
        await tx.$queryRaw`
          SELECT "id"
          FROM "MobilityDriver"
          WHERE "id" = ${input.driverId}
          FOR UPDATE
        `;
        await tx.$queryRaw`
          SELECT "id"
          FROM "MobilityVehicle"
          WHERE "id" = ${input.vehicleId}
          FOR UPDATE
        `;

        const activeRideStatuses = [
          MobilityRideStatus.DRIVER_ASSIGNED,
          MobilityRideStatus.DRIVER_ARRIVING,
          MobilityRideStatus.DRIVER_ARRIVED,
          MobilityRideStatus.TRIP_STARTED,
          MobilityRideStatus.TRIP_IN_PROGRESS,
        ];
        const conflictingRides = await tx.mobilityRide.findMany({
          where: {
            id: { not: input.rideId },
            OR: [
              { driverId: input.driverId },
              { vehicleId: input.vehicleId },
            ],
            status: { in: activeRideStatuses },
          },
          select: {
            id: true,
            driverId: true,
            vehicleId: true,
            pickupLatitude: true,
            pickupLongitude: true,
            dropoffLatitude: true,
            dropoffLongitude: true,
            serviceType: true,
            status: true,
            metadata: true,
          },
        });

        const vehicleClaimConflict = conflictingRides.some(
          (activeRide) =>
            activeRide.vehicleId === input.vehicleId &&
            activeRide.driverId !== input.driverId,
        );
        const driverVehicleConflict = conflictingRides.some(
          (activeRide) =>
            activeRide.driverId === input.driverId &&
            activeRide.vehicleId !== input.vehicleId,
        );
        if (vehicleClaimConflict || driverVehicleConflict) {
          throw new MobilityDomainError(
            "The vehicle is assigned to another driver or the driver is attempting to mix vehicles across active rides.",
            "DRIVER_OR_VEHICLE_ALREADY_ASSIGNED"
          );
        }

        const driverActiveRides = conflictingRides.filter(
          (activeRide) => activeRide.driverId === input.driverId,
        );
        if (
          driverActiveRides.length > 0 &&
          !areMobilityRidesCompatible(
            ride,
            driverActiveRides,
            Number(assignment.vehicle.capacity ?? 1),
          )
        ) {
          throw new MobilityDomainError(
            "Driver has an active ride that is not compatible with this route, timing, or vehicle capacity.",
            "DRIVER_ACTIVE_RIDE_NOT_COMPATIBLE"
          );
        }

        const nextStatus =
          MobilityRideStatus.DRIVER_ASSIGNED;

        transitionRideStatus(
          current.status,
          nextStatus
        );

        // Compare-and-set: only one concurrent dispatcher can claim a ride.
        // A transaction alone is not enough when two requests read the same prior status.
        const claimed = await tx.mobilityRide.updateMany({
          where: {
            id: input.rideId,
            status: {
              in: [
                MobilityRideStatus.MATCHED,
                MobilityRideStatus.SEARCHING,
              ],
            },
            driverId: null,
            vehicleId: null,
          },
          data: {
            driverId: input.driverId,
            vehicleId: input.vehicleId,
            status: nextStatus,
            driverAssignedAt: new Date(),
          },
        });

        if (claimed.count !== 1) {
          throw new MobilityDomainError(
            "This ride has already been claimed or is no longer available.",
            "RIDE_ALREADY_CLAIMED"
          );
        }

        // Keep dispatch candidate selection in sync with the atomic ride claim.
        // A BUSY driver should not continue appearing as AVAILABLE to dispatch.
        const availabilityClaimed =
          await tx.mobilityDriverAvailability.updateMany({
            where: {
              driverId: input.driverId,
              status: {
                in: [
                  MobilityAvailabilityStatus.AVAILABLE,
                  MobilityAvailabilityStatus.BUSY,
                ],
              },
            },
            data: {
              status: MobilityAvailabilityStatus.BUSY,
            },
          });

        if (availabilityClaimed.count !== 1) {
          throw new MobilityDomainError(
            "Driver availability changed before assignment could be claimed.",
            "DRIVER_AVAILABILITY_CHANGED"
          );
        }

        return tx.mobilityRide.findUniqueOrThrow({
          where: {
            id: input.rideId,
          },
          include: {
            stops: {
              orderBy: {
                sequence: "asc",
              },
            },
          },
        });
      }
    );
  }

  async markDriverArriving(
    rideId: string
  ) {
    return this.transition(
      rideId,
      MobilityRideStatus.DRIVER_ARRIVING
    );
  }

  async markDriverArrived(
    rideId: string
  ) {
    return this.transition(
      rideId,
      MobilityRideStatus.DRIVER_ARRIVED,
      {
        driverArrivedAt:
          new Date(),
      }
    );
  }

  async startTrip(
    rideId: string
  ) {
    const ride =
      await this.requireRide(rideId);

    if (
      !ride.driverId ||
      !ride.vehicleId
    ) {
      throw new MobilityDomainError(
        "A driver and vehicle are required before starting a trip.",
        "RIDE_DRIVER_VEHICLE_REQUIRED"
      );
    }

    return this.transition(
      rideId,
      MobilityRideStatus.TRIP_STARTED,
      {
        startedAt: new Date(),
      }
    );
  }

  async startTripWithVerification(
    rideId: string,
    verificationCode: string
  ) {
    const ride =
      await this.requireRide(rideId);

    const normalizedCode =
      verificationCode.trim();

    if (
      !/^[0-9]{4,8}$/.test(
        normalizedCode
      )
    ) {
      throw new MobilityDomainError(
        "Invalid trip verification code.",
        "INVALID_TRIP_VERIFICATION_CODE"
      );
    }

    /*
     * The persistent PIN/verification subsystem
     * will be connected in the Mobility Safety layer.
     *
     * This method intentionally does not pretend
     * that a client-supplied PIN alone is secure.
     */
    void ride;

    throw new MobilityDomainError(
      "Trip verification is not yet connected to the secure verification subsystem.",
      "TRIP_VERIFICATION_NOT_CONFIGURED"
    );
  }

  async beginTripProgress(
    rideId: string
  ) {
    return this.transition(
      rideId,
      MobilityRideStatus.TRIP_IN_PROGRESS
    );
  }

  async complete(
    rideId: string
  ) {
    return this.transition(
      rideId,
      MobilityRideStatus.TRIP_COMPLETED,
      {
        completedAt: new Date(),
      }
    );
  }

  async cancel(
    rideId: string,
    reason: string
  ) {
    const normalizedReason =
      reason.trim();

    if (!normalizedReason) {
      throw new MobilityDomainError(
        "Ride cancellation reason is required.",
        "RIDE_CANCELLATION_REASON_REQUIRED"
      );
    }

    return this.transition(
      rideId,
      MobilityRideStatus.CANCELLED,
      {
        cancelledAt: new Date(),
        cancellationReason:
          normalizedReason,
      }
    );
  }

  async markNoDriverFound(
    rideId: string
  ) {
    return this.transition(
      rideId,
      MobilityRideStatus.NO_DRIVER_FOUND
    );
  }

  async expire(
    rideId: string
  ) {
    return this.transition(
      rideId,
      MobilityRideStatus.EXPIRED
    );
  }

  async fail(
    rideId: string,
    reason: string
  ) {
    const normalizedReason =
      reason.trim();

    if (!normalizedReason) {
      throw new MobilityDomainError(
        "Ride failure reason is required.",
        "RIDE_FAILURE_REASON_REQUIRED"
      );
    }

    const ride =
      await this.requireRide(rideId);

    const metadata =
      this.mergeMetadata(
        ride.metadata,
        {
          failureReason:
            normalizedReason,
        }
      );

    return this.transition(
      rideId,
      MobilityRideStatus.FAILED,
      {
        metadata,
      }
    );
  }

  async getById(
    rideId: string
  ) {
    return prisma.mobilityRide.findUnique(
      {
        where: {
          id: rideId,
        },

        include: {
          rider: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },

          driver: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  profile: { select: { avatarUrl: true } },
                },
              },
              availability: true,
              location: true,
            },
          },

          vehicle: true,

          stops: {
            orderBy: {
              sequence: "asc",
            },
          },
        },
      }
    );
  }

  async getActiveRideForRider(
    riderId: string,
    organizationId: string
  ) {
    return prisma.mobilityRide.findFirst(
      {
        where: {
          riderId,
          organizationId,
          status: {
            in: [
              MobilityRideStatus.REQUESTED,
              MobilityRideStatus.SEARCHING,
              MobilityRideStatus.MATCHED,
              MobilityRideStatus.DRIVER_ASSIGNED,
              MobilityRideStatus.DRIVER_ARRIVING,
              MobilityRideStatus.DRIVER_ARRIVED,
              MobilityRideStatus.TRIP_STARTED,
              MobilityRideStatus.TRIP_IN_PROGRESS,
            ],
          },
        },

        orderBy: {
          requestedAt: "desc",
        },

        include: {
          driver: {
            include: {
              user: { select: { id: true, name: true, profile: { select: { avatarUrl: true } } } },
              location: true,
            },
          },

          vehicle: true,

          stops: {
            orderBy: {
              sequence: "asc",
            },
          },
        },
      }
    );
  }

  private async requireRide(
    rideId: string
  ) {
    const ride =
      await prisma.mobilityRide.findUnique({
        where: {
          id: rideId,
        },
      });

    if (!ride) {
      throw new MobilityDomainError(
        `Mobility ride ${rideId} was not found.`,
        "RIDE_NOT_FOUND"
      );
    }

    return ride;
  }

  private async transition(
    rideId: string,
    nextStatus: MobilityRideStatus,
    additionalData?: Prisma.MobilityRideUpdateInput
  ) {
    return prisma.$transaction(
      async (tx) => {
        const ride =
          await tx.mobilityRide.findUnique({
            where: {
              id: rideId,
            },
          });

        if (!ride) {
          throw new MobilityDomainError(
            `Mobility ride ${rideId} was not found.`,
            "RIDE_NOT_FOUND"
          );
        }

        if (
          isTerminalRideStatus(
            ride.status
          ) &&
          ride.status !==
            MobilityRideStatus.DISPUTED
        ) {
          throw new MobilityDomainError(
            `Ride ${rideId} is already terminal in status ${ride.status}.`,
            "RIDE_ALREADY_TERMINAL"
          );
        }

        transitionRideStatus(
          ride.status,
          nextStatus
        );

        if (ride.driverId) {
          // Serialize lifecycle updates for this driver with assignment claims.
          // Otherwise two concurrent completions could both read stale active
          // ride sets and overwrite the driver's final availability.
          await tx.$queryRaw`
            SELECT "id"
            FROM "MobilityDriver"
            WHERE "id" = ${ride.driverId}
            FOR UPDATE
          `;

          // Availability is derived from every other active assignment, not
          // only this ride. Completing one ride must not mark a driver free
          // while another assigned or in-progress ride still exists.
          const activeRideStatuses = [
            MobilityRideStatus.DRIVER_ASSIGNED,
            MobilityRideStatus.DRIVER_ARRIVING,
            MobilityRideStatus.DRIVER_ARRIVED,
            MobilityRideStatus.TRIP_STARTED,
            MobilityRideStatus.TRIP_IN_PROGRESS,
          ] as const;

          const otherActiveRides = await tx.mobilityRide.findMany({
            where: {
              driverId: ride.driverId,
              id: { not: rideId },
              status: { in: [...activeRideStatuses] },
            },
            select: { status: true },
          });

          // A driver may hold a second compatible assignment, but may only
          // carry one active passenger trip at a time. The driver-row lock
          // above serializes simultaneous start attempts across both rides.
          if (
            nextStatus === MobilityRideStatus.TRIP_STARTED &&
            otherActiveRides.some(
              (activeRide) =>
                activeRide.status === MobilityRideStatus.TRIP_STARTED ||
                activeRide.status === MobilityRideStatus.TRIP_IN_PROGRESS,
            )
          ) {
            throw new MobilityDomainError(
              "Complete the current passenger trip before starting the next assigned ride.",
              "DRIVER_ALREADY_ON_ACTIVE_TRIP",
            );
          }

          const nextDriverAvailability =
            resolveDriverAvailabilityForActiveRides([
              ...otherActiveRides.map((activeRide) => activeRide.status),
              ...(activeRideStatuses.includes(
                nextStatus as (typeof activeRideStatuses)[number],
              )
                ? [nextStatus]
                : []),
            ]);

          await tx.mobilityDriverAvailability.updateMany({
            where: {
              driverId: ride.driverId,
              status: {
                in: [
                  MobilityAvailabilityStatus.AVAILABLE,
                  MobilityAvailabilityStatus.BUSY,
                  MobilityAvailabilityStatus.ON_TRIP,
                ],
              },
            },
            data: {
              status: nextDriverAvailability,
            },
          });
        }

        // Compare-and-set prevents concurrent transitions from both
        // succeeding after they read the same previous status. Availability
        // changes above share this transaction and roll back on a lost claim.
        const transitioned = await tx.mobilityRide.updateMany({
          where: {
            id: rideId,
            status: ride.status,
          },
          data: {
            status: nextStatus,
            ...additionalData,
          },
        });

        if (transitioned.count !== 1) {
          throw new MobilityDomainError(
            "Ride state changed concurrently; reload before retrying.",
            "RIDE_STATE_CONFLICT"
          );
        }

        return tx.mobilityRide.findUniqueOrThrow({
          where: {
            id: rideId,
          },
          include: {
            stops: {
              orderBy: {
                sequence: "asc",
              },
            },
          },
        });
      }
    );
  }

  private mergeMetadata(
    metadata:
      | Prisma.JsonValue
      | null,
    additional:
      Record<string, unknown>
  ): Prisma.InputJsonValue {
    const current =
      metadata &&
      typeof metadata === "object" &&
      !Array.isArray(metadata)
        ? metadata
        : {};

    return {
      ...(current as Record<
        string,
        unknown
      >),
      ...additional,
    } as Prisma.InputJsonValue;
  }

  private async generateReference(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const reference =
        `MR-${new Date()
          .toISOString()
          .replace(
            /[-:.TZ]/g,
            ""
          )
          .slice(0, 14)}-${Math.random()
          .toString(36)
          .slice(2, 8)
          .toUpperCase()}`;

      const existing =
        await prisma.mobilityRide.findUnique(
          {
            where: {
              reference,
            },
            select: {
              id: true,
            },
          }
        );

      if (!existing) {
        return reference;
      }
    }

    throw new MobilityDomainError(
      "Unable to generate a unique mobility ride reference.",
      "RIDE_REFERENCE_GENERATION_FAILED"
    );
  }

  private validateCreateInput(
    input: CreateMobilityRideInput
  ): void {
    if (
      !input.organizationId.trim()
    ) {
      throw new MobilityDomainError(
        "Ride organizationId is required.",
        "RIDE_ORGANIZATION_REQUIRED"
      );
    }

    if (!input.riderId.trim()) {
      throw new MobilityDomainError(
        "Ride riderId is required.",
        "RIDE_RIDER_REQUIRED"
      );
    }

    if (!input.serviceType.trim()) {
      throw new MobilityDomainError(
        "Ride serviceType is required.",
        "RIDE_SERVICE_TYPE_REQUIRED"
      );
    }

    this.validateCoordinate(
      input.pickupLatitude,
      input.pickupLongitude,
      "pickup"
    );

    this.validateCoordinate(
      input.dropoffLatitude,
      input.dropoffLongitude,
      "dropoff"
    );

    const currency =
      input.currency ?? "AOA";

    if (
      !/^[A-Z]{3}$/.test(currency)
    ) {
      throw new MobilityDomainError(
        "Ride currency must be a valid ISO 4217 code.",
        "INVALID_RIDE_CURRENCY"
      );
    }

    if (input.stops) {
      const sequences =
        new Set<number>();

      for (const stop of input.stops) {
        if (
          !Number.isInteger(
            stop.sequence
          ) ||
          stop.sequence < 0
        ) {
          throw new MobilityDomainError(
            "Ride stop sequence must be a non-negative integer.",
            "INVALID_RIDE_STOP_SEQUENCE"
          );
        }

        if (
          sequences.has(
            stop.sequence
          )
        ) {
          throw new MobilityDomainError(
            "Ride stop sequences must be unique.",
            "DUPLICATE_RIDE_STOP_SEQUENCE"
          );
        }

        sequences.add(
          stop.sequence
        );

        this.validateCoordinate(
          stop.latitude,
          stop.longitude,
          "stop"
        );
      }
    }
  }

  private validateCoordinate(
    latitude: number,
    longitude: number,
    label: string
  ): void {
    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90
    ) {
      throw new MobilityDomainError(
        `Invalid ${label} latitude.`,
        "INVALID_RIDE_LATITUDE"
      );
    }

    if (
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new MobilityDomainError(
        `Invalid ${label} longitude.`,
        "INVALID_RIDE_LONGITUDE"
      );
    }
  }
}

export const mobilityRideService =
  new MobilityRideService();


function withEstimatedFare(
  metadata: Prisma.InputJsonValue | undefined,
  amountMinor: bigint | undefined,
): Prisma.InputJsonValue | undefined {
  if (amountMinor === undefined) return metadata;
  const base = metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? metadata as Prisma.InputJsonObject
    : {};
  return { ...base, estimatedFareMinor: amountMinor.toString() };
}

function normalizeIdempotencyValue(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(normalizeIdempotencyValue);
  const source = value as Record<string, unknown>;
  return Object.keys(source).sort().reduce<Record<string, unknown>>((result, key) => {
    result[key] = normalizeIdempotencyValue(source[key]);
    return result;
  }, {});
}
