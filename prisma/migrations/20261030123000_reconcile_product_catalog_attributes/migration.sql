-- Reconcile the production Product table with prisma/schema.prisma.
-- Existing catalog rows remain valid; attributes are optional JSONB metadata.
ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "attributes" JSONB;
