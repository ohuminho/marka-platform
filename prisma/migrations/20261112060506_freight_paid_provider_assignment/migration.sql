ALTER TABLE "FreightRequest"
  ADD COLUMN "assignedProviderId" TEXT,
  ADD COLUMN "assignedVehicleId" TEXT,
  ADD COLUMN "assignedAt" TIMESTAMP(3);

CREATE INDEX "FreightRequest_assignedProviderId_status_idx"
  ON "FreightRequest"("assignedProviderId", "status");
