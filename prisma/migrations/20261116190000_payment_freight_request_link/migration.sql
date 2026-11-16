ALTER TABLE "Payment"
  ADD COLUMN "freightRequestId" TEXT;

CREATE UNIQUE INDEX "Payment_freightRequestId_key"
  ON "Payment"("freightRequestId");

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_freightRequestId_fkey"
  FOREIGN KEY ("freightRequestId")
  REFERENCES "FreightRequest"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
