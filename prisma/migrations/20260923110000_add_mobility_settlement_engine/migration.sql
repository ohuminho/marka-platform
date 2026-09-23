-- MARKA Mobility Settlement Engine
--
-- Orchestrates the settlement state of a completed Mobility payment.
-- The Financial Core remains the accounting source of truth.
-- This table represents the Mobility settlement lifecycle and
-- references the Mobility payment/ride/driver context.

CREATE TYPE "MobilitySettlementStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'CANCELLED'
);

CREATE TABLE "MobilitySettlement" (
    "id" TEXT NOT NULL,

    "organizationId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "driverId" TEXT,

    "currency" CHAR(3) NOT NULL,

    "paymentMethod" "MobilityPaymentMethod" NOT NULL,
    "status" "MobilitySettlementStatus" NOT NULL DEFAULT 'PENDING',

    "grossAmountMinor" BIGINT NOT NULL DEFAULT 0,
    "commissionAmountMinor" BIGINT NOT NULL DEFAULT 0,
    "driverNetAmountMinor" BIGINT NOT NULL DEFAULT 0,

    "cashObligationAmountMinor" BIGINT NOT NULL DEFAULT 0,
    "cashObligationSettledMinor" BIGINT NOT NULL DEFAULT 0,

    "sourceReference" TEXT,

    "idempotencyKey" TEXT NOT NULL,

    "metadata" JSONB,

    "processingStartedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobilitySettlement_pkey"
        PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MobilitySettlement_paymentId_key"
    ON "MobilitySettlement"("paymentId");

CREATE UNIQUE INDEX "MobilitySettlement_idempotencyKey_key"
    ON "MobilitySettlement"("idempotencyKey");

CREATE INDEX "MobilitySettlement_organizationId_idx"
    ON "MobilitySettlement"("organizationId");

CREATE INDEX "MobilitySettlement_rideId_idx"
    ON "MobilitySettlement"("rideId");

CREATE INDEX "MobilitySettlement_driverId_idx"
    ON "MobilitySettlement"("driverId");

CREATE INDEX "MobilitySettlement_status_idx"
    ON "MobilitySettlement"("status");

CREATE INDEX "MobilitySettlement_paymentMethod_idx"
    ON "MobilitySettlement"("paymentMethod");

CREATE INDEX "MobilitySettlement_createdAt_idx"
    ON "MobilitySettlement"("createdAt");

ALTER TABLE "MobilitySettlement"
ADD CONSTRAINT "MobilitySettlement_organizationId_fkey"
FOREIGN KEY ("organizationId")
REFERENCES "Organization"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "MobilitySettlement"
ADD CONSTRAINT "MobilitySettlement_paymentId_fkey"
FOREIGN KEY ("paymentId")
REFERENCES "MobilityRidePayment"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "MobilitySettlement"
ADD CONSTRAINT "MobilitySettlement_rideId_fkey"
FOREIGN KEY ("rideId")
REFERENCES "MobilityRide"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "MobilitySettlement"
ADD CONSTRAINT "MobilitySettlement_driverId_fkey"
FOREIGN KEY ("driverId")
REFERENCES "MobilityDriver"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "MobilitySettlement"
ADD CONSTRAINT "MobilitySettlement_amounts_non_negative"
CHECK (
    "grossAmountMinor" >= 0
    AND "commissionAmountMinor" >= 0
    AND "driverNetAmountMinor" >= 0
    AND "cashObligationAmountMinor" >= 0
    AND "cashObligationSettledMinor" >= 0
);

ALTER TABLE "MobilitySettlement"
ADD CONSTRAINT "MobilitySettlement_financial_math"
CHECK (
    "commissionAmountMinor" <= "grossAmountMinor"
    AND
    "driverNetAmountMinor" =
        "grossAmountMinor" - "commissionAmountMinor"
);

ALTER TABLE "MobilitySettlement"
ADD CONSTRAINT "MobilitySettlement_cash_settlement_math"
CHECK (
    "cashObligationSettledMinor" <=
        "cashObligationAmountMinor"
);
