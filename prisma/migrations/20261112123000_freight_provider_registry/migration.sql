CREATE TYPE "FreightProviderStatus" AS ENUM ('PENDING','IN_REVIEW','VERIFIED','SUSPENDED','BLOCKED');
CREATE TYPE "FreightProviderAvailability" AS ENUM ('OFFLINE','AVAILABLE','BUSY','PAUSED');
CREATE TYPE "FreightProviderVehicleStatus" AS ENUM ('PENDING','ACTIVE','SUSPENDED','BLOCKED','RETIRED');
CREATE TYPE "FreightVehicleKind" AS ENUM ('CARGO_TRICYCLE','PICKUP','CARGO_VAN','LIGHT_TRUCK','FLATBED_TRUCK','TIPPER_TRUCK','HEAVY_TRUCK','WATER_TANKER','TOW_TRUCK','SERVICE_VEHICLE','SPECIALIZED');
CREATE TYPE "FreightCapacityUnit" AS ENUM ('KG','TON','M3','LITRE');
CREATE TYPE "FreightWaterType" AS ENUM ('POTABLE_WATER','NON_POTABLE_WATER');

CREATE TABLE "FreightProvider" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "FreightProviderStatus" NOT NULL DEFAULT 'PENDING',
  "availability" "FreightProviderAvailability" NOT NULL DEFAULT 'OFFLINE',
  "displayName" TEXT NOT NULL,
  "legalName" TEXT,
  "phone" TEXT,
  "taxNumber" TEXT,
  "serviceTypes" "FreightRequestType"[] NOT NULL DEFAULT ARRAY[]::"FreightRequestType"[],
  "coverageAreas" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "ratingAverage" DECIMAL(3,2),
  "ratingCount" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FreightProvider_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FreightProvider_rating_range" CHECK ("ratingAverage" IS NULL OR ("ratingAverage" >= 0 AND "ratingAverage" <= 5)),
  CONSTRAINT "FreightProvider_rating_count_nonnegative" CHECK ("ratingCount" >= 0)
);

CREATE TABLE "FreightProviderVehicle" (
  "id" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "kind" "FreightVehicleKind" NOT NULL,
  "status" "FreightProviderVehicleStatus" NOT NULL DEFAULT 'PENDING',
  "registrationNumber" TEXT,
  "make" TEXT,
  "model" TEXT,
  "year" INTEGER,
  "color" TEXT,
  "capacity" DECIMAL(20,4),
  "capacityUnit" "FreightCapacityUnit",
  "waterType" "FreightWaterType",
  "cargoBody" TEXT,
  "serviceAreas" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FreightProviderVehicle_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FreightProviderVehicle_positive_capacity" CHECK ("capacity" IS NULL OR "capacity" > 0),
  CONSTRAINT "FreightProviderVehicle_year_range" CHECK ("year" IS NULL OR ("year" >= 1950 AND "year" <= 2100)),
  CONSTRAINT "FreightProviderVehicle_tanker_water_type" CHECK ("kind" <> 'WATER_TANKER' OR "waterType" IS NOT NULL)
);

CREATE UNIQUE INDEX "FreightProvider_organizationId_userId_key" ON "FreightProvider"("organizationId","userId");
CREATE INDEX "FreightProvider_organizationId_status_availability_idx" ON "FreightProvider"("organizationId","status","availability");
CREATE INDEX "FreightProvider_userId_idx" ON "FreightProvider"("userId");
CREATE INDEX "FreightProviderVehicle_providerId_status_idx" ON "FreightProviderVehicle"("providerId","status");
CREATE INDEX "FreightProviderVehicle_kind_status_idx" ON "FreightProviderVehicle"("kind","status");
CREATE INDEX "FreightProviderVehicle_registrationNumber_idx" ON "FreightProviderVehicle"("registrationNumber");

ALTER TABLE "FreightProvider"
  ADD CONSTRAINT "FreightProvider_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "FreightProvider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FreightProviderVehicle"
  ADD CONSTRAINT "FreightProviderVehicle_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "FreightProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FreightProvider" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FreightProviderVehicle" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "FreightProvider" FROM anon, authenticated;
REVOKE ALL ON TABLE "FreightProviderVehicle" FROM anon, authenticated;
