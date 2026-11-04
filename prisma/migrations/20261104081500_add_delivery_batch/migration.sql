CREATE TYPE "DeliveryBatchStatus" AS ENUM (
  'READY', 'OFFERED', 'ACCEPTED', 'PICKING_UP',
  'IN_TRANSIT', 'COMPLETED', 'CANCELLED', 'EXCEPTION'
);

CREATE TYPE "DeliveryBatchLegStatus" AS ENUM (
  'PENDING', 'ARRIVED_AT_PICKUP', 'PICKED_UP', 'DELIVERED', 'CANCELLED'
);

CREATE TABLE "DeliveryBatch" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "destinationHash" TEXT NOT NULL,
  "destinationAddress" TEXT NOT NULL,
  "destinationLatitude" DECIMAL(10,7) NOT NULL,
  "destinationLongitude" DECIMAL(10,7) NOT NULL,
  "status" "DeliveryBatchStatus" NOT NULL DEFAULT 'READY',
  "assignedAgentId" TEXT,
  "dispatchRequestId" TEXT,
  "pickupCount" INTEGER NOT NULL,
  "routeDistanceMeters" INTEGER,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeliveryBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeliveryBatchLeg" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "fulfillmentId" TEXT NOT NULL,
  "pickupSequence" INTEGER NOT NULL,
  "pickupStoreId" TEXT NOT NULL,
  "pickupLatitude" DECIMAL(10,7) NOT NULL,
  "pickupLongitude" DECIMAL(10,7) NOT NULL,
  "status" "DeliveryBatchLegStatus" NOT NULL DEFAULT 'PENDING',
  "proofCodeHash" TEXT,
  "pickedUpAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeliveryBatchLeg_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeliveryBatch_dispatchRequestId_key" ON "DeliveryBatch"("dispatchRequestId");
CREATE INDEX "DeliveryBatch_organizationId_status_createdAt_idx" ON "DeliveryBatch"("organizationId", "status", "createdAt");
CREATE INDEX "DeliveryBatch_customerId_destinationHash_status_idx" ON "DeliveryBatch"("customerId", "destinationHash", "status");
CREATE INDEX "DeliveryBatch_assignedAgentId_idx" ON "DeliveryBatch"("assignedAgentId");
CREATE UNIQUE INDEX "DeliveryBatchLeg_fulfillmentId_key" ON "DeliveryBatchLeg"("fulfillmentId");
CREATE UNIQUE INDEX "DeliveryBatchLeg_batchId_pickupSequence_key" ON "DeliveryBatchLeg"("batchId", "pickupSequence");
CREATE INDEX "DeliveryBatchLeg_batchId_status_idx" ON "DeliveryBatchLeg"("batchId", "status");

ALTER TABLE "DeliveryBatch"
  ADD CONSTRAINT "DeliveryBatch_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DeliveryBatchLeg"
  ADD CONSTRAINT "DeliveryBatchLeg_batchId_fkey"
  FOREIGN KEY ("batchId") REFERENCES "DeliveryBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DeliveryBatchLeg"
  ADD CONSTRAINT "DeliveryBatchLeg_fulfillmentId_fkey"
  FOREIGN KEY ("fulfillmentId") REFERENCES "FulfillmentRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
