import {
  MobilityRideStatus,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/database/client/prisma";

import {
  isTerminalRideStatus,
  transitionRideStatus,
} from "@/services/mobility/rides/mobility-ride.state-machine";

import { MobilityDomainError } from "@/services/mobility/errors/mobility-domain.error";

import {
  MobilityMatchCandidate,
  MobilityMatchingService,
} from "@/services/mobility/matching/mobility-matching.service";

export interface CreateMobilityRideInput {
  organizationId: string;
  riderId: string;

  serviceType: string;

  currency?: string;

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

              metadata:
                input.metadata,

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

        serviceType:
          ride.serviceType,

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

        const nextStatus =
          MobilityRideStatus.DRIVER_ASSIGNED;

        transitionRideStatus(
          current.status,
          nextStatus
        );

        return tx.mobilityRide.update({
          where: {
            id: input.rideId,
          },

          data: {
            driverId:
              input.driverId,
            vehicleId:
              input.vehicleId,
            status: nextStatus,
            driverAssignedAt:
              new Date(),
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
    riderId: string
  ) {
    return prisma.mobilityRide.findFirst(
      {
        where: {
          riderId,
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

        return tx.mobilityRide.update({
          where: {
            id: rideId,
          },

          data: {
            status: nextStatus,
            ...additionalData,
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
