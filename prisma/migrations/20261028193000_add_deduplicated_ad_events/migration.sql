DO $$ BEGIN
  CREATE TYPE "AdvertisementEventType" AS ENUM ('IMPRESSION', 'CLICK');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "AdvertisementEvent" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "eventType" "AdvertisementEventType" NOT NULL,
  "eventDay" CHAR(10) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdvertisementEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AdvertisementEvent_campaignId_userId_eventType_eventDay_key"
  ON "AdvertisementEvent" ("campaignId", "userId", "eventType", "eventDay");

CREATE INDEX IF NOT EXISTS "AdvertisementEvent_campaignId_eventType_createdAt_idx"
  ON "AdvertisementEvent" ("campaignId", "eventType", "createdAt");

ALTER TABLE "AdvertisementEvent" ENABLE ROW LEVEL SECURITY;