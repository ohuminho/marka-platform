-- Covers the StoreClaimRequest.reviewedBy foreign key used by moderation/review operations.
CREATE INDEX "StoreClaimRequest_reviewedBy_idx"
  ON "StoreClaimRequest"("reviewedBy");
