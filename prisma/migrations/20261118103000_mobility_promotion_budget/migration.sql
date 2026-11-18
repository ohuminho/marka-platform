CREATE TYPE "MobilityPromotionReservationStatus" AS ENUM (
  'RESERVED',
  'COMMITTED',
  'RELEASED'
);

CREATE TABLE "MobilityPromotionCampaign" (
  "id" TEXT NOT NULL,
  "code" VARCHAR(80) NOT NULL,
  "serviceType" VARCHAR(32) NOT NULL,
  "currency" CHAR(3) NOT NULL DEFAULT 'AOA',
  "enabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "budgetMinor" BIGINT NOT NULL,
  "reservedMinor" BIGINT NOT NULL DEFAULT 0,
  "spentMinor" BIGINT NOT NULL DEFAULT 0,
  "minimumPayableFareMinor" BIGINT NOT NULL,
  "longDistanceThresholdMeters" INTEGER NOT NULL DEFAULT 10000,
  "peakHourEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "startsAt" TIMESTAMPTZ(3),
  "endsAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "MobilityPromotionCampaign_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MobilityPromotionCampaign_budget_check"
    CHECK (
      "budgetMinor" >= 0
      AND "reservedMinor" >= 0
      AND "spentMinor" >= 0
      AND ("reservedMinor" + "spentMinor") <= "budgetMinor"
    ),
  CONSTRAINT "MobilityPromotionCampaign_minimum_fare_check"
    CHECK ("minimumPayableFareMinor" >= 0),
  CONSTRAINT "MobilityPromotionCampaign_distance_threshold_check"
    CHECK ("longDistanceThresholdMeters" > 0),
  CONSTRAINT "MobilityPromotionCampaign_dates_check"
    CHECK ("endsAt" IS NULL OR "startsAt" IS NULL OR "endsAt" > "startsAt")
);

CREATE TABLE "MobilityPromotionReservation" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "rideId" TEXT NOT NULL,
  "idempotencyKey" VARCHAR(255) NOT NULL,
  "amountMinor" BIGINT NOT NULL,
  "status" "MobilityPromotionReservationStatus" NOT NULL DEFAULT 'RESERVED',
  "committedAt" TIMESTAMPTZ(3),
  "releasedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "MobilityPromotionReservation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MobilityPromotionReservation_amount_check" CHECK ("amountMinor" > 0),
  CONSTRAINT "MobilityPromotionReservation_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "MobilityPromotionCampaign"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MobilityPromotionReservation_rideId_fkey"
    FOREIGN KEY ("rideId") REFERENCES "MobilityRide"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "MobilityPromotionCampaign_code_key"
  ON "MobilityPromotionCampaign"("code");
CREATE INDEX "MobilityPromotionCampaign_enabled_startsAt_endsAt_idx"
  ON "MobilityPromotionCampaign"("enabled", "startsAt", "endsAt");
CREATE INDEX "MobilityPromotionCampaign_serviceType_enabled_idx"
  ON "MobilityPromotionCampaign"("serviceType", "enabled");

CREATE UNIQUE INDEX "MobilityPromotionReservation_rideId_key"
  ON "MobilityPromotionReservation"("rideId");
CREATE UNIQUE INDEX "MobilityPromotionReservation_idempotencyKey_key"
  ON "MobilityPromotionReservation"("idempotencyKey");
CREATE INDEX "MobilityPromotionReservation_campaignId_status_idx"
  ON "MobilityPromotionReservation"("campaignId", "status");
CREATE INDEX "MobilityPromotionReservation_status_createdAt_idx"
  ON "MobilityPromotionReservation"("status", "createdAt");
