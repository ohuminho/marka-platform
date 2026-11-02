CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TYPE "SpaceBookingStatus" AS ENUM ('REQUESTED','ACCEPTED','DECLINED','PAYMENT_PENDING','CONFIRMED','CANCELLED','EXPIRED','COMPLETED');
CREATE TYPE "SpaceAvailabilityExceptionType" AS ENUM ('CLOSED','OPEN');
CREATE TABLE "SpaceBooking" (
 "id" TEXT NOT NULL, "reference" TEXT NOT NULL, "productId" TEXT NOT NULL, "customerId" TEXT NOT NULL,
 "status" "SpaceBookingStatus" NOT NULL DEFAULT 'REQUESTED',
 "startAt" TIMESTAMPTZ(3) NOT NULL, "endAt" TIMESTAMPTZ(3) NOT NULL, "timezone" TEXT NOT NULL,
 "participantCount" INTEGER NOT NULL, "currency" CHAR(3) NOT NULL DEFAULT 'AOA',
 "totalAmount" DECIMAL(20,4) NOT NULL, "priceSnapshot" JSONB NOT NULL,
 "customerNote" TEXT, "ownerNote" TEXT, "holdExpiresAt" TIMESTAMPTZ(3),
 "acceptedAt" TIMESTAMP(3), "confirmedAt" TIMESTAMP(3), "cancelledAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "SpaceBooking_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "SpaceBooking_valid_interval" CHECK ("endAt" > "startAt"),
 CONSTRAINT "SpaceBooking_valid_participants" CHECK ("participantCount" > 0),
 CONSTRAINT "SpaceBooking_nonnegative_amount" CHECK ("totalAmount" >= 0)
);
CREATE UNIQUE INDEX "SpaceBooking_reference_key" ON "SpaceBooking"("reference");
CREATE INDEX "SpaceBooking_productId_startAt_endAt_idx" ON "SpaceBooking"("productId","startAt","endAt");
CREATE INDEX "SpaceBooking_customerId_createdAt_idx" ON "SpaceBooking"("customerId","createdAt");
CREATE INDEX "SpaceBooking_status_holdExpiresAt_idx" ON "SpaceBooking"("status","holdExpiresAt");
ALTER TABLE "SpaceBooking" ADD CONSTRAINT "SpaceBooking_no_overlapping_active_slots"
 EXCLUDE USING GIST ("productId" WITH =, tstzrange("startAt","endAt",'[)') WITH &&)
 WHERE ("status" IN ('ACCEPTED','PAYMENT_PENDING','CONFIRMED','COMPLETED'));
CREATE TABLE "SpaceAvailabilityRule" (
 "id" TEXT NOT NULL, "productId" TEXT NOT NULL, "weekday" INTEGER NOT NULL,
 "startTime" TEXT NOT NULL, "endTime" TEXT NOT NULL, "timezone" TEXT NOT NULL,
 "activeFrom" DATE, "activeUntil" DATE, "isActive" BOOLEAN NOT NULL DEFAULT true,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "SpaceAvailabilityRule_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "SpaceAvailabilityRule_weekday_check" CHECK ("weekday" BETWEEN 0 AND 6),
 CONSTRAINT "SpaceAvailabilityRule_time_check" CHECK ("endTime" > "startTime"),
 CONSTRAINT "SpaceAvailabilityRule_date_check" CHECK ("activeUntil" IS NULL OR "activeFrom" IS NULL OR "activeUntil" >= "activeFrom")
);
CREATE INDEX "SpaceAvailabilityRule_productId_weekday_isActive_idx" ON "SpaceAvailabilityRule"("productId","weekday","isActive");
CREATE TABLE "SpaceAvailabilityException" (
 "id" TEXT NOT NULL, "productId" TEXT NOT NULL, "type" "SpaceAvailabilityExceptionType" NOT NULL,
 "startAt" TIMESTAMPTZ(3) NOT NULL, "endAt" TIMESTAMPTZ(3) NOT NULL, "reason" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "SpaceAvailabilityException_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "SpaceAvailabilityException_valid_interval" CHECK ("endAt" > "startAt")
);
CREATE INDEX "SpaceAvailabilityException_productId_startAt_endAt_idx" ON "SpaceAvailabilityException"("productId","startAt","endAt");
CREATE TABLE "SpaceBookingEvent" (
 "id" TEXT NOT NULL, "bookingId" TEXT NOT NULL, "actorUserId" TEXT, "action" TEXT NOT NULL,
 "fromStatus" "SpaceBookingStatus", "toStatus" "SpaceBookingStatus" NOT NULL,
 "idempotencyKey" TEXT NOT NULL, "metadata" JSONB,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "SpaceBookingEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SpaceBookingEvent_idempotencyKey_key" ON "SpaceBookingEvent"("idempotencyKey");
CREATE INDEX "SpaceBookingEvent_bookingId_createdAt_idx" ON "SpaceBookingEvent"("bookingId","createdAt");
CREATE INDEX "SpaceBookingEvent_actorUserId_createdAt_idx" ON "SpaceBookingEvent"("actorUserId","createdAt");
ALTER TABLE "Payment" ADD COLUMN "spaceBookingId" TEXT;
CREATE UNIQUE INDEX "Payment_spaceBookingId_key" ON "Payment"("spaceBookingId");
ALTER TABLE "SpaceBooking"
 ADD CONSTRAINT "SpaceBooking_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 ADD CONSTRAINT "SpaceBooking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SpaceAvailabilityRule" ADD CONSTRAINT "SpaceAvailabilityRule_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SpaceAvailabilityException" ADD CONSTRAINT "SpaceAvailabilityException_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SpaceBookingEvent" ADD CONSTRAINT "SpaceBookingEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "SpaceBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_spaceBookingId_fkey" FOREIGN KEY ("spaceBookingId") REFERENCES "SpaceBooking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- New booking tables are backend-only. Keep the Supabase Data API deny-by-default.
ALTER TABLE "SpaceBooking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SpaceAvailabilityRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SpaceAvailabilityException" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SpaceBookingEvent" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE "SpaceBooking","SpaceAvailabilityRule","SpaceAvailabilityException","SpaceBookingEvent" FROM anon, authenticated;
