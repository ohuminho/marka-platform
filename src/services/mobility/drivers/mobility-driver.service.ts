import {
  MobilityDriverStatus,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/database/client/prisma";
import {
  transitionDriverStatus,
} from "@/services/mobility/drivers/mobility-driver.state-machine";
import { MobilityDomainError } from "@/services/mobility/errors/mobility-domain.error";

export class MobilityDriverService {
  async getById(driverId: string) {
    return prisma.mobilityDriver.findUnique({
      where: {
        id: driverId,
      },
      include: {
        user: true,
        organization: true,
        verifications: {
          orderBy: {
            createdAt: "desc",
          },
        },
        vehicles: {
          include: {
            vehicle: true,
          },
        },
        availability: true,
        location: true,
      },
    });
  }

  async listByOrganization(organizationId: string) {
    return prisma.mobilityDriver.findMany({
      where: {
        organizationId,
      },
      include: {
        user: true,
        vehicles: {
          include: {
            vehicle: true,
          },
        },
        availability: true,
        location: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async create(input: {
    organizationId: string;
    userId: string;
    licenseNumber?: string;
    countryCode?: string;
    displayName?: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    return prisma.mobilityDriver.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId,
        licenseNumber: input.licenseNumber,
        countryCode: input.countryCode,
        displayName: input.displayName,
        metadata: input.metadata,
        status: MobilityDriverStatus.PENDING,
      },
    });
  }

  async activate(driverId: string) {
    return this.transitionStatus(
      driverId,
      MobilityDriverStatus.ACTIVE
    );
  }

  async suspend(driverId: string) {
    return this.transitionStatus(
      driverId,
      MobilityDriverStatus.SUSPENDED
    );
  }

  async block(driverId: string) {
    return this.transitionStatus(
      driverId,
      MobilityDriverStatus.BLOCKED
    );
  }

  async deactivate(driverId: string) {
    return this.transitionStatus(
      driverId,
      MobilityDriverStatus.INACTIVE
    );
  }

  private async transitionStatus(
    driverId: string,
    nextStatus: MobilityDriverStatus
  ) {
    const driver = await prisma.mobilityDriver.findUnique({
      where: {
        id: driverId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!driver) {
      throw new MobilityDomainError(
        `Mobility driver ${driverId} was not found.`,
        "DRIVER_NOT_FOUND"
      );
    }

    const currentStatus = driver.status;

    transitionDriverStatus(
      currentStatus,
      nextStatus
    );

    const result = await prisma.mobilityDriver.updateMany({
      where: {
        id: driverId,
        status: currentStatus,
      },
      data: {
        status: nextStatus,
      },
    });

    if (result.count !== 1) {
      throw new MobilityDomainError(
        `Driver ${driverId} status changed concurrently. The requested transition was not applied.`,
        "DRIVER_STATUS_CONCURRENT_MODIFICATION"
      );
    }

    return prisma.mobilityDriver.findUnique({
      where: {
        id: driverId,
      },
    });
  }
}
