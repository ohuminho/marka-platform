-- Phone OTP identity and SMS cost ledger foundation.
-- Existing email-based authentication remains unchanged in this migration.

CREATE TYPE "PhoneOtpPurpose" AS ENUM (
  'SIGN_UP',
  'PHONE_CHANGE',
  'PASSWORD_RECOVERY',
  'SENSITIVE_ACTION'
);

CREATE TYPE "PhoneOtpDeliveryState" AS ENUM (
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'UNKNOWN'
);

CREATE TYPE "PhoneOtpLedgerStatus" AS ENUM (
  'REQUESTED',
  'ACCEPTED',
  'DELIVERED',
  'FAILED',
  'REJECTED',
  'UNKNOWN'
);

ALTER TABLE "User"
ADD COLUMN "phoneE164" TEXT;

CREATE UNIQUE INDEX "User_phoneE164_key" ON "User"("phoneE164");

CREATE TABLE "PhoneOtpChallenge" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "phoneE164" TEXT NOT NULL,
  "purpose" "PhoneOtpPurpose" NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "consumedAt" TIMESTAMP(3),
  "deliveryState" "PhoneOtpDeliveryState" NOT NULL DEFAULT 'PENDING',
  "provider" TEXT,
  "providerMessageId" TEXT,
  "requestIpHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PhoneOtpChallenge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SmsDeliveryLedger" (
  "id" TEXT NOT NULL,
  "challengeId" TEXT,
  "userId" TEXT,
  "provider" TEXT NOT NULL,
  "destinationHash" TEXT NOT NULL,
  "countryCode" TEXT,
  "status" "PhoneOtpLedgerStatus" NOT NULL DEFAULT 'REQUESTED',
  "providerMessageId" TEXT,
  "currency" CHAR(3) NOT NULL DEFAULT 'AOA',
  "unitCost" DECIMAL(12,2),
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "errorCode" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SmsDeliveryLedger_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PhoneOtpChallenge_phoneE164_purpose_createdAt_idx"
ON "PhoneOtpChallenge"("phoneE164", "purpose", "createdAt");
CREATE INDEX "PhoneOtpChallenge_expiresAt_idx"
ON "PhoneOtpChallenge"("expiresAt");
CREATE INDEX "PhoneOtpChallenge_userId_idx"
ON "PhoneOtpChallenge"("userId");
CREATE INDEX "PhoneOtpChallenge_deliveryState_idx"
ON "PhoneOtpChallenge"("deliveryState");

CREATE INDEX "SmsDeliveryLedger_status_requestedAt_idx"
ON "SmsDeliveryLedger"("status", "requestedAt");
CREATE INDEX "SmsDeliveryLedger_provider_providerMessageId_idx"
ON "SmsDeliveryLedger"("provider", "providerMessageId");
CREATE INDEX "SmsDeliveryLedger_destinationHash_requestedAt_idx"
ON "SmsDeliveryLedger"("destinationHash", "requestedAt");
CREATE INDEX "SmsDeliveryLedger_userId_idx"
ON "SmsDeliveryLedger"("userId");
CREATE INDEX "SmsDeliveryLedger_challengeId_idx"
ON "SmsDeliveryLedger"("challengeId");

ALTER TABLE "PhoneOtpChallenge"
ADD CONSTRAINT "PhoneOtpChallenge_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SmsDeliveryLedger"
ADD CONSTRAINT "SmsDeliveryLedger_challengeId_fkey"
FOREIGN KEY ("challengeId") REFERENCES "PhoneOtpChallenge"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SmsDeliveryLedger"
ADD CONSTRAINT "SmsDeliveryLedger_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
