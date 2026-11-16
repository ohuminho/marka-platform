ALTER TABLE "FreightProvider"
  ADD COLUMN IF NOT EXISTS "currentLatitude" DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS "currentLongitude" DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS "locationUpdatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "locationAccuracyM" INTEGER;

ALTER TABLE "FreightProvider"
  ADD CONSTRAINT "FreightProvider_location_coordinates_pair_check"
  CHECK (
    ("currentLatitude" IS NULL AND "currentLongitude" IS NULL)
    OR (
      "currentLatitude" IS NOT NULL
      AND "currentLongitude" IS NOT NULL
      AND "currentLatitude" BETWEEN -90 AND 90
      AND "currentLongitude" BETWEEN -180 AND 180
    )
  );

ALTER TABLE "FreightProvider"
  ADD CONSTRAINT "FreightProvider_location_accuracy_check"
  CHECK ("locationAccuracyM" IS NULL OR "locationAccuracyM" BETWEEN 0 AND 100000);
