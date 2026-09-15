-- CreateEnum
CREATE TYPE "FinancialInstrumentType" AS ENUM ('BANK_ACCOUNT', 'CARD', 'MOBILE_MONEY', 'PSP_ACCOUNT', 'OTHER');

-- CreateEnum
CREATE TYPE "FinancialInstrumentStatus" AS ENUM ('PENDING', 'ACTIVE', 'VERIFICATION_REQUIRED', 'SUSPENDED', 'BLOCKED', 'EXPIRED', 'REMOVED');

-- CreateEnum
CREATE TYPE "FinancialInstrumentOwnerType" AS ENUM ('USER', 'VENDOR', 'ORGANIZATION');

-- CreateTable
CREATE TABLE "FinancialInstrument" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "vendorId" TEXT,
    "type" "FinancialInstrumentType" NOT NULL,
    "status" "FinancialInstrumentStatus" NOT NULL DEFAULT 'PENDING',
    "ownerType" "FinancialInstrumentOwnerType" NOT NULL,
    "provider" TEXT NOT NULL,
    "providerRef" TEXT NOT NULL,
    "displayName" TEXT,
    "maskedValue" TEXT,
    "currency" CHAR(3) NOT NULL DEFAULT 'AOA',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "capabilities" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialInstrument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinancialInstrument_organizationId_idx" ON "FinancialInstrument"("organizationId");

-- CreateIndex
CREATE INDEX "FinancialInstrument_userId_idx" ON "FinancialInstrument"("userId");

-- CreateIndex
CREATE INDEX "FinancialInstrument_vendorId_idx" ON "FinancialInstrument"("vendorId");

-- CreateIndex
CREATE INDEX "FinancialInstrument_type_idx" ON "FinancialInstrument"("type");

-- CreateIndex
CREATE INDEX "FinancialInstrument_status_idx" ON "FinancialInstrument"("status");

-- CreateIndex
CREATE INDEX "FinancialInstrument_ownerType_idx" ON "FinancialInstrument"("ownerType");

-- CreateIndex
CREATE INDEX "FinancialInstrument_isDefault_idx" ON "FinancialInstrument"("isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialInstrument_provider_providerRef_key" ON "FinancialInstrument"("provider", "providerRef");

-- AddForeignKey
ALTER TABLE "FinancialInstrument" ADD CONSTRAINT "FinancialInstrument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialInstrument" ADD CONSTRAINT "FinancialInstrument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialInstrument" ADD CONSTRAINT "FinancialInstrument_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
