CREATE TYPE "MobilityOrchestrationStatus" AS ENUM (
  'ACTIVE',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'RECOVERY_REQUIRED'
);

CREATE TYPE "MobilityOrchestrationStep" AS ENUM (
  'REQUESTED',
  'SAFETY_READY',
  'SEARCHING',
  'DRIVER_ASSIGNED',
  'DRIVER_ACCEPTED',
  'DRIVER_ARRIVING',
  'DRIVER_ARRIVED',
  'TRIP_STARTED',
  'TRIP_IN_PROGRESS',
  'TRIP_COMPLETED',
  'PAYMENT_INITIALIZED',
  'FINANCIAL_FINALIZED',
  'CANCELLED',
  'FAILED',
  'RECOVERY_REQUIRED'
);

CREATE TABLE "MobilityRideOrchestration" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "rideId" TEXT NOT NULL,
  "status" "MobilityOrchestrationStatus" NOT NULL DEFAULT 'ACTIVE',
  "currentStep" "MobilityOrchestrationStep" NOT NULL DEFAULT 'REQUESTED',
  "version" INTEGER NOT NULL DEFAULT 1,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "correlationId" TEXT,
  "requestId" TEXT,
  "lastErrorCode" TEXT,
  "lastError" TEXT,
  "nextRetryAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MobilityRideOrchestration_pkey"
    PRIMARY KEY ("id"),

  CONSTRAINT "MobilityRideOrchestration_organizationId_fkey"
    FOREIGN KEY ("organizationId")
    REFERENCES "Organization"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  CONSTRAINT "MobilityRideOrchestration_rideId_fkey"
    FOREIGN KEY ("rideId")
    REFERENCES "MobilityRide"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE TABLE "MobilityRideOrchestrationEvent" (
  "id" TEXT NOT NULL,
  "orchestrationId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "rideId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "fromStep" "MobilityOrchestrationStep",
  "toStep" "MobilityOrchestrationStep" NOT NULL,
  "status" "MobilityOrchestrationStatus" NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "correlationId" TEXT,
  "requestId" TEXT,
  "actorUserId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MobilityRideOrchestrationEvent_pkey"
    PRIMARY KEY ("id"),

  CONSTRAINT "MobilityRideOrchestrationEvent_orchestrationId_fkey"
    FOREIGN KEY ("orchestrationId")
    REFERENCES "MobilityRideOrchestration"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT "MobilityRideOrchestrationEvent_organizationId_fkey"
    FOREIGN KEY ("organizationId")
    REFERENCES "Organization"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  CONSTRAINT "MobilityRideOrchestrationEvent_rideId_fkey"
    FOREIGN KEY ("rideId")
    REFERENCES "MobilityRide"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE UNIQUE INDEX
  "MobilityRideOrchestration_rideId_key"
ON "MobilityRideOrchestration"("rideId");

CREATE INDEX
  "MobilityRideOrchestration_organizationId_idx"
ON "MobilityRideOrchestration"("organizationId");

CREATE INDEX
  "MobilityRideOrchestration_status_idx"
ON "MobilityRideOrchestration"("status");

CREATE INDEX
  "MobilityRideOrchestration_currentStep_idx"
ON "MobilityRideOrchestration"("currentStep");

CREATE INDEX
  "MobilityRideOrchestration_nextRetryAt_idx"
ON "MobilityRideOrchestration"("nextRetryAt");

CREATE UNIQUE INDEX
  "MobilityRideOrchestrationEvent_idempotencyKey_key"
ON "MobilityRideOrchestrationEvent"("idempotencyKey");

CREATE INDEX
  "MobilityRideOrchestrationEvent_orchestrationId_idx"
ON "MobilityRideOrchestrationEvent"("orchestrationId");

CREATE INDEX
  "MobilityRideOrchestrationEvent_organizationId_idx"
ON "MobilityRideOrchestrationEvent"("organizationId");

CREATE INDEX
  "MobilityRideOrchestrationEvent_rideId_idx"
ON "MobilityRideOrchestrationEvent"("rideId");

CREATE INDEX
  "MobilityRideOrchestrationEvent_createdAt_idx"
ON "MobilityRideOrchestrationEvent"("createdAt");

ALTER TABLE "MobilityRideOrchestration"
ADD CONSTRAINT
  "MobilityRideOrchestration_attemptCount_check"
CHECK ("attemptCount" >= 0);

ALTER TABLE "MobilityRideOrchestration"
ADD CONSTRAINT
  "MobilityRideOrchestration_version_check"
CHECK ("version" > 0);
