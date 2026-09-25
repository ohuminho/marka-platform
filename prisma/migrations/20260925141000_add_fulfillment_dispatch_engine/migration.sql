CREATE TYPE "FulfillmentStatus" AS ENUM (
  'REQUESTED',
  'ASSIGNED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'PICKED_UP',
  'IN_TRANSIT',
  'COMPLETED',
  'EXCEPTION',
  'CANCELLED'
);

CREATE TYPE "DispatchServiceType" AS ENUM (
  'DELIVERY',
  'MOBILITY',
  'FREIGHT'
);

CREATE TYPE "DispatchStatus" AS ENUM (
  'CREATED',
  'SEARCHING',
  'OFFERED',
  'ASSIGNED',
  'ACCEPTED',
  'REASSIGNING',
  'COMPLETED',
  'CANCELLED',
  'EXPIRED'
);

CREATE TABLE "FulfillmentRequest" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "pickupType" TEXT NOT NULL,
  "pickupId" TEXT NOT NULL,
  "destinationType" TEXT NOT NULL,
  "destinationId" TEXT NOT NULL,
  "status" "FulfillmentStatus" NOT NULL DEFAULT 'REQUESTED',
  "assignedAgentId" TEXT,
  "exceptionCode" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FulfillmentRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DispatchRequest" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "serviceType" "DispatchServiceType" NOT NULL,
  "subjectType" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "originLatitude" DECIMAL(10,7) NOT NULL,
  "originLongitude" DECIMAL(10,7) NOT NULL,
  "destinationLatitude" DECIMAL(10,7),
  "destinationLongitude" DECIMAL(10,7),
  "status" "DispatchStatus" NOT NULL DEFAULT 'CREATED',
  "candidatePolicyRef" TEXT,
  "assignedAgentId" TEXT,
  "acceptedAgentId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DispatchRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DispatchCandidate" (
  "id" TEXT NOT NULL,
  "dispatchRequestId" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "score" DOUBLE PRECISION,
  "distanceMeters" DOUBLE PRECISION,
  "available" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DispatchCandidate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FulfillmentAssignment" (
  "id" TEXT NOT NULL,
  "fulfillmentId" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt" TIMESTAMP(3),

  CONSTRAINT "FulfillmentAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FulfillmentRequest_orderId_key"
  ON "FulfillmentRequest"("orderId");

CREATE INDEX "FulfillmentRequest_organizationId_status_idx"
  ON "FulfillmentRequest"("organizationId", "status");

CREATE INDEX "FulfillmentRequest_orderId_idx"
  ON "FulfillmentRequest"("orderId");

CREATE INDEX "FulfillmentRequest_assignedAgentId_idx"
  ON "FulfillmentRequest"("assignedAgentId");

CREATE INDEX "DispatchRequest_organizationId_status_idx"
  ON "DispatchRequest"("organizationId", "status");

CREATE INDEX "DispatchRequest_serviceType_status_idx"
  ON "DispatchRequest"("serviceType", "status");

CREATE INDEX "DispatchRequest_subjectId_idx"
  ON "DispatchRequest"("subjectId");

CREATE INDEX "DispatchRequest_assignedAgentId_idx"
  ON "DispatchRequest"("assignedAgentId");

CREATE INDEX "DispatchCandidate_dispatchRequestId_idx"
  ON "DispatchCandidate"("dispatchRequestId");

CREATE INDEX "DispatchCandidate_agentId_idx"
  ON "DispatchCandidate"("agentId");

CREATE UNIQUE INDEX "FulfillmentAssignment_fulfillmentId_key"
  ON "FulfillmentAssignment"("fulfillmentId");

ALTER TABLE "FulfillmentRequest"
  ADD CONSTRAINT "FulfillmentRequest_organizationId_fkey"
  FOREIGN KEY ("organizationId")
  REFERENCES "Organization"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "FulfillmentRequest"
  ADD CONSTRAINT "FulfillmentRequest_orderId_fkey"
  FOREIGN KEY ("orderId")
  REFERENCES "Order"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "FulfillmentAssignment"
  ADD CONSTRAINT "FulfillmentAssignment_fulfillmentId_fkey"
  FOREIGN KEY ("fulfillmentId")
  REFERENCES "FulfillmentRequest"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "DispatchRequest"
  ADD CONSTRAINT "DispatchRequest_organizationId_fkey"
  FOREIGN KEY ("organizationId")
  REFERENCES "Organization"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "DispatchCandidate"
  ADD CONSTRAINT "DispatchCandidate_dispatchRequestId_fkey"
  FOREIGN KEY ("dispatchRequestId")
  REFERENCES "DispatchRequest"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
