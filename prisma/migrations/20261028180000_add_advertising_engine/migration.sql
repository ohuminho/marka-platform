CREATE TYPE "AdvertisementCampaignStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'PAUSED', 'REJECTED', 'ENDED');
CREATE TYPE "AdvertisementPlacement" AS ENUM ('MOBILITY_TRIP', 'MARKETPLACE_FEED', 'MARKETPLACE_PRODUCT', 'COMMUNITY_FEED');
CREATE TYPE "AdvertisementCreativeType" AS ENUM ('IMAGE', 'VIDEO', 'NATIVE');

CREATE TABLE "AdvertisementCampaign" (
  "id" TEXT NOT NULL,
  "advertiserName" TEXT NOT NULL,
  "headline" TEXT NOT NULL,
  "description" TEXT,
  "placement" "AdvertisementPlacement" NOT NULL,
  "creativeType" "AdvertisementCreativeType" NOT NULL,
  "creativeUrl" TEXT,
  "thumbnailUrl" TEXT,
  "destinationUrl" TEXT,
  "status" "AdvertisementCampaignStatus" NOT NULL DEFAULT 'DRAFT',
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "dailyBudgetMinor" BIGINT,
  "totalBudgetMinor" BIGINT,
  "currency" CHAR(3) NOT NULL DEFAULT 'AOA',
  "maxImpressions" INTEGER,
  "impressions" INTEGER NOT NULL DEFAULT 0,
  "clicks" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdvertisementCampaign_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdvertisementCampaign_placement_status_startsAt_endsAt_idx"
ON "AdvertisementCampaign"("placement", "status", "startsAt", "endsAt");
CREATE INDEX "AdvertisementCampaign_status_createdAt_idx"
ON "AdvertisementCampaign"("status", "createdAt");

-- Campaigns are managed through the trusted server API, not public Supabase client access.
ALTER TABLE "AdvertisementCampaign" ENABLE ROW LEVEL SECURITY;
