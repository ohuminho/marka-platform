-- Add first-class delivery agents without coupling delivery to mobility drivers.
CREATE TYPE "DeliveryAgentStatus" AS ENUM (
  'PENDING',
  'ACTIVE',
  'SUSPENDED',
  'BLOCKED',
  'INACTIVE'
);

CREATE TYPE "DeliveryAgentAvailabilityStatus" AS ENUM (
  'OFFLINE',
  'AVAILABLE',
  'BUSY',
  'SUSPENDED'
);

CREATE TYPE "DeliveryTransportMode" AS ENUM (
  'WALK',
  'BICYCLE',
  'MOTORCYCLE',
  'CAR',
  'VAN'
);

CREATE TABLE "DeliveryAgent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "DeliveryAgentStatus" NOT NULL DEFAULT 'PENDING',
  "availability" "DeliveryAgentAvailabilityStatus" NOT NULL DEFAULT 'OFFLINE',
  "transportMode" "DeliveryTransportMode" NOT NULL,
  "displayName" TEXT,
  "phone" TEXT,
  "latitude" DECIMAL(10,7),
  "longitude" DECIMAL(10,7),
  "lastLocationAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DeliveryAgent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeliveryAgent_userId_key"
  ON "DeliveryAgent"("userId");

CREATE INDEX "DeliveryAgent_organizationId_idx"
  ON "DeliveryAgent"("organizationId");

CREATE INDEX "DeliveryAgent_status_idx"
  ON "DeliveryAgent"("status");

CREATE INDEX "DeliveryAgent_availability_idx"
  ON "DeliveryAgent"("availability");

CREATE INDEX "DeliveryAgent_transportMode_idx"
  ON "DeliveryAgent"("transportMode");

CREATE INDEX "DeliveryAgent_lastLocationAt_idx"
  ON "DeliveryAgent"("lastLocationAt");

ALTER TABLE "DeliveryAgent"
  ADD CONSTRAINT "DeliveryAgent_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DeliveryAgent"
  ADD CONSTRAINT "DeliveryAgent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
