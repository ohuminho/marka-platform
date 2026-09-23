-- Mobility Payment Engine
--
-- Financial identity of a Mobility ride.
-- The Financial Core remains the accounting source of truth.
-- This table stores the Mobility-specific commercial/payment state.

CREATE TYPE "MobilityPaymentMethod" AS ENUM (
    'CASH',
    'DIGITAL'
);

CREATE TYPE "MobilityPaymentStatus" AS ENUM (
    'PENDING',
    'AUTHORIZED',
    'COLLECTED',
    'SETTLED',
    'FAILED',
    'CANCELLED',
    'REFUNDED',
    'DISPUTED'
);

CREATE TABLE "MobilityRidePayment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "driverId" TEXT,

    "currency" CHAR(3) NOT NULL,

    "paymentMethod" "MobilityPaymentMethod" NOT NULL,
    "status" "MobilityPaymentStatus" NOT NULL DEFAULT 'PENDING',

    "estimatedFareMinor" BIGINT NOT NULL DEFAULT 0,
    "finalFareMinor" BIGINT NOT NULL DEFAULT 0,

    "commissionRateBps" INTEGER NOT NULL DEFAULT 0,
    "commissionAmountMinor" BIGINT NOT NULL DEFAULT 0,

    "driverGrossMinor" BIGINT NOT NULL DEFAULT 0,
    "driverNetMinor" BIGINT NOT NULL DEFAULT 0,

    "pricingSnapshot" JSONB,
    "metadata" JSONB,

    "idempotencyKey" TEXT NOT NULL,

    "authorizedAt" TIMESTAMP(3),
    "collectedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobilityRidePayment_pkey"
        PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MobilityRidePayment_rideId_key"
    ON "MobilityRidePayment"("rideId");

CREATE UNIQUE INDEX "MobilityRidePayment_idempotencyKey_key"
    ON "MobilityRidePayment"("idempotencyKey");

CREATE INDEX "MobilityRidePayment_organizationId_idx"
    ON "MobilityRidePayment"("organizationId");

CREATE INDEX "MobilityRidePayment_riderId_idx"
    ON "MobilityRidePayment"("riderId");

CREATE INDEX "MobilityRidePayment_driverId_idx"
    ON "MobilityRidePayment"("driverId");

CREATE INDEX "MobilityRidePayment_paymentMethod_idx"
    ON "MobilityRidePayment"("paymentMethod");

CREATE INDEX "MobilityRidePayment_status_idx"
    ON "MobilityRidePayment"("status");

CREATE INDEX "MobilityRidePayment_createdAt_idx"
    ON "MobilityRidePayment"("createdAt");

ALTER TABLE "MobilityRidePayment"
ADD CONSTRAINT "MobilityRidePayment_organizationId_fkey"
FOREIGN KEY ("organizationId")
REFERENCES "Organization"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "MobilityRidePayment"
ADD CONSTRAINT "MobilityRidePayment_rideId_fkey"
FOREIGN KEY ("rideId")
REFERENCES "MobilityRide"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "MobilityRidePayment"
ADD CONSTRAINT "MobilityRidePayment_riderId_fkey"
FOREIGN KEY ("riderId")
REFERENCES "User"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "MobilityRidePayment"
ADD CONSTRAINT "MobilityRidePayment_driverId_fkey"
FOREIGN KEY ("driverId")
REFERENCES "MobilityDriver"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "MobilityRidePayment"
ADD CONSTRAINT "MobilityRidePayment_amounts_non_negative"
CHECK (
    "estimatedFareMinor" >= 0
    AND "finalFareMinor" >= 0
    AND "commissionAmountMinor" >= 0
    AND "driverGrossMinor" >= 0
    AND "driverNetMinor" >= 0
);

ALTER TABLE "MobilityRidePayment"
ADD CONSTRAINT "MobilityRidePayment_rate_valid"
CHECK (
    "commissionRateBps" >= 0
    AND "commissionRateBps" <= 10000
);

ALTER TABLE "MobilityRidePayment"
ADD CONSTRAINT "MobilityRidePayment_financial_math"
CHECK (
    "commissionAmountMinor" <= "finalFareMinor"
    AND "driverGrossMinor" <= "finalFareMinor"
    AND "driverNetMinor" <= "driverGrossMinor"
);

ALTER TABLE "MobilityRidePayment"
ADD CONSTRAINT "MobilityRidePayment_net_math"
CHECK (
    "driverNetMinor" =
    "driverGrossMinor" - "commissionAmountMinor"
);
