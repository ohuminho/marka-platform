-- Make store publication independent from verification.
-- Pending legacy applications become visible; suspended/closed records remain untouched.
-- Publish stocked draft listings that were held only because the legacy store application was pending.
UPDATE "Product" AS product
SET "status" = 'ACTIVE', "updatedAt" = CURRENT_TIMESTAMP
FROM "Store" AS store
JOIN "Vendor" AS vendor ON vendor."id" = store."vendorId"
WHERE product."storeId" = store."id"
  AND product."status" = 'DRAFT'
  AND product."stock" > 0
  AND (vendor."status" = 'PENDING' OR store."status" = 'INACTIVE');

UPDATE "Vendor"
SET "status" = 'ACTIVE', "updatedAt" = CURRENT_TIMESTAMP
WHERE "status" = 'PENDING';

UPDATE "Store" AS store
SET "status" = 'ACTIVE', "updatedAt" = CURRENT_TIMESTAMP
FROM "Vendor" AS vendor
WHERE store."vendorId" = vendor."id"
  AND vendor."status" = 'ACTIVE'
  AND store."status" = 'INACTIVE';

-- Ownership claims are reviewed separately and never transfer ownership automatically.
CREATE TABLE "StoreClaimRequest" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "claimantUserId" TEXT NOT NULL,
  "claimantName" TEXT NOT NULL,
  "claimantPhone" TEXT NOT NULL,
  "claimantEmail" TEXT,
  "businessType" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
  "reason" TEXT NOT NULL,
  "evidenceUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "decisionNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StoreClaimRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StoreClaimRequest_storeId_claimantUserId_key"
  ON "StoreClaimRequest"("storeId", "claimantUserId");
CREATE INDEX "StoreClaimRequest_status_createdAt_idx"
  ON "StoreClaimRequest"("status", "createdAt");
CREATE INDEX "StoreClaimRequest_claimantUserId_createdAt_idx"
  ON "StoreClaimRequest"("claimantUserId", "createdAt");

ALTER TABLE "StoreClaimRequest"
  ADD CONSTRAINT "StoreClaimRequest_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoreClaimRequest"
  ADD CONSTRAINT "StoreClaimRequest_claimantUserId_fkey"
  FOREIGN KEY ("claimantUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoreClaimRequest"
  ADD CONSTRAINT "StoreClaimRequest_reviewedBy_fkey"
  FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
