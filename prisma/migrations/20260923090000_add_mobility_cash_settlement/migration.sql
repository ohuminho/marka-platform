-- CreateEnum
CREATE TYPE "MobilityCashObligationStatus" AS ENUM (
    'OPEN',
    'PARTIALLY_SETTLED',
    'SETTLED',
    'CANCELLED'
);

-- CreateTable
CREATE TABLE "MobilityCashObligation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,

    "currency" CHAR(3) NOT NULL,
    "grossFareMinor" BIGINT NOT NULL,
    "commissionRateBps" INTEGER NOT NULL,
    "commissionAmountMinor" BIGINT NOT NULL,

    "settledAmountMinor" BIGINT NOT NULL DEFAULT 0,
    "remainingAmountMinor" BIGINT NOT NULL,

    "status" "MobilityCashObligationStatus" NOT NULL DEFAULT 'OPEN',

    "idempotencyKey" TEXT NOT NULL,
    "policyKey" TEXT NOT NULL,
    "policyVersion" INTEGER NOT NULL,

    "metadata" JSONB,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobilityCashObligation_pkey"
        PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobilityCashObligationSettlement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "obligationId" TEXT NOT NULL,

    "settlementReference" TEXT NOT NULL,
    "sourceReference" TEXT NOT NULL,

    "amountMinor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL,

    "metadata" JSONB,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobilityCashObligationSettlement_pkey"
        PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX "MobilityCashObligation_rideId_key"
    ON "MobilityCashObligation"("rideId");

CREATE UNIQUE INDEX "MobilityCashObligation_idempotencyKey_key"
    ON "MobilityCashObligation"("idempotencyKey");

CREATE UNIQUE INDEX "MobilityCashObligationSettlement_settlementReference_key"
    ON "MobilityCashObligationSettlement"("settlementReference");

CREATE UNIQUE INDEX "MobilityCashObligationSettlement_obligationId_sourceReference_key"
    ON "MobilityCashObligationSettlement"(
        "obligationId",
        "sourceReference"
    );

-- Lookup indexes
CREATE INDEX "MobilityCashObligation_organizationId_idx"
    ON "MobilityCashObligation"("organizationId");

CREATE INDEX "MobilityCashObligation_driverId_idx"
    ON "MobilityCashObligation"("driverId");

CREATE INDEX "MobilityCashObligation_status_idx"
    ON "MobilityCashObligation"("status");

CREATE INDEX "MobilityCashObligation_driverId_status_idx"
    ON "MobilityCashObligation"(
        "driverId",
        "status"
    );

CREATE INDEX "MobilityCashObligation_createdAt_idx"
    ON "MobilityCashObligation"("createdAt");

CREATE INDEX "MobilityCashObligationSettlement_organizationId_idx"
    ON "MobilityCashObligationSettlement"(
        "organizationId"
    );

CREATE INDEX "MobilityCashObligationSettlement_obligationId_idx"
    ON "MobilityCashObligationSettlement"(
        "obligationId"
    );

CREATE INDEX "MobilityCashObligationSettlement_createdAt_idx"
    ON "MobilityCashObligationSettlement"(
        "createdAt"
    );

-- Foreign keys
ALTER TABLE "MobilityCashObligation"
ADD CONSTRAINT "MobilityCashObligation_organizationId_fkey"
FOREIGN KEY ("organizationId")
REFERENCES "Organization"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "MobilityCashObligation"
ADD CONSTRAINT "MobilityCashObligation_driverId_fkey"
FOREIGN KEY ("driverId")
REFERENCES "MobilityDriver"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "MobilityCashObligation"
ADD CONSTRAINT "MobilityCashObligation_rideId_fkey"
FOREIGN KEY ("rideId")
REFERENCES "MobilityRide"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "MobilityCashObligationSettlement"
ADD CONSTRAINT "MobilityCashObligationSettlement_organizationId_fkey"
FOREIGN KEY ("organizationId")
REFERENCES "Organization"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "MobilityCashObligationSettlement"
ADD CONSTRAINT "MobilityCashObligationSettlement_obligationId_fkey"
FOREIGN KEY ("obligationId")
REFERENCES "MobilityCashObligation"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- Financial invariants
ALTER TABLE "MobilityCashObligation"
ADD CONSTRAINT "MobilityCashObligation_amounts_non_negative"
CHECK (
    "grossFareMinor" >= 0
    AND "commissionAmountMinor" >= 0
    AND "settledAmountMinor" >= 0
    AND "remainingAmountMinor" >= 0
);

ALTER TABLE "MobilityCashObligation"
ADD CONSTRAINT "MobilityCashObligation_settlement_math"
CHECK (
    "settledAmountMinor" + "remainingAmountMinor"
    = "commissionAmountMinor"
);

ALTER TABLE "MobilityCashObligation"
ADD CONSTRAINT "MobilityCashObligation_rate_valid"
CHECK (
    "commissionRateBps" >= 0
    AND "commissionRateBps" <= 10000
);

ALTER TABLE "MobilityCashObligationSettlement"
ADD CONSTRAINT "MobilityCashObligationSettlement_amount_positive"
CHECK (
    "amountMinor" > 0
);
