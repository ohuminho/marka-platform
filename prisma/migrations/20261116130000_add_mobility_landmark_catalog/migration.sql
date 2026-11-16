CREATE TABLE "MobilityLandmark" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(180) NOT NULL,
  "normalizedName" VARCHAR(180) NOT NULL,
  "aliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "countryCode" CHAR(2) NOT NULL DEFAULT 'AO',
  "province" VARCHAR(100),
  "municipality" VARCHAR(120),
  "category" VARCHAR(48) NOT NULL DEFAULT 'PLACE',
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "source" VARCHAR(32) NOT NULL DEFAULT 'VERIFIED',
  "sourceRef" VARCHAR(255),
  "verifiedAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MobilityLandmark_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MobilityLandmark_latitude_check" CHECK ("latitude" >= -90 AND "latitude" <= 90),
  CONSTRAINT "MobilityLandmark_longitude_check" CHECK ("longitude" >= -180 AND "longitude" <= 180)
);

CREATE UNIQUE INDEX "MobilityLandmark_normalizedName_municipality_key"
  ON "MobilityLandmark"("normalizedName", "municipality");
CREATE INDEX "MobilityLandmark_normalizedName_idx"
  ON "MobilityLandmark"("normalizedName");
CREATE INDEX "MobilityLandmark_countryCode_province_municipality_idx"
  ON "MobilityLandmark"("countryCode", "province", "municipality");
CREATE INDEX "MobilityLandmark_isActive_category_idx"
  ON "MobilityLandmark"("isActive", "category");
CREATE INDEX "MobilityLandmark_aliases_gin_idx"
  ON "MobilityLandmark" USING GIN ("aliases");
