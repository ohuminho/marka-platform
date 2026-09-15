// FILE: /workspaces/marka-platform/src/services/mobility/vehicles/mobility-vehicle.service.ts

import {
  MobilityVehicleStatus,
  MobilityVehicleType,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/database/client/prisma";
import { transitionVehicleStatus } from "@/services/mobility/vehicles/mobility-vehicle.state-machine";
import { MobilityDomainError } from "@/services/mobility/errors/mobility-domain.error";

export class MobilityVehicleService {
  async getById(vehicleId: string) {
    return prisma.mobilityVehicle.findUnique({
      where: {
        id: vehicleId,
      },
      include: {
        organization: true,
        drivers: {
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
        },
        verifications: {
          orderBy: {
            createdAt: "desc",
          },
        },
        currentLocation: true,
      },
    });
  }

  async listByOrganization(organizationId: string) {
    return prisma.mobilityVehicle.findMany({
      where: {
        organizationId,
      },
      include: {
        drivers: {
          include: {
            driver: true,
          },
        },
        verifications: {
          orderBy: {
            createdAt: "desc",
          },
        },
        currentLocation: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async create(input: {
    organizationId: string;
    type: MobilityVehicleType;
    registrationNumber?: string;
    make?: string;
    model?: string;
    year?: number;
    color?: string;
    capacity?: number;
    countryCode?: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    this.validateVehicleInput(input);

    return prisma.mobilityVehicle.create({
      data: {
        organizationId: input.organizationId,
        type: input.type,
        registrationNumber: this.normalizeOptionalString(
          input.registrationNumber
        ),
        make: this.normalizeOptionalString(input.make),
        model: this.normalizeOptionalString(input.model),
        year: input.year,
        color: this.normalizeOptionalString(input.color),
        capacity: input.capacity,
        countryCode: this.normalizeCountryCode(input.countryCode),
        metadata: input.metadata,
        status: MobilityVehicleStatus.PENDING,
      },
    });
  }

  async activate(vehicleId: string) {
    return this.transitionStatus(
      vehicleId,
      MobilityVehicleStatus.ACTIVE
    );
  }

  async suspend(vehicleId: string) {
    return this.transitionStatus(
      vehicleId,
      MobilityVehicleStatus.SUSPENDED
    );
  }

  async block(vehicleId: string) {
    return this.transitionStatus(
      vehicleId,
      MobilityVehicleStatus.BLOCKED
    );
  }

  async retire(vehicleId: string) {
    return this.transitionStatus(
      vehicleId,
      MobilityVehicleStatus.RETIRED
    );
  }

  private async transitionStatus(
    vehicleId: string,
    nextStatus: MobilityVehicleStatus
  ) {
    const vehicle = await prisma.mobilityVehicle.findUnique({
      where: {
        id: vehicleId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!vehicle) {
      throw new MobilityDomainError(
        `Mobility vehicle ${vehicleId} was not found.`,
        "VEHICLE_NOT_FOUND"
      );
    }

    const currentStatus = vehicle.status;

    transitionVehicleStatus(
      currentStatus,
      nextStatus
    );

    const result = await prisma.mobilityVehicle.updateMany({
      where: {
        id: vehicleId,
        status: currentStatus,
      },
      data: {
        status: nextStatus,
      },
    });

    if (result.count !== 1) {
      throw new MobilityDomainError(
        `Vehicle ${vehicleId} status changed concurrently. The requested transition was not applied.`,
        "VEHICLE_STATUS_CONCURRENT_MODIFICATION"
      );
    }

    return prisma.mobilityVehicle.findUnique({
      where: {
        id: vehicleId,
      },
    });
  }

  private validateVehicleInput(input: {
    organizationId: string;
    type: MobilityVehicleType;
    registrationNumber?: string;
    make?: string;
    model?: string;
    year?: number;
    color?: string;
    capacity?: number;
    countryCode?: string;
  }) {
    if (!input.organizationId.trim()) {
      throw new MobilityDomainError(
        "Vehicle organizationId is required.",
        "VEHICLE_ORGANIZATION_REQUIRED"
      );
    }

    if (input.year !== undefined) {
      const currentYear = new Date().getUTCFullYear();

      if (
        !Number.isInteger(input.year) ||
        input.year < 1886 ||
        input.year > currentYear + 1
      ) {
        throw new MobilityDomainError(
          "Vehicle year is invalid.",
          "INVALID_VEHICLE_YEAR"
        );
      }
    }

    if (input.capacity !== undefined) {
      if (
        !Number.isInteger(input.capacity) ||
        input.capacity <= 0
      ) {
        throw new MobilityDomainError(
          "Vehicle capacity must be a positive integer.",
          "INVALID_VEHICLE_CAPACITY"
        );
      }
    }

    if (input.countryCode !== undefined) {
      const normalizedCountryCode = input.countryCode
        .trim()
        .toUpperCase();

      if (!/^[A-Z]{2}$/.test(normalizedCountryCode)) {
        throw new MobilityDomainError(
          "Vehicle countryCode must be a valid ISO-style two-letter country code.",
          "INVALID_VEHICLE_COUNTRY_CODE"
        );
      }
    }
  }

  private normalizeOptionalString(
    value?: string
  ): string | undefined {
    const normalized = value?.trim();

    return normalized ? normalized : undefined;
  }

  private normalizeCountryCode(
    value?: string
  ): string | undefined {
    const normalized = value
      ?.trim()
      .toUpperCase();

    return normalized || undefined;
  }
}
