-- Mobility Safety & Trust Engine
-- Additive migration.
-- Does not modify Financial Core or existing Mobility aggregates.

CREATE TYPE "MobilitySafetyEligibilityStatus" AS ENUM (
    'PENDING',
    'ELIGIBLE',
    'RESTRICTED',
    'SUSPENDED',
    'BLOCKED'
);

CREATE TYPE "MobilitySafetyIncidentSeverity" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);

CREATE TYPE "MobilitySafetyIncidentStatus" AS ENUM (
    'OPEN',
    'UNDER_REVIEW',
    'RESOLVED',
    'DISMISSED'
);

CREATE TYPE "MobilityTrustedContactStatus" AS ENUM (
    'PENDING',
    'ACTIVE',
    'REVOKED'
);

CREATE TYPE "MobilityTripShareStatus" AS ENUM (
    'ACTIVE',
    'EXPIRED',
    'REVOKED',
    'COMPLETED'
);

CREATE TYPE "MobilityTripSafetyMode" AS ENUM (
    'STANDARD',
    'TRUSTED',
    'CHILD'
);

CREATE TYPE "MobilitySafetyEventType" AS ENUM (
    'RIDE_SAFETY_CHECK',
    'DRIVER_ELIGIBILITY_CHECK',
    'CHILD_RIDE_REQUESTED',
    'CHILD_RIDE_AUTHORIZED',
    'CHILD_RIDE_BLOCKED',
    'TRUSTED_RIDE_REQUESTED',
    'TRUSTED_CONTACT_ADDED',
    'TRIP_SHARED',
    'TRIP_SHARE_REVOKED',
    'SAFETY_INCIDENT_REPORTED',
    'SAFETY_INCIDENT_ESCALATED',
    'SAFETY_RESTRICTION_APPLIED',
    'SAFETY_RESTRICTION_REMOVED',
    'DRIVER_SAFETY_ELIGIBILITY_CHANGED',
    'TRIP_PIN_VERIFICATION_REQUESTED',
    'TRIP_PIN_VERIFICATION_FAILED',
    'TRIP_PIN_VERIFICATION_SUCCEEDED',
    'AUDIO_SAFETY_SESSION_STARTED',
    'AUDIO_SAFETY_SESSION_STOPPED'
);

CREATE TABLE "MobilityDriverSafetyProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,

    "status" "MobilitySafetyEligibilityStatus" NOT NULL DEFAULT 'PENDING',

    "identityVerified" BOOLEAN NOT NULL DEFAULT false,
    "driverDocumentsVerified" BOOLEAN NOT NULL DEFAULT false,
    "vehicleVerified" BOOLEAN NOT NULL DEFAULT false,

    "eligibleForStandardRides" BOOLEAN NOT NULL DEFAULT false,
    "eligibleForTrustedRides" BOOLEAN NOT NULL DEFAULT false,
    "eligibleForChildRides" BOOLEAN NOT NULL DEFAULT false,

    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "completedTrips" INTEGER NOT NULL DEFAULT 0,
    "incidentCount" INTEGER NOT NULL DEFAULT 0,
    "highSeverityIncidentCount" INTEGER NOT NULL DEFAULT 0,

    "lastEligibilityCheckAt" TIMESTAMP(3),
    "lastIncidentAt" TIMESTAMP(3),

    "restrictionReason" TEXT,
    "metadata" JSONB,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobilityDriverSafetyProfile_pkey"
        PRIMARY KEY ("id"),

    CONSTRAINT "MobilityDriverSafetyProfile_driverId_key"
        UNIQUE ("driverId"),

    CONSTRAINT "MobilityDriverSafetyProfile_driver_fk"
        FOREIGN KEY ("driverId")
        REFERENCES "MobilityDriver"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT "MobilityDriverSafetyProfile_organization_fk"
        FOREIGN KEY ("organizationId")
        REFERENCES "Organization"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT "MobilityDriverSafetyProfile_riskScore_check"
        CHECK ("riskScore" >= 0 AND "riskScore" <= 100),

    CONSTRAINT "MobilityDriverSafetyProfile_completedTrips_check"
        CHECK ("completedTrips" >= 0),

    CONSTRAINT "MobilityDriverSafetyProfile_incidentCount_check"
        CHECK ("incidentCount" >= 0),

    CONSTRAINT "MobilityDriverSafetyProfile_highSeverityIncidentCount_check"
        CHECK ("highSeverityIncidentCount" >= 0)
);

CREATE INDEX "MobilityDriverSafetyProfile_organizationId_idx"
    ON "MobilityDriverSafetyProfile"("organizationId");

CREATE INDEX "MobilityDriverSafetyProfile_status_idx"
    ON "MobilityDriverSafetyProfile"("status");

CREATE INDEX "MobilityDriverSafetyProfile_riskScore_idx"
    ON "MobilityDriverSafetyProfile"("riskScore");

CREATE TABLE "MobilitySafetyIncident" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    "rideId" TEXT,
    "driverId" TEXT,
    "riderId" TEXT,

    "type" TEXT NOT NULL,
    "severity" "MobilitySafetyIncidentSeverity" NOT NULL,
    "status" "MobilitySafetyIncidentStatus" NOT NULL DEFAULT 'OPEN',

    "reportedByUserId" TEXT,
    "description" TEXT NOT NULL,

    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" TEXT,

    "metadata" JSONB,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobilitySafetyIncident_pkey"
        PRIMARY KEY ("id"),

    CONSTRAINT "MobilitySafetyIncident_organization_fk"
        FOREIGN KEY ("organizationId")
        REFERENCES "Organization"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT "MobilitySafetyIncident_ride_fk"
        FOREIGN KEY ("rideId")
        REFERENCES "MobilityRide"("id")
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT "MobilitySafetyIncident_driver_fk"
        FOREIGN KEY ("driverId")
        REFERENCES "MobilityDriver"("id")
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT "MobilitySafetyIncident_rider_fk"
        FOREIGN KEY ("riderId")
        REFERENCES "User"("id")
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT "MobilitySafetyIncident_reporter_fk"
        FOREIGN KEY ("reportedByUserId")
        REFERENCES "User"("id")
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT "MobilitySafetyIncident_resolver_fk"
        FOREIGN KEY ("resolvedByUserId")
        REFERENCES "User"("id")
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

CREATE INDEX "MobilitySafetyIncident_organizationId_idx"
    ON "MobilitySafetyIncident"("organizationId");

CREATE INDEX "MobilitySafetyIncident_rideId_idx"
    ON "MobilitySafetyIncident"("rideId");

CREATE INDEX "MobilitySafetyIncident_driverId_idx"
    ON "MobilitySafetyIncident"("driverId");

CREATE INDEX "MobilitySafetyIncident_riderId_idx"
    ON "MobilitySafetyIncident"("riderId");

CREATE INDEX "MobilitySafetyIncident_severity_idx"
    ON "MobilitySafetyIncident"("severity");

CREATE INDEX "MobilitySafetyIncident_status_idx"
    ON "MobilitySafetyIncident"("status");

CREATE TABLE "MobilityTrustedContact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "relationship" TEXT,

    "status" "MobilityTrustedContactStatus" NOT NULL DEFAULT 'PENDING',

    "verifiedAt" TIMESTAMP(3),
    "metadata" JSONB,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobilityTrustedContact_pkey"
        PRIMARY KEY ("id"),

    CONSTRAINT "MobilityTrustedContact_user_fk"
        FOREIGN KEY ("userId")
        REFERENCES "User"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE INDEX "MobilityTrustedContact_userId_idx"
    ON "MobilityTrustedContact"("userId");

CREATE INDEX "MobilityTrustedContact_status_idx"
    ON "MobilityTrustedContact"("status");

CREATE TABLE "MobilityTripSafety" (
    "id" TEXT NOT NULL,

    "rideId" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "driverId" TEXT,

    "mode" "MobilityTripSafetyMode" NOT NULL DEFAULT 'STANDARD',

    "childRide" BOOLEAN NOT NULL DEFAULT false,
    "trustedRide" BOOLEAN NOT NULL DEFAULT false,

    "pinRequired" BOOLEAN NOT NULL DEFAULT false,
    "pinVerified" BOOLEAN NOT NULL DEFAULT false,
    "pinVerifiedAt" TIMESTAMP(3),

    "audioSafetyEnabled" BOOLEAN NOT NULL DEFAULT false,

    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    "metadata" JSONB,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobilityTripSafety_pkey"
        PRIMARY KEY ("id"),

    CONSTRAINT "MobilityTripSafety_rideId_key"
        UNIQUE ("rideId"),

    CONSTRAINT "MobilityTripSafety_ride_fk"
        FOREIGN KEY ("rideId")
        REFERENCES "MobilityRide"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT "MobilityTripSafety_rider_fk"
        FOREIGN KEY ("riderId")
        REFERENCES "User"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT "MobilityTripSafety_driver_fk"
        FOREIGN KEY ("driverId")
        REFERENCES "MobilityDriver"("id")
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

CREATE INDEX "MobilityTripSafety_riderId_idx"
    ON "MobilityTripSafety"("riderId");

CREATE INDEX "MobilityTripSafety_driverId_idx"
    ON "MobilityTripSafety"("driverId");

CREATE INDEX "MobilityTripSafety_mode_idx"
    ON "MobilityTripSafety"("mode");

CREATE TABLE "MobilityTripShare" (
    "id" TEXT NOT NULL,

    "rideId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,

    "recipientName" TEXT NOT NULL,
    "recipientPhone" TEXT,

    "status" "MobilityTripShareStatus" NOT NULL DEFAULT 'ACTIVE',

    "shareTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    "lastViewedAt" TIMESTAMP(3),

    "metadata" JSONB,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobilityTripShare_pkey"
        PRIMARY KEY ("id"),

    CONSTRAINT "MobilityTripShare_shareTokenHash_key"
        UNIQUE ("shareTokenHash"),

    CONSTRAINT "MobilityTripShare_ride_fk"
        FOREIGN KEY ("rideId")
        REFERENCES "MobilityRide"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT "MobilityTripShare_owner_fk"
        FOREIGN KEY ("ownerUserId")
        REFERENCES "User"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE INDEX "MobilityTripShare_rideId_idx"
    ON "MobilityTripShare"("rideId");

CREATE INDEX "MobilityTripShare_ownerUserId_idx"
    ON "MobilityTripShare"("ownerUserId");

CREATE INDEX "MobilityTripShare_status_idx"
    ON "MobilityTripShare"("status");

CREATE INDEX "MobilityTripShare_expiresAt_idx"
    ON "MobilityTripShare"("expiresAt");

CREATE TABLE "MobilitySafetyEvent" (
    "id" TEXT NOT NULL,

    "organizationId" TEXT NOT NULL,
    "rideId" TEXT,
    "driverId" TEXT,
    "riderId" TEXT,

    "type" "MobilitySafetyEventType" NOT NULL,

    "severity" "SecurityEventSeverity" NOT NULL DEFAULT 'INFO',

    "correlationId" TEXT,
    "actorUserId" TEXT,

    "metadata" JSONB,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobilitySafetyEvent_pkey"
        PRIMARY KEY ("id"),

    CONSTRAINT "MobilitySafetyEvent_organization_fk"
        FOREIGN KEY ("organizationId")
        REFERENCES "Organization"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT "MobilitySafetyEvent_ride_fk"
        FOREIGN KEY ("rideId")
        REFERENCES "MobilityRide"("id")
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT "MobilitySafetyEvent_driver_fk"
        FOREIGN KEY ("driverId")
        REFERENCES "MobilityDriver"("id")
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT "MobilitySafetyEvent_rider_fk"
        FOREIGN KEY ("riderId")
        REFERENCES "User"("id")
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT "MobilitySafetyEvent_actor_fk"
        FOREIGN KEY ("actorUserId")
        REFERENCES "User"("id")
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

CREATE INDEX "MobilitySafetyEvent_organizationId_idx"
    ON "MobilitySafetyEvent"("organizationId");

CREATE INDEX "MobilitySafetyEvent_rideId_idx"
    ON "MobilitySafetyEvent"("rideId");

CREATE INDEX "MobilitySafetyEvent_driverId_idx"
    ON "MobilitySafetyEvent"("driverId");

CREATE INDEX "MobilitySafetyEvent_riderId_idx"
    ON "MobilitySafetyEvent"("riderId");

CREATE INDEX "MobilitySafetyEvent_type_idx"
    ON "MobilitySafetyEvent"("type");

CREATE INDEX "MobilitySafetyEvent_createdAt_idx"
    ON "MobilitySafetyEvent"("createdAt");

CREATE TABLE "MobilityAudioSafetySession" (
    "id" TEXT NOT NULL,

    "rideId" TEXT NOT NULL,
    "startedByUserId" TEXT,

    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    "retentionUntil" TIMESTAMP(3),

    "provider" TEXT,
    "providerReference" TEXT,

    "metadata" JSONB,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobilityAudioSafetySession_pkey"
        PRIMARY KEY ("id"),

    CONSTRAINT "MobilityAudioSafetySession_ride_fk"
        FOREIGN KEY ("rideId")
        REFERENCES "MobilityRide"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT "MobilityAudioSafetySession_startedByUser_fk"
        FOREIGN KEY ("startedByUserId")
        REFERENCES "User"("id")
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

CREATE INDEX "MobilityAudioSafetySession_rideId_idx"
    ON "MobilityAudioSafetySession"("rideId");

CREATE INDEX "MobilityAudioSafetySession_status_idx"
    ON "MobilityAudioSafetySession"("status");

CREATE INDEX "MobilityAudioSafetySession_retentionUntil_idx"
    ON "MobilityAudioSafetySession"("retentionUntil");
