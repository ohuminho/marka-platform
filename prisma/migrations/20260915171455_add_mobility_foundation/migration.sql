-- CreateEnum
CREATE TYPE "MobilityDriverStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'BLOCKED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "MobilityVerificationStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "MobilityVehicleStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'BLOCKED', 'RETIRED');

-- CreateEnum
CREATE TYPE "MobilityVehicleType" AS ENUM ('CAR', 'MOTORCYCLE', 'VAN', 'MINIBUS', 'BUS', 'COACH', 'TRUCK', 'OTHER');

-- CreateEnum
CREATE TYPE "MobilityAvailabilityStatus" AS ENUM ('OFFLINE', 'AVAILABLE', 'BUSY', 'ON_TRIP', 'PAUSED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "MobilityLocationSource" AS ENUM ('GPS', 'NETWORK', 'MANUAL', 'SYSTEM');

-- CreateEnum
CREATE TYPE "MobilityRideStatus" AS ENUM ('REQUESTED', 'SEARCHING', 'MATCHED', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'TRIP_STARTED', 'TRIP_IN_PROGRESS', 'TRIP_COMPLETED', 'CANCELLED', 'EXPIRED', 'NO_DRIVER_FOUND', 'FAILED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "MobilityRideStopType" AS ENUM ('PICKUP', 'STOP', 'DROPOFF');

-- CreateTable
CREATE TABLE "MobilityDriver" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "MobilityDriverStatus" NOT NULL DEFAULT 'PENDING',
    "licenseNumber" TEXT,
    "countryCode" TEXT,
    "displayName" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobilityDriver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobilityDriverVerification" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "status" "MobilityVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "documentType" TEXT NOT NULL,
    "documentRef" TEXT,
    "documentExpiry" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "rejectionReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobilityDriverVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobilityVehicle" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" "MobilityVehicleStatus" NOT NULL DEFAULT 'PENDING',
    "type" "MobilityVehicleType" NOT NULL,
    "registrationNumber" TEXT,
    "make" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "color" TEXT,
    "capacity" INTEGER,
    "countryCode" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobilityVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobilityDriverVehicle" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "activeFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activeUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobilityDriverVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobilityVehicleVerification" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "status" "MobilityVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "documentType" TEXT NOT NULL,
    "documentRef" TEXT,
    "documentExpiry" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "rejectionReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobilityVehicleVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobilityDriverAvailability" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "status" "MobilityAvailabilityStatus" NOT NULL DEFAULT 'OFFLINE',
    "lastOnlineAt" TIMESTAMP(3),
    "lastOfflineAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobilityDriverAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobilityLocation" (
    "id" TEXT NOT NULL,
    "driverId" TEXT,
    "vehicleId" TEXT,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "accuracyM" DECIMAL(10,2),
    "heading" DECIMAL(6,2),
    "speedKph" DECIMAL(10,2),
    "source" "MobilityLocationSource" NOT NULL DEFAULT 'GPS',
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobilityLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobilityRide" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "driverId" TEXT,
    "vehicleId" TEXT,
    "status" "MobilityRideStatus" NOT NULL DEFAULT 'REQUESTED',
    "reference" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'AOA',
    "pickupLatitude" DECIMAL(10,7) NOT NULL,
    "pickupLongitude" DECIMAL(10,7) NOT NULL,
    "pickupAddress" TEXT,
    "dropoffLatitude" DECIMAL(10,7) NOT NULL,
    "dropoffLongitude" DECIMAL(10,7) NOT NULL,
    "dropoffAddress" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "matchedAt" TIMESTAMP(3),
    "driverAssignedAt" TIMESTAMP(3),
    "driverArrivedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobilityRide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobilityRideStop" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "type" "MobilityRideStopType" NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "address" TEXT,
    "arrivedAt" TIMESTAMP(3),
    "departedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobilityRideStop_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MobilityDriver_userId_key" ON "MobilityDriver"("userId");

-- CreateIndex
CREATE INDEX "MobilityDriver_organizationId_idx" ON "MobilityDriver"("organizationId");

-- CreateIndex
CREATE INDEX "MobilityDriver_status_idx" ON "MobilityDriver"("status");

-- CreateIndex
CREATE INDEX "MobilityDriverVerification_driverId_idx" ON "MobilityDriverVerification"("driverId");

-- CreateIndex
CREATE INDEX "MobilityDriverVerification_status_idx" ON "MobilityDriverVerification"("status");

-- CreateIndex
CREATE INDEX "MobilityDriverVerification_documentExpiry_idx" ON "MobilityDriverVerification"("documentExpiry");

-- CreateIndex
CREATE INDEX "MobilityVehicle_organizationId_idx" ON "MobilityVehicle"("organizationId");

-- CreateIndex
CREATE INDEX "MobilityVehicle_status_idx" ON "MobilityVehicle"("status");

-- CreateIndex
CREATE INDEX "MobilityVehicle_type_idx" ON "MobilityVehicle"("type");

-- CreateIndex
CREATE INDEX "MobilityVehicle_registrationNumber_idx" ON "MobilityVehicle"("registrationNumber");

-- CreateIndex
CREATE INDEX "MobilityDriverVehicle_driverId_idx" ON "MobilityDriverVehicle"("driverId");

-- CreateIndex
CREATE INDEX "MobilityDriverVehicle_vehicleId_idx" ON "MobilityDriverVehicle"("vehicleId");

-- CreateIndex
CREATE INDEX "MobilityDriverVehicle_isPrimary_idx" ON "MobilityDriverVehicle"("isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "MobilityDriverVehicle_driverId_vehicleId_key" ON "MobilityDriverVehicle"("driverId", "vehicleId");

-- CreateIndex
CREATE INDEX "MobilityVehicleVerification_vehicleId_idx" ON "MobilityVehicleVerification"("vehicleId");

-- CreateIndex
CREATE INDEX "MobilityVehicleVerification_status_idx" ON "MobilityVehicleVerification"("status");

-- CreateIndex
CREATE INDEX "MobilityVehicleVerification_documentExpiry_idx" ON "MobilityVehicleVerification"("documentExpiry");

-- CreateIndex
CREATE UNIQUE INDEX "MobilityDriverAvailability_driverId_key" ON "MobilityDriverAvailability"("driverId");

-- CreateIndex
CREATE INDEX "MobilityDriverAvailability_status_idx" ON "MobilityDriverAvailability"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MobilityLocation_driverId_key" ON "MobilityLocation"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "MobilityLocation_vehicleId_key" ON "MobilityLocation"("vehicleId");

-- CreateIndex
CREATE INDEX "MobilityLocation_recordedAt_idx" ON "MobilityLocation"("recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MobilityRide_reference_key" ON "MobilityRide"("reference");

-- CreateIndex
CREATE INDEX "MobilityRide_organizationId_idx" ON "MobilityRide"("organizationId");

-- CreateIndex
CREATE INDEX "MobilityRide_riderId_idx" ON "MobilityRide"("riderId");

-- CreateIndex
CREATE INDEX "MobilityRide_driverId_idx" ON "MobilityRide"("driverId");

-- CreateIndex
CREATE INDEX "MobilityRide_vehicleId_idx" ON "MobilityRide"("vehicleId");

-- CreateIndex
CREATE INDEX "MobilityRide_status_idx" ON "MobilityRide"("status");

-- CreateIndex
CREATE INDEX "MobilityRide_requestedAt_idx" ON "MobilityRide"("requestedAt");

-- CreateIndex
CREATE INDEX "MobilityRideStop_rideId_idx" ON "MobilityRideStop"("rideId");

-- CreateIndex
CREATE INDEX "MobilityRideStop_type_idx" ON "MobilityRideStop"("type");

-- CreateIndex
CREATE UNIQUE INDEX "MobilityRideStop_rideId_sequence_key" ON "MobilityRideStop"("rideId", "sequence");

-- AddForeignKey
ALTER TABLE "MobilityDriver" ADD CONSTRAINT "MobilityDriver_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobilityDriver" ADD CONSTRAINT "MobilityDriver_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobilityDriverVerification" ADD CONSTRAINT "MobilityDriverVerification_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "MobilityDriver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobilityVehicle" ADD CONSTRAINT "MobilityVehicle_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobilityDriverVehicle" ADD CONSTRAINT "MobilityDriverVehicle_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "MobilityDriver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobilityDriverVehicle" ADD CONSTRAINT "MobilityDriverVehicle_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "MobilityVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobilityVehicleVerification" ADD CONSTRAINT "MobilityVehicleVerification_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "MobilityVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobilityDriverAvailability" ADD CONSTRAINT "MobilityDriverAvailability_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "MobilityDriver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobilityLocation" ADD CONSTRAINT "MobilityLocation_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "MobilityDriver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobilityLocation" ADD CONSTRAINT "MobilityLocation_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "MobilityVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobilityRide" ADD CONSTRAINT "MobilityRide_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobilityRide" ADD CONSTRAINT "MobilityRide_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobilityRide" ADD CONSTRAINT "MobilityRide_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "MobilityDriver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobilityRide" ADD CONSTRAINT "MobilityRide_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "MobilityVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobilityRideStop" ADD CONSTRAINT "MobilityRideStop_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "MobilityRide"("id") ON DELETE CASCADE ON UPDATE CASCADE;
