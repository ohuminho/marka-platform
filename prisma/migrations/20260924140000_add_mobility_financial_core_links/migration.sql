ALTER TABLE "MobilitySettlement"
ADD COLUMN "financialTransactionId" TEXT;

ALTER TABLE "MobilitySettlement"
ADD COLUMN "vendorPayableTransactionId" TEXT;

ALTER TABLE "MobilitySettlement"
ADD COLUMN "commissionTransactionId" TEXT;

ALTER TABLE "MobilitySettlement"
ADD COLUMN "cashObligationSettlementTransactionId" TEXT;

CREATE UNIQUE INDEX "MobilitySettlement_financialTransactionId_key"
ON "MobilitySettlement"("financialTransactionId");

CREATE UNIQUE INDEX "MobilitySettlement_vendorPayableTransactionId_key"
ON "MobilitySettlement"("vendorPayableTransactionId");

CREATE UNIQUE INDEX "MobilitySettlement_commissionTransactionId_key"
ON "MobilitySettlement"("commissionTransactionId");

CREATE UNIQUE INDEX "MobilitySettlement_cashObligationSettlementTransactionId_key"
ON "MobilitySettlement"("cashObligationSettlementTransactionId");

ALTER TABLE "MobilitySettlement"
ADD CONSTRAINT "MobilitySettlement_financialTransactionId_fkey"
FOREIGN KEY ("financialTransactionId")
REFERENCES "Transaction"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "MobilitySettlement"
ADD CONSTRAINT "MobilitySettlement_vendorPayableTransactionId_fkey"
FOREIGN KEY ("vendorPayableTransactionId")
REFERENCES "Transaction"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "MobilitySettlement"
ADD CONSTRAINT "MobilitySettlement_commissionTransactionId_fkey"
FOREIGN KEY ("commissionTransactionId")
REFERENCES "Transaction"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "MobilitySettlement"
ADD CONSTRAINT "MobilitySettlement_cashObligationSettlementTransactionId_fkey"
FOREIGN KEY ("cashObligationSettlementTransactionId")
REFERENCES "Transaction"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
