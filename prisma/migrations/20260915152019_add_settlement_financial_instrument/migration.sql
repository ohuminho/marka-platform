/*
  Warnings:

  - Added the required column `financialInstrumentId` to the `Settlement` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Settlement" ADD COLUMN     "financialInstrumentId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Settlement_financialInstrumentId_idx" ON "Settlement"("financialInstrumentId");

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_financialInstrumentId_fkey" FOREIGN KEY ("financialInstrumentId") REFERENCES "FinancialInstrument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
