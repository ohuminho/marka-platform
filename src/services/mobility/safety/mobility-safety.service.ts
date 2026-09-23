import {
  randomBytes,
  createHash,
  randomUUID,
} from "node:crypto";

import { Prisma } from "@prisma/client";

import { prisma } from "@/database/client/prisma";
import {
  MobilityDomainError,
} from "@/services/mobility/errors/mobility-domain.error";

import type {
  CreateTripSafetyInput,
  CreateTripShareInput,
  CreateTrustedContactInput,
  DriverSafetyEligibility,
  EvaluateDriverSafetyInput,
  MobilitySafetyIncident,
  MobilityTripSafetyRecord,
  ReportSafetyIncidentInput,
  StartAudioSafetyInput,
  StopAudioSafetyInput,
  TripShareResult,
  VerifyTripPinInput,
} from "./mobility-safety.contracts";

const STANDARD_MAX_RISK_SCORE = 69;
const TRUSTED_MAX_RISK_SCORE = 39;
const CHILD_MAX_RISK_SCORE = 24;

const HIGH_SEVERITY_LIMIT_FOR_CHILD = 0;

const ACTIVE_RIDE_STATUSES = [
  "REQUESTED",
  "SEARCHING",
  "MATCHED",
  "DRIVER_ASSIGNED",
  "DRIVER_ARRIVING",
  "DRIVER_ARRIVED",
  "TRIP_STARTED",
  "TRIP_IN_PROGRESS",
] as const;

const CHILD_ALLOWED_VEHICLE_TYPES = [
  "CAR",
  "VAN",
  "MINIBUS",
  "BUS",
  "COACH",
];

export class MobilitySafetyService {
  async evaluateDriverSafety(
    input: EvaluateDriverSafetyInput
  ): Promise<DriverSafetyEligibility> {
    this.requireId(
      input.organizationId,
      "organizationId"
    );

    this.requireId(
      input.driverId,
      "driverId"
    );

    const driver =
      await prisma.mobilityDriver.findUnique({
        where: {
          id: input.driverId,
        },

        include: {
          user: {
            select: {
              id: true,
              status: true,
              emailVerifiedAt: true,
              phoneVerifiedAt: true,
            },
          },

          verifications: {
            orderBy: {
              createdAt: "desc",
            },
          },

          vehicles: {
            where: {
              activeUntil: null,
            },

            include: {
              vehicle: {
                include: {
                  verifications: {
                    orderBy: {
                      createdAt: "desc",
                    },
                  },
                },
              },
            },
          },
        },
      });

    if (!driver) {
      throw new MobilityDomainError(
        "Mobility driver was not found.",
        "MOBILITY_DRIVER_NOT_FOUND"
      );
    }

    if (
      driver.organizationId !==
      input.organizationId
    ) {
      throw new MobilityDomainError(
        "Driver does not belong to the requested organization.",
        "MOBILITY_DRIVER_ORGANIZATION_MISMATCH"
      );
    }

    const latestDriverVerifications =
      this.latestVerificationByDocument(
        driver.verifications
      );

    const identityVerified =
      driver.user.emailVerifiedAt !== null &&
      driver.user.phoneVerifiedAt !== null;

    const driverDocumentsVerified =
      latestDriverVerifications.length > 0 &&
      latestDriverVerifications.every(
        (verification) =>
          verification.status ===
            "VERIFIED" &&
          !this.isExpired(
            verification.documentExpiry
          )
      );

    let selectedVehicle =
      input.vehicleId
        ? driver.vehicles.find(
            (assignment) =>
              assignment.vehicleId ===
              input.vehicleId
          )?.vehicle
        : driver.vehicles.find(
            (assignment) =>
              assignment.isPrimary
          )?.vehicle;

    if (
      !selectedVehicle &&
      driver.vehicles.length === 1
    ) {
      selectedVehicle =
        driver.vehicles[0]?.vehicle;
    }

    const vehicleVerified =
      selectedVehicle
        ? this.isVehicleVerified(
            selectedVehicle.verifications
          )
        : false;

    const incidentStats =
      await this.getDriverIncidentStats(
        input.driverId
      );

    const completedTrips =
      await prisma.mobilityRide.count({
        where: {
          driverId: input.driverId,
          status: "TRIP_COMPLETED",
        },
      });

    const riskScore =
      await this.calculateRiskScore({
        driverStatus: driver.status,
        userStatus: driver.user.status,
        identityVerified,
        driverDocumentsVerified,
        vehicleVerified,
        completedTrips,
        incidentCount:
          incidentStats.incidentCount,
        highSeverityIncidentCount:
          incidentStats.highSeverityIncidentCount,
      });

    const reasons: string[] = [];

    if (
      !identityVerified
    ) {
      reasons.push(
        "Driver identity verification is incomplete."
      );
    }

    if (
      !driverDocumentsVerified
    ) {
      reasons.push(
        "Driver documentation is not fully verified."
      );
    }

    if (
      !vehicleVerified
    ) {
      reasons.push(
        "Assigned vehicle is not fully verified."
      );
    }

    if (
      driver.status !== "ACTIVE"
    ) {
      reasons.push(
        `Driver status is ${driver.status}.`
      );
    }

    if (
      driver.user.status !== "ACTIVE"
    ) {
      reasons.push(
        `Driver account status is ${driver.user.status}.`
      );
    }

    if (
      incidentStats.highSeverityIncidentCount >
      0
    ) {
      reasons.push(
        "Driver has unresolved or recorded high-severity safety incidents."
      );
    }

    if (
      riskScore > STANDARD_MAX_RISK_SCORE
    ) {
      reasons.push(
        "Driver risk score exceeds the standard mobility threshold."
      );
    }

    const eligibleForStandardRides =
      driver.status === "ACTIVE" &&
      driver.user.status === "ACTIVE" &&
      identityVerified &&
      driverDocumentsVerified &&
      vehicleVerified &&
      riskScore <=
        STANDARD_MAX_RISK_SCORE;

    const eligibleForTrustedRides =
      eligibleForStandardRides &&
      riskScore <= TRUSTED_MAX_RISK_SCORE &&
      incidentStats.highSeverityIncidentCount ===
        0;

    const eligibleForChildRides =
      eligibleForTrustedRides &&
      riskScore <= CHILD_MAX_RISK_SCORE &&
      incidentStats.highSeverityIncidentCount ===
        HIGH_SEVERITY_LIMIT_FOR_CHILD &&
      Boolean(selectedVehicle) &&
      CHILD_ALLOWED_VEHICLE_TYPES.includes(
        selectedVehicle!.type
      );

    let status:
      | "PENDING"
      | "ELIGIBLE"
      | "RESTRICTED"
      | "SUSPENDED"
      | "BLOCKED";

    if (
      driver.status === "BLOCKED" ||
      driver.user.status === "LOCKED"
    ) {
      status = "BLOCKED";
    } else if (
      driver.status === "SUSPENDED" ||
      driver.user.status === "SUSPENDED"
    ) {
      status = "SUSPENDED";
    } else if (
      eligibleForStandardRides
    ) {
      status = "ELIGIBLE";
    } else {
      status = "RESTRICTED";
    }

    await this.upsertDriverSafetyProfile({
      organizationId:
        input.organizationId,
      driverId: input.driverId,
      status,
      identityVerified,
      driverDocumentsVerified,
      vehicleVerified,
      eligibleForStandardRides,
      eligibleForTrustedRides,
      eligibleForChildRides,
      riskScore,
      completedTrips,
      incidentCount:
        incidentStats.incidentCount,
      highSeverityIncidentCount:
        incidentStats.highSeverityIncidentCount,
      reasons,
    });

    await this.recordSafetyEvent({
      organizationId:
        input.organizationId,
      driverId: input.driverId,
      actorUserId:
        input.actorUserId,
      type:
        input.requireChildRide
          ? "CHILD_RIDE_REQUESTED"
          : input.requireTrustedRide
            ? "TRUSTED_RIDE_REQUESTED"
            : "DRIVER_ELIGIBILITY_CHECK",
      severity:
        input.requireChildRide &&
        !eligibleForChildRides
          ? "HIGH"
          : "INFO",
      correlationId:
        input.correlationId,
      metadata: {
        riskScore,
        eligibleForStandardRides,
        eligibleForTrustedRides,
        eligibleForChildRides,
        reasons,
      },
    });

    if (
      input.requireChildRide &&
      !eligibleForChildRides
    ) {
      throw new MobilityDomainError(
        `Driver is not eligible for child rides: ${reasons.join(
          " "
        )}`,
        "DRIVER_NOT_ELIGIBLE_FOR_CHILD_RIDE"
      );
    }

    if (
      input.requireTrustedRide &&
      !eligibleForTrustedRides
    ) {
      throw new MobilityDomainError(
        `Driver is not eligible for trusted rides: ${reasons.join(
          " "
        )}`,
        "DRIVER_NOT_ELIGIBLE_FOR_TRUSTED_RIDE"
      );
    }

    return {
      driverId:
        input.driverId,
      organizationId:
        input.organizationId,
      status,
      identityVerified,
      driverDocumentsVerified,
      vehicleVerified,
      eligibleForStandardRides,
      eligibleForTrustedRides,
      eligibleForChildRides,
      riskScore,
      completedTrips,
      incidentCount:
        incidentStats.incidentCount,
      highSeverityIncidentCount:
        incidentStats.highSeverityIncidentCount,
      reasons,
      evaluatedAt: new Date(),
    };
  }

  async createTrustedContact(
    input: CreateTrustedContactInput
  ) {
    this.requireId(
      input.userId,
      "userId"
    );

    const name =
      input.name.trim();

    const phone =
      input.phone.trim();

    if (!name) {
      throw new MobilityDomainError(
        "Trusted contact name is required.",
        "TRUSTED_CONTACT_NAME_REQUIRED"
      );
    }

    if (!phone) {
      throw new MobilityDomainError(
        "Trusted contact phone is required.",
        "TRUSTED_CONTACT_PHONE_REQUIRED"
      );
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id: input.userId,
        },
        select: {
          id: true,
          status: true,
        },
      });

    if (!user) {
      throw new MobilityDomainError(
        "User was not found.",
        "USER_NOT_FOUND"
      );
    }

    if (user.status !== "ACTIVE") {
      throw new MobilityDomainError(
        "Only active users may create trusted contacts.",
        "USER_NOT_ACTIVE"
      );
    }

    const id =
      randomUUID();

    await prisma.$executeRaw`
      INSERT INTO "MobilityTrustedContact" (
        "id",
        "userId",
        "name",
        "phone",
        "relationship",
        "status",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${id},
        ${input.userId},
        ${name},
        ${phone},
        ${input.relationship?.trim() || null},
        'ACTIVE'::"MobilityTrustedContactStatus",
        NOW(),
        NOW()
      )
    `;

    return {
      id,
      userId:
        input.userId,
      name,
      phone,
      relationship:
        input.relationship?.trim() || null,
      status: "ACTIVE",
    };
  }

  async createTripSafety(
    input: CreateTripSafetyInput
  ): Promise<MobilityTripSafetyRecord> {
    this.requireId(
      input.organizationId,
      "organizationId"
    );

    this.requireId(
      input.rideId,
      "rideId"
    );

    this.requireId(
      input.riderId,
      "riderId"
    );

    const ride =
      await prisma.mobilityRide.findUnique({
        where: {
          id: input.rideId,
        },
        select: {
          id: true,
          organizationId: true,
          riderId: true,
          driverId: true,
          vehicleId: true,
          status: true,
        },
      });

    if (!ride) {
      throw new MobilityDomainError(
        "Ride was not found.",
        "RIDE_NOT_FOUND"
      );
    }

    if (
      ride.organizationId !==
      input.organizationId
    ) {
      throw new MobilityDomainError(
        "Ride does not belong to the requested organization.",
        "RIDE_ORGANIZATION_MISMATCH"
      );
    }

    if (
      ride.riderId !==
      input.riderId
    ) {
      throw new MobilityDomainError(
        "Rider does not own this ride.",
        "RIDE_RIDER_MISMATCH"
      );
    }

    if (
      input.childRide &&
      input.mode !== "CHILD"
    ) {
      throw new MobilityDomainError(
        "Child rides must use CHILD safety mode.",
        "INVALID_CHILD_SAFETY_MODE"
      );
    }

    if (
      input.trustedRide &&
      input.mode === "STANDARD"
    ) {
      throw new MobilityDomainError(
        "Trusted rides cannot use STANDARD safety mode.",
        "INVALID_TRUSTED_SAFETY_MODE"
      );
    }

    if (
      input.childRide &&
      !ride.driverId
    ) {
      throw new MobilityDomainError(
        "A driver must be assigned before authorizing a child ride.",
        "CHILD_RIDE_DRIVER_REQUIRED"
      );
    }

    if (
      input.childRide &&
      ride.driverId
    ) {
      await this.evaluateDriverSafety({
        organizationId:
          input.organizationId,
        driverId:
          ride.driverId,
        vehicleId:
          ride.vehicleId ?? undefined,
        requireChildRide: true,
        actorUserId:
          input.actorUserId,
        correlationId:
          input.correlationId,
      });
    }

    const existing =
      await prisma.$queryRaw<
        Array<{
          id: string;
        }>
      >`
        SELECT "id"
        FROM "MobilityTripSafety"
        WHERE "rideId" = ${input.rideId}
        LIMIT 1
      `;

    if (existing.length > 0) {
      const record =
        await this.getTripSafety(
          input.rideId
        );

      if (!record) {
        throw new MobilityDomainError(
          "Trip safety record could not be loaded.",
          "TRIP_SAFETY_LOAD_FAILED"
        );
      }

      return record;
    }

    const id =
      randomUUID();

    const pinRequired =
      input.pinRequired ??
      input.childRide ??
      input.trustedRide ??
      false;

    const audioSafetyEnabled =
      input.audioSafetyEnabled ??
      input.childRide ??
      false;

    await prisma.$executeRaw`
      INSERT INTO "MobilityTripSafety" (
        "id",
        "rideId",
        "riderId",
        "driverId",
        "mode",
        "childRide",
        "trustedRide",
        "pinRequired",
        "pinVerified",
        "audioSafetyEnabled",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${id},
        ${input.rideId},
        ${input.riderId},
        ${ride.driverId},
        ${input.mode}::"MobilityTripSafetyMode",
        ${Boolean(input.childRide)},
        ${Boolean(input.trustedRide)},
        ${pinRequired},
        false,
        ${audioSafetyEnabled},
        NOW(),
        NOW()
      )
    `;

    await this.recordSafetyEvent({
      organizationId:
        input.organizationId,
      rideId:
        input.rideId,
      driverId:
        ride.driverId ?? undefined,
      riderId:
        input.riderId,
      actorUserId:
        input.actorUserId,
      correlationId:
        input.correlationId,
      type:
        input.childRide
          ? "CHILD_RIDE_AUTHORIZED"
          : input.trustedRide
            ? "TRUSTED_RIDE_REQUESTED"
            : "RIDE_SAFETY_CHECK",
      severity:
        input.childRide
          ? "MEDIUM"
          : "INFO",
      metadata: {
        mode:
          input.mode,
        childRide:
          Boolean(input.childRide),
        trustedRide:
          Boolean(input.trustedRide),
        pinRequired,
        audioSafetyEnabled,
      },
    });

    const record =
      await this.getTripSafety(
        input.rideId
      );

    if (!record) {
      throw new MobilityDomainError(
        "Trip safety record could not be created.",
        "TRIP_SAFETY_CREATION_FAILED"
      );
    }

    return record;
  }

  async verifyTripPin(
    input: VerifyTripPinInput
  ): Promise<MobilityTripSafetyRecord> {
    this.requireId(
      input.rideId,
      "rideId"
    );

    const pin =
      input.pin.trim();

    if (
      !/^[0-9]{4,8}$/.test(pin)
    ) {
      throw new MobilityDomainError(
        "Trip PIN must contain between 4 and 8 digits.",
        "INVALID_TRIP_PIN"
      );
    }

    const ride =
      await prisma.mobilityRide.findUnique({
        where: {
          id: input.rideId,
        },
        select: {
          organizationId: true,
          driverId: true,
          riderId: true,
        },
      });

    if (!ride) {
      throw new MobilityDomainError(
        "Ride was not found.",
        "RIDE_NOT_FOUND"
      );
    }

    const safety =
      await this.getTripSafety(
        input.rideId
      );

    if (!safety) {
      throw new MobilityDomainError(
        "Trip safety has not been configured.",
        "TRIP_SAFETY_NOT_CONFIGURED"
      );
    }

    if (!safety.pinRequired) {
      return safety;
    }

    /*
     * The secure PIN subsystem intentionally does not
     * accept a raw client PIN as proof.
     *
     * A future PIN credential will be hashed and verified
     * against server-side state. Until then, this method
     * remains fail-closed.
     */
    await this.recordSafetyEvent({
      organizationId:
        ride.organizationId,
      rideId:
        input.rideId,
      driverId:
        ride.driverId ?? undefined,
      riderId:
        ride.riderId,
      actorUserId:
        input.actorUserId,
      correlationId:
        input.correlationId,
      type:
        "TRIP_PIN_VERIFICATION_FAILED",
      severity:
        "HIGH",
      metadata: {
        reason:
          "SECURE_PIN_CREDENTIAL_NOT_CONFIGURED",
      },
    });

    void pin;

    throw new MobilityDomainError(
      "Secure trip PIN verification is not configured.",
      "TRIP_PIN_VERIFICATION_NOT_CONFIGURED"
    );
  }

  async createTripShare(
    input: CreateTripShareInput
  ): Promise<TripShareResult> {
    this.requireId(
      input.rideId,
      "rideId"
    );

    this.requireId(
      input.ownerUserId,
      "ownerUserId"
    );

    const ride =
      await prisma.mobilityRide.findUnique({
        where: {
          id: input.rideId,
        },
        select: {
          id: true,
          organizationId: true,
          riderId: true,
          status: true,
        },
      });

    if (!ride) {
      throw new MobilityDomainError(
        "Ride was not found.",
        "RIDE_NOT_FOUND"
      );
    }

    if (
      ride.riderId !==
      input.ownerUserId
    ) {
      throw new MobilityDomainError(
        "Only the rider may create a trip share.",
        "TRIP_SHARE_OWNER_REQUIRED"
      );
    }

    if (
      !ACTIVE_RIDE_STATUSES.includes(
        ride.status as (typeof ACTIVE_RIDE_STATUSES)[number]
      )
    ) {
      throw new MobilityDomainError(
        "Trip sharing is only available for active rides.",
        "RIDE_NOT_ACTIVE_FOR_SHARING"
      );
    }

    const token =
      randomBytes(32).toString(
        "base64url"
      );

    const tokenHash =
      this.hashToken(token);

    const expiresAt =
      input.expiresAt ??
      new Date(
        Date.now() +
          24 * 60 * 60 * 1000
      );

    if (
      expiresAt.getTime() <=
      Date.now()
    ) {
      throw new MobilityDomainError(
        "Trip share expiration must be in the future.",
        "INVALID_TRIP_SHARE_EXPIRATION"
      );
    }

    const id =
      randomUUID();

    await prisma.$executeRaw`
      INSERT INTO "MobilityTripShare" (
        "id",
        "rideId",
        "ownerUserId",
        "recipientName",
        "recipientPhone",
        "status",
        "shareTokenHash",
        "expiresAt",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${id},
        ${input.rideId},
        ${input.ownerUserId},
        ${input.recipientName.trim()},
        ${input.recipientPhone?.trim() || null},
        'ACTIVE'::"MobilityTripShareStatus",
        ${tokenHash},
        ${expiresAt},
        NOW(),
        NOW()
      )
    `;

    await this.recordSafetyEvent({
      organizationId:
        ride.organizationId,
      rideId:
        input.rideId,
      riderId:
        ride.riderId,
      actorUserId:
        input.ownerUserId,
      correlationId:
        input.correlationId,
      type:
        "TRIP_SHARED",
      severity:
        "INFO",
      metadata: {
        recipientName:
          input.recipientName.trim(),
      },
    });

    return {
      id,
      rideId:
        input.rideId,
      recipientName:
        input.recipientName.trim(),
      recipientPhone:
        input.recipientPhone?.trim(),
      token,
      expiresAt,
    };
  }

  async revokeTripShare(
    shareId: string,
    actorUserId?: string
  ): Promise<void> {
    this.requireId(
      shareId,
      "shareId"
    );

    const share =
      await prisma.$queryRaw<
        Array<{
          id: string;
          rideId: string;
          ownerUserId: string;
          organizationId: string;
        }>
      >`
        SELECT
          s."id",
          s."rideId",
          s."ownerUserId",
          r."organizationId"
        FROM "MobilityTripShare" s
        INNER JOIN "MobilityRide" r
          ON r."id" = s."rideId"
        WHERE s."id" = ${shareId}
        LIMIT 1
      `;

    const record =
      share[0];

    if (!record) {
      throw new MobilityDomainError(
        "Trip share was not found.",
        "TRIP_SHARE_NOT_FOUND"
      );
    }

    if (
      actorUserId &&
      actorUserId !==
        record.ownerUserId
    ) {
      throw new MobilityDomainError(
        "Only the trip share owner may revoke the share.",
        "TRIP_SHARE_OWNER_REQUIRED"
      );
    }

    await prisma.$executeRaw`
      UPDATE "MobilityTripShare"
      SET
        "status" =
          'REVOKED'::"MobilityTripShareStatus",
        "updatedAt" = NOW()
      WHERE "id" = ${shareId}
        AND "status" =
          'ACTIVE'::"MobilityTripShareStatus"
    `;

    await this.recordSafetyEvent({
      organizationId:
        record.organizationId,
      rideId:
        record.rideId,
      actorUserId:
        actorUserId,
      type:
        "TRIP_SHARE_REVOKED",
      severity:
        "INFO",
      metadata: {
        shareId,
      },
    });
  }

  async reportSafetyIncident(
    input: ReportSafetyIncidentInput
  ): Promise<MobilitySafetyIncident> {
    this.requireId(
      input.organizationId,
      "organizationId"
    );

    const description =
      input.description.trim();

    if (!input.type.trim()) {
      throw new MobilityDomainError(
        "Safety incident type is required.",
        "SAFETY_INCIDENT_TYPE_REQUIRED"
      );
    }

    if (!description) {
      throw new MobilityDomainError(
        "Safety incident description is required.",
        "SAFETY_INCIDENT_DESCRIPTION_REQUIRED"
      );
    }

    const id =
      randomUUID();

    await prisma.$executeRaw`
      INSERT INTO "MobilitySafetyIncident" (
        "id",
        "organizationId",
        "rideId",
        "driverId",
        "riderId",
        "type",
        "severity",
        "status",
        "reportedByUserId",
        "description",
        "metadata",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${id},
        ${input.organizationId},
        ${input.rideId ?? null},
        ${input.driverId ?? null},
        ${input.riderId ?? null},
        ${input.type.trim()},
        ${input.severity}::"MobilitySafetyIncidentSeverity",
        'OPEN'::"MobilitySafetyIncidentStatus",
        ${input.reportedByUserId ?? null},
        ${description},
        ${input.metadata
          ? JSON.stringify(input.metadata)
          : null}::jsonb,
        NOW(),
        NOW()
      )
    `;

    if (input.driverId) {
      await this.recalculateDriverSafetyAfterIncident(
        input.organizationId,
        input.driverId
      );
    }

    await this.recordSafetyEvent({
      organizationId:
        input.organizationId,
      rideId:
        input.rideId,
      driverId:
        input.driverId,
      riderId:
        input.riderId,
      actorUserId:
        input.reportedByUserId,
      type:
        input.severity === "CRITICAL" ||
        input.severity === "HIGH"
          ? "SAFETY_INCIDENT_ESCALATED"
          : "SAFETY_INCIDENT_REPORTED",
      severity:
        input.severity === "CRITICAL"
          ? "CRITICAL"
          : input.severity === "HIGH"
            ? "HIGH"
            : input.severity === "MEDIUM"
              ? "MEDIUM"
              : "LOW",
      correlationId:
        input.correlationId,
      metadata: {
        incidentId: id,
        type:
          input.type.trim(),
      },
    });

    const incident =
      await prisma.$queryRaw<
        Array<{
          id: string;
          organizationId: string;
          rideId: string | null;
          driverId: string | null;
          riderId: string | null;
          type: string;
          severity: string;
          status: string;
          description: string;
          createdAt: Date;
        }>
      >`
        SELECT
          "id",
          "organizationId",
          "rideId",
          "driverId",
          "riderId",
          "type",
          "severity",
          "status",
          "description",
          "createdAt"
        FROM "MobilitySafetyIncident"
        WHERE "id" = ${id}
        LIMIT 1
      `;

    const result =
      incident[0];

    if (!result) {
      throw new MobilityDomainError(
        "Safety incident could not be loaded after creation.",
        "SAFETY_INCIDENT_LOAD_FAILED"
      );
    }

    return {
      id: result.id,
      organizationId:
        result.organizationId,
      rideId:
        result.rideId,
      driverId:
        result.driverId,
      riderId:
        result.riderId,
      type:
        result.type,
      severity:
        result.severity as MobilitySafetyIncident["severity"],
      status:
        result.status as MobilitySafetyIncident["status"],
      description:
        result.description,
      createdAt:
        result.createdAt,
    };
  }

  async startAudioSafety(
    input: StartAudioSafetyInput
  ) {
    this.requireId(
      input.rideId,
      "rideId"
    );

    const ride =
      await prisma.mobilityRide.findUnique({
        where: {
          id: input.rideId,
        },
        select: {
          id: true,
          organizationId: true,
          riderId: true,
          driverId: true,
          status: true,
        },
      });

    if (!ride) {
      throw new MobilityDomainError(
        "Ride was not found.",
        "RIDE_NOT_FOUND"
      );
    }

    if (
      !ACTIVE_RIDE_STATUSES.includes(
        ride.status as (typeof ACTIVE_RIDE_STATUSES)[number]
      )
    ) {
      throw new MobilityDomainError(
        "Audio safety is only available during an active ride.",
        "RIDE_NOT_ACTIVE_FOR_AUDIO"
      );
    }

    const existing =
      await prisma.$queryRaw<
        Array<{
          id: string;
        }>
      >`
        SELECT "id"
        FROM "MobilityAudioSafetySession"
        WHERE "rideId" = ${input.rideId}
          AND "status" = 'ACTIVE'
        LIMIT 1
      `;

    if (existing.length > 0) {
      return {
        id: existing[0].id,
        status: "ACTIVE",
      };
    }

    const id =
      randomUUID();

    await prisma.$executeRaw`
      INSERT INTO "MobilityAudioSafetySession" (
        "id",
        "rideId",
        "startedByUserId",
        "status",
        "startedAt",
        "retentionUntil",
        "provider",
        "providerReference",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${id},
        ${input.rideId},
        ${input.startedByUserId ?? null},
        'ACTIVE',
        NOW(),
        ${input.retentionUntil ?? null},
        ${input.provider ?? null},
        ${input.providerReference ?? null},
        NOW(),
        NOW()
      )
    `;

    await this.recordSafetyEvent({
      organizationId:
        ride.organizationId,
      rideId:
        ride.id,
      driverId:
        ride.driverId ?? undefined,
      riderId:
        ride.riderId,
      actorUserId:
        input.startedByUserId,
      correlationId:
        input.correlationId,
      type:
        "AUDIO_SAFETY_SESSION_STARTED",
      severity:
        "MEDIUM",
      metadata: {
        audioSessionId:
          id,
      },
    });

    return {
      id,
      rideId:
        input.rideId,
      status: "ACTIVE",
    };
  }

  async stopAudioSafety(
    input: StopAudioSafetyInput
  ): Promise<void> {
    this.requireId(
      input.rideId,
      "rideId"
    );

    const ride =
      await prisma.mobilityRide.findUnique({
        where: {
          id: input.rideId,
        },
        select: {
          id: true,
          organizationId: true,
          riderId: true,
          driverId: true,
        },
      });

    if (!ride) {
      throw new MobilityDomainError(
        "Ride was not found.",
        "RIDE_NOT_FOUND"
      );
    }

    await prisma.$executeRaw`
      UPDATE "MobilityAudioSafetySession"
      SET
        "status" = 'COMPLETED',
        "endedAt" = NOW(),
        "updatedAt" = NOW()
      WHERE "rideId" = ${input.rideId}
        AND "status" = 'ACTIVE'
    `;

    await prisma.$executeRaw`
      UPDATE "MobilityTripSafety"
      SET
        "audioSafetyEnabled" = false,
        "updatedAt" = NOW()
      WHERE "rideId" = ${input.rideId}
    `;

    await this.recordSafetyEvent({
      organizationId:
        ride.organizationId,
      rideId:
        ride.id,
      driverId:
        ride.driverId ?? undefined,
      riderId:
        ride.riderId,
      actorUserId:
        input.actorUserId,
      correlationId:
        input.correlationId,
      type:
        "AUDIO_SAFETY_SESSION_STOPPED",
      severity:
        "INFO",
    });
  }

  async getTripSafety(
    rideId: string
  ): Promise<MobilityTripSafetyRecord | null> {
    const rows =
      await prisma.$queryRaw<
        Array<{
          id: string;
          rideId: string;
          riderId: string;
          driverId: string | null;
          mode: string;
          childRide: boolean;
          trustedRide: boolean;
          pinRequired: boolean;
          pinVerified: boolean;
          pinVerifiedAt: Date | null;
          audioSafetyEnabled: boolean;
          startedAt: Date | null;
          completedAt: Date | null;
        }>
      >`
        SELECT
          "id",
          "rideId",
          "riderId",
          "driverId",
          "mode",
          "childRide",
          "trustedRide",
          "pinRequired",
          "pinVerified",
          "pinVerifiedAt",
          "audioSafetyEnabled",
          "startedAt",
          "completedAt"
        FROM "MobilityTripSafety"
        WHERE "rideId" = ${rideId}
        LIMIT 1
      `;

    const row =
      rows[0];

    if (!row) {
      return null;
    }

    return {
      id:
        row.id,
      rideId:
        row.rideId,
      riderId:
        row.riderId,
      driverId:
        row.driverId,
      mode:
        row.mode as MobilityTripSafetyRecord["mode"],
      childRide:
        row.childRide,
      trustedRide:
        row.trustedRide,
      pinRequired:
        row.pinRequired,
      pinVerified:
        row.pinVerified,
      pinVerifiedAt:
        row.pinVerifiedAt,
      audioSafetyEnabled:
        row.audioSafetyEnabled,
      startedAt:
        row.startedAt,
      completedAt:
        row.completedAt,
    };
  }

  private async getDriverIncidentStats(
    driverId: string
  ) {
    const rows =
      await prisma.$queryRaw<
        Array<{
          incidentCount: bigint;
          highSeverityIncidentCount: bigint;
        }>
      >`
        SELECT
          COUNT(*) FILTER (
            WHERE "status" IN (
              'OPEN'::"MobilitySafetyIncidentStatus",
              'UNDER_REVIEW'::"MobilitySafetyIncidentStatus",
              'RESOLVED'::"MobilitySafetyIncidentStatus"
            )
          ) AS "incidentCount",

          COUNT(*) FILTER (
            WHERE "severity" IN (
              'HIGH'::"MobilitySafetyIncidentSeverity",
              'CRITICAL'::"MobilitySafetyIncidentSeverity"
            )
            AND "status" IN (
              'OPEN'::"MobilitySafetyIncidentStatus",
              'UNDER_REVIEW'::"MobilitySafetyIncidentStatus"
            )
          ) AS "highSeverityIncidentCount"
        FROM "MobilitySafetyIncident"
        WHERE "driverId" = ${driverId}
      `;

    return {
      incidentCount:
        Number(
          rows[0]?.incidentCount ??
            0
        ),

      highSeverityIncidentCount:
        Number(
          rows[0]
            ?.highSeverityIncidentCount ??
            0
        ),
    };
  }

  private async calculateRiskScore(input: {
    driverStatus: string;
    userStatus: string;
    identityVerified: boolean;
    driverDocumentsVerified: boolean;
    vehicleVerified: boolean;
    completedTrips: number;
    incidentCount: number;
    highSeverityIncidentCount: number;
  }): Promise<number> {
    let score = 0;

    if (
      !input.identityVerified
    ) {
      score += 25;
    }

    if (
      !input.driverDocumentsVerified
    ) {
      score += 30;
    }

    if (
      !input.vehicleVerified
    ) {
      score += 20;
    }

    if (
      input.driverStatus !==
      "ACTIVE"
    ) {
      score += 30;
    }

    if (
      input.userStatus !==
      "ACTIVE"
    ) {
      score += 30;
    }

    score += Math.min(
      input.incidentCount * 5,
      20
    );

    score += Math.min(
      input.highSeverityIncidentCount *
        25,
      75
    );

    if (
      input.completedTrips === 0
    ) {
      score += 10;
    }

    return Math.max(
      0,
      Math.min(
        100,
        score
      )
    );
  }

  private async upsertDriverSafetyProfile(
    input: {
      organizationId: string;
      driverId: string;
      status: string;
      identityVerified: boolean;
      driverDocumentsVerified: boolean;
      vehicleVerified: boolean;
      eligibleForStandardRides: boolean;
      eligibleForTrustedRides: boolean;
      eligibleForChildRides: boolean;
      riskScore: number;
      completedTrips: number;
      incidentCount: number;
      highSeverityIncidentCount: number;
      reasons: string[];
    }
  ) {
    const existing =
      await prisma.$queryRaw<
        Array<{
          id: string;
        }>
      >`
        SELECT "id"
        FROM "MobilityDriverSafetyProfile"
        WHERE "driverId" = ${input.driverId}
        LIMIT 1
      `;

    const metadata =
      JSON.stringify({
        reasons:
          input.reasons,
      });

    if (existing.length === 0) {
      await prisma.$executeRaw`
        INSERT INTO "MobilityDriverSafetyProfile" (
          "id",
          "organizationId",
          "driverId",
          "status",
          "identityVerified",
          "driverDocumentsVerified",
          "vehicleVerified",
          "eligibleForStandardRides",
          "eligibleForTrustedRides",
          "eligibleForChildRides",
          "riskScore",
          "completedTrips",
          "incidentCount",
          "highSeverityIncidentCount",
          "lastEligibilityCheckAt",
          "metadata",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${randomUUID()},
          ${input.organizationId},
          ${input.driverId},
          ${input.status}::"MobilitySafetyEligibilityStatus",
          ${input.identityVerified},
          ${input.driverDocumentsVerified},
          ${input.vehicleVerified},
          ${input.eligibleForStandardRides},
          ${input.eligibleForTrustedRides},
          ${input.eligibleForChildRides},
          ${input.riskScore},
          ${input.completedTrips},
          ${input.incidentCount},
          ${input.highSeverityIncidentCount},
          NOW(),
          ${metadata}::jsonb,
          NOW(),
          NOW()
        )
      `;

      return;
    }

    await prisma.$executeRaw`
      UPDATE "MobilityDriverSafetyProfile"
      SET
        "organizationId" =
          ${input.organizationId},
        "status" =
          ${input.status}::"MobilitySafetyEligibilityStatus",
        "identityVerified" =
          ${input.identityVerified},
        "driverDocumentsVerified" =
          ${input.driverDocumentsVerified},
        "vehicleVerified" =
          ${input.vehicleVerified},
        "eligibleForStandardRides" =
          ${input.eligibleForStandardRides},
        "eligibleForTrustedRides" =
          ${input.eligibleForTrustedRides},
        "eligibleForChildRides" =
          ${input.eligibleForChildRides},
        "riskScore" =
          ${input.riskScore},
        "completedTrips" =
          ${input.completedTrips},
        "incidentCount" =
          ${input.incidentCount},
        "highSeverityIncidentCount" =
          ${input.highSeverityIncidentCount},
        "lastEligibilityCheckAt" =
          NOW(),
        "metadata" =
          ${metadata}::jsonb,
        "updatedAt" =
          NOW()
      WHERE "driverId" =
        ${input.driverId}
    `;
  }

  private async recalculateDriverSafetyAfterIncident(
    organizationId: string,
    driverId: string
  ) {
    try {
      await this.evaluateDriverSafety({
        organizationId,
        driverId,
      });
    } catch {
      /*
       * Incident reporting must remain persisted even
       * if a secondary eligibility recalculation fails.
       *
       * The incident itself is authoritative and can be
       * reprocessed by the safety worker later.
       */
    }
  }

  private async recordSafetyEvent(input: {
    organizationId: string;
    rideId?: string;
    driverId?: string;
    riderId?: string;
    actorUserId?: string;
    type: string;
    severity:
      | "INFO"
      | "LOW"
      | "MEDIUM"
      | "HIGH"
      | "CRITICAL";
    correlationId?: string;
    metadata?: Record<string, unknown>;
  }) {
    await prisma.$executeRaw`
      INSERT INTO "MobilitySafetyEvent" (
        "id",
        "organizationId",
        "rideId",
        "driverId",
        "riderId",
        "type",
        "severity",
        "correlationId",
        "actorUserId",
        "metadata",
        "createdAt"
      )
      VALUES (
        ${randomUUID()},
        ${input.organizationId},
        ${input.rideId ?? null},
        ${input.driverId ?? null},
        ${input.riderId ?? null},
        ${input.type}::"MobilitySafetyEventType",
        ${input.severity}::"SecurityEventSeverity",
        ${input.correlationId ?? null},
        ${input.actorUserId ?? null},
        ${input.metadata
          ? JSON.stringify(input.metadata)
          : null}::jsonb,
        NOW()
      )
    `;

    await prisma.securityEvent.create({
      data: {
        actorUserId:
          input.actorUserId,
        organizationId:
          input.organizationId,
        type:
          `MOBILITY_${input.type}`,
        severity:
          input.severity,
        correlationId:
          input.correlationId,
        metadata:
          input.metadata as Prisma.InputJsonValue,
      },
    });
  }

  private isVehicleVerified(
    verifications: Array<{
      status: string;
      documentExpiry: Date | null;
    }>
  ): boolean {
    const latest =
      this.latestVerificationByDocument(
        verifications
      );

    return (
      latest.length > 0 &&
      latest.every(
        (verification) =>
          verification.status ===
            "VERIFIED" &&
          !this.isExpired(
            verification.documentExpiry
          )
      )
    );
  }

  private latestVerificationByDocument<
    T extends {
      documentType: string;
      createdAt: Date;
    }
  >(
    verifications: T[]
  ): T[] {
    const latest =
      new Map<string, T>();

    for (
      const verification of verifications
    ) {
      const current =
        latest.get(
          verification.documentType
        );

      if (
        !current ||
        verification.createdAt >
          current.createdAt
      ) {
        latest.set(
          verification.documentType,
          verification
        );
      }
    }

    return Array.from(
      latest.values()
    );
  }

  private isExpired(
    expiry: Date | null
  ): boolean {
    if (!expiry) {
      return false;
    }

    return (
      expiry.getTime() <=
      Date.now()
    );
  }

  private hashToken(
    token: string
  ): string {
    return createHash("sha256")
      .update(token)
      .digest("hex");
  }

  private requireId(
    value: string,
    field: string
  ) {
    if (!value?.trim()) {
      throw new MobilityDomainError(
        `${field} is required.`,
        `MISSING_${field.toUpperCase()}`
      );
    }
  }
}

export const mobilitySafetyService =
  new MobilitySafetyService();
