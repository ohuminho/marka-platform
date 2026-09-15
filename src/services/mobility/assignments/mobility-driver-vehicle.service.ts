// FILE: /workspaces/marka-platform/src/services/mobility/assignments/mobility-driver-vehicle.service.ts

import { prisma } from "@/database/client/prisma";
import { MobilityDomainError } from "@/services/mobility/errors/mobility-domain.error";
import {
  validateAssignmentEligibility,
  validatePrimaryEligibility,
} from "@/services/mobility/assignments/mobility-driver-vehicle.rules";

export class MobilityDriverVehicleService {
  async listByDriver(driverId: string) {
    return prisma.mobilityDriverVehicle.findMany({
      where: {
        driverId,
      },
      include: {
        vehicle: true,
      },
      orderBy: [
        {
          isPrimary: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
    });
  }

  async listByVehicle(vehicleId: string) {
    return prisma.mobilityDriverVehicle.findMany({
      where: {
        vehicleId,
      },
      include: {
        driver: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async getPrimaryVehicle(driverId: string) {
    return prisma.mobilityDriverVehicle.findFirst({
      where: {
        driverId,
        isPrimary: true,
        activeUntil: null,
      },
      include: {
        vehicle: true,
      },
    });
  }

  async assign(
    driverId: string,
    vehicleId: string,
    options?: {
      isPrimary?: boolean;
    }
  ) {
    const driver = await prisma.mobilityDriver.findUnique({
      where: {
        id: driverId,
      },
      select: {
        id: true,
        organizationId: true,
        status: true,
      },
    });

    if (!driver) {
      throw new MobilityDomainError(
        `Mobility driver ${driverId} was not found.`,
        "DRIVER_NOT_FOUND"
      );
    }

    const vehicle = await prisma.mobilityVehicle.findUnique({
      where: {
        id: vehicleId,
      },
      select: {
        id: true,
        organizationId: true,
        status: true,
      },
    });

    if (!vehicle) {
      throw new MobilityDomainError(
        `Mobility vehicle ${vehicleId} was not found.`,
        "VEHICLE_NOT_FOUND"
      );
    }

    if (driver.organizationId !== vehicle.organizationId) {
      throw new MobilityDomainError(
        "Driver and vehicle must belong to the same organization.",
        "DRIVER_VEHICLE_ORGANIZATION_MISMATCH"
      );
    }

    validateAssignmentEligibility(
      driver.status,
      vehicle.status
    );

    const existingAssignment =
      await prisma.mobilityDriverVehicle.findUnique({
        where: {
          driverId_vehicleId: {
            driverId,
            vehicleId,
          },
        },
      });

    if (existingAssignment) {
      if (existingAssignment.activeUntil === null) {
        throw new MobilityDomainError(
          "Driver is already assigned to this vehicle.",
          "DRIVER_VEHICLE_ALREADY_ASSIGNED"
        );
      }

      throw new MobilityDomainError(
        "This driver-vehicle relationship already exists in historical records and cannot be recreated.",
        "DRIVER_VEHICLE_HISTORICAL_ASSIGNMENT_EXISTS"
      );
    }

    const isPrimary = options?.isPrimary ?? false;

    if (isPrimary) {
      validatePrimaryEligibility(
        driver.status,
        vehicle.status
      );
    }

    return prisma.$transaction(async (tx) => {
      if (isPrimary) {
        await tx.mobilityDriverVehicle.updateMany({
          where: {
            driverId,
            isPrimary: true,
            activeUntil: null,
          },
          data: {
            isPrimary: false,
          },
        });
      }

      return tx.mobilityDriverVehicle.create({
        data: {
          driverId,
          vehicleId,
          isPrimary,
          activeFrom: new Date(),
          activeUntil: null,
        },
        include: {
          driver: true,
          vehicle: true,
        },
      });
    });
  }

  async setPrimary(
    driverId: string,
    vehicleId: string
  ) {
    const assignment =
      await prisma.mobilityDriverVehicle.findUnique({
        where: {
          driverId_vehicleId: {
            driverId,
            vehicleId,
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
      });

    if (!assignment) {
      throw new MobilityDomainError(
        "Driver is not assigned to this vehicle.",
        "DRIVER_VEHICLE_ASSIGNMENT_NOT_FOUND"
      );
    }

    if (assignment.activeUntil !== null) {
      throw new MobilityDomainError(
        "An inactive historical assignment cannot become the primary vehicle.",
        "INACTIVE_DRIVER_VEHICLE_ASSIGNMENT"
      );
    }

    if (
      assignment.driver.organizationId !==
      assignment.vehicle.organizationId
    ) {
      throw new MobilityDomainError(
        "Driver and vehicle must belong to the same organization.",
        "DRIVER_VEHICLE_ORGANIZATION_MISMATCH"
      );
    }

    validatePrimaryEligibility(
      assignment.driver.status,
      assignment.vehicle.status
    );

    if (assignment.isPrimary) {
      throw new MobilityDomainError(
        "Vehicle is already the driver's primary vehicle.",
        "DRIVER_VEHICLE_ALREADY_PRIMARY"
      );
    }

    return prisma.$transaction(async (tx) => {
      await tx.mobilityDriverVehicle.updateMany({
        where: {
          driverId,
          isPrimary: true,
          activeUntil: null,
        },
        data: {
          isPrimary: false,
        },
      });

      return tx.mobilityDriverVehicle.update({
        where: {
          driverId_vehicleId: {
            driverId,
            vehicleId,
          },
        },
        data: {
          isPrimary: true,
        },
        include: {
          driver: true,
          vehicle: true,
        },
      });
    });
  }

  async unassign(
    driverId: string,
    vehicleId: string
  ) {
    const assignment =
      await prisma.mobilityDriverVehicle.findUnique({
        where: {
          driverId_vehicleId: {
            driverId,
            vehicleId,
          },
        },
      });

    if (!assignment) {
      throw new MobilityDomainError(
        "Driver is not assigned to this vehicle.",
        "DRIVER_VEHICLE_ASSIGNMENT_NOT_FOUND"
      );
    }

    if (assignment.activeUntil !== null) {
      throw new MobilityDomainError(
        "Driver is already unassigned from this vehicle.",
        "DRIVER_VEHICLE_ALREADY_UNASSIGNED"
      );
    }

    return prisma.mobilityDriverVehicle.update({
      where: {
        driverId_vehicleId: {
          driverId,
          vehicleId,
        },
      },
      data: {
        isPrimary: false,
        activeUntil: new Date(),
      },
    });
  }
}
