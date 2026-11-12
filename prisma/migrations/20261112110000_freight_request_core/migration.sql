CREATE TYPE "FreightRequestType" AS ENUM ('CARGO_SHIPMENT','WATER_DELIVERY','ROADSIDE_ASSISTANCE');
CREATE TYPE "FreightRequestStatus" AS ENUM ('REQUESTED','QUOTED','AWAITING_PAYMENT','PAID','SEARCHING_PROVIDER','ASSIGNED','PROVIDER_EN_ROUTE','PROVIDER_ARRIVED','PICKED_UP','IN_TRANSIT','COMPLETED','CANCELLED','EXCEPTION');
CREATE TABLE "FreightRequest" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "requestType" "FreightRequestType" NOT NULL,
  "status" "FreightRequestStatus" NOT NULL DEFAULT 'REQUESTED',
  "originLatitude" DECIMAL(10,7),
  "originLongitude" DECIMAL(10,7),
  "originAddress" TEXT,
  "destinationLatitude" DECIMAL(10,7),
  "destinationLongitude" DECIMAL(10,7),
  "destinationAddress" TEXT,
  "quantity" DECIMAL(20,4),
  "quantityUnit" TEXT,
  "currency" CHAR(3) NOT NULL DEFAULT 'AOA',
  "quotedAmount" DECIMAL(20,4),
  "quoteExpiresAt" TIMESTAMP(3),
  "paymentReference" TEXT,
  "paidAt" TIMESTAMP(3),
  "idempotencyKey" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FreightRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FreightRequest_valid_origin_latitude" CHECK ("originLatitude" IS NULL OR ("originLatitude" >= -90 AND "originLatitude" <= 90)),
  CONSTRAINT "FreightRequest_valid_origin_longitude" CHECK ("originLongitude" IS NULL OR ("originLongitude" >= -180 AND "originLongitude" <= 180)),
  CONSTRAINT "FreightRequest_valid_destination_latitude" CHECK ("destinationLatitude" IS NULL OR ("destinationLatitude" >= -90 AND "destinationLatitude" <= 90)),
  CONSTRAINT "FreightRequest_valid_destination_longitude" CHECK ("destinationLongitude" IS NULL OR ("destinationLongitude" >= -180 AND "destinationLongitude" <= 180)),
  CONSTRAINT "FreightRequest_nonnegative_quantity" CHECK ("quantity" IS NULL OR "quantity" > 0),
  CONSTRAINT "FreightRequest_nonnegative_quote" CHECK ("quotedAmount" IS NULL OR "quotedAmount" >= 0)
);
CREATE UNIQUE INDEX "FreightRequest_reference_key" ON "FreightRequest"("reference");
CREATE UNIQUE INDEX "FreightRequest_org_requester_idempotency_key" ON "FreightRequest"("organizationId","requesterId","idempotencyKey");
CREATE INDEX "FreightRequest_organizationId_status_createdAt_idx" ON "FreightRequest"("organizationId","status","createdAt");
CREATE INDEX "FreightRequest_requesterId_createdAt_idx" ON "FreightRequest"("requesterId","createdAt");
CREATE INDEX "FreightRequest_requestType_status_idx" ON "FreightRequest"("requestType","status");
ALTER TABLE "FreightRequest"
  ADD CONSTRAINT "FreightRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "FreightRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FreightRequest" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "FreightRequest" FROM anon, authenticated;
