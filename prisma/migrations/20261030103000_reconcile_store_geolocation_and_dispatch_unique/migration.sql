-- Reconcile production schema with Prisma Store and DispatchRequest models.
-- These columns are nullable because existing stores may not have geocoded addresses yet.
ALTER TABLE "Store"
  ADD COLUMN IF NOT EXISTS "latitude" DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS "longitude" DECIMAL(10,7);

-- Enforce one dispatch request per domain subject, matching @@unique in schema.prisma.
CREATE UNIQUE INDEX IF NOT EXISTS "DispatchRequest_subjectType_subjectId_key"
  ON "DispatchRequest"("subjectType", "subjectId");
