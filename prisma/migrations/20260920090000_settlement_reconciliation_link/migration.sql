ALTER TABLE "Reconciliation"
ADD COLUMN "settlementId" TEXT;

CREATE UNIQUE INDEX "Reconciliation_settlementId_key"
ON "Reconciliation"("settlementId");

CREATE INDEX "Reconciliation_settlementId_idx"
ON "Reconciliation"("settlementId");

ALTER TABLE "Reconciliation"
ADD CONSTRAINT "Reconciliation_settlementId_fkey"
FOREIGN KEY ("settlementId")
REFERENCES "Settlement"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
