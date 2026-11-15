-- Marks internal seller profiles that publish one product without a public storefront.
ALTER TABLE "Store"
ADD COLUMN IF NOT EXISTS "isIndividualListing" BOOLEAN NOT NULL DEFAULT false;
