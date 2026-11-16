ALTER TABLE "FreightProvider"
  ADD COLUMN "currentLatitude" DECIMAL(10,7),
  ADD COLUMN "currentLongitude" DECIMAL(10,7),
  ADD COLUMN "locationAccuracyMeters" DECIMAL(10,2),
  ADD COLUMN "locationUpdatedAt" TIMESTAMP(3);

CREATE INDEX "FreightProvider_locationUpdatedAt_idx"
  ON "FreightProvider"("locationUpdatedAt");
