-- Add real store coordinates for delivery dispatch origin.
ALTER TABLE "Store"
  ADD COLUMN "latitude" DECIMAL(10,7),
  ADD COLUMN "longitude" DECIMAL(10,7);

-- Prevent duplicate dispatch requests for the same domain subject.
CREATE UNIQUE INDEX "DispatchRequest_subjectType_subjectId_key"
  ON "DispatchRequest"("subjectType", "subjectId");
