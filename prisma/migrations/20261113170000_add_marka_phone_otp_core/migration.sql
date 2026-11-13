-- MARKA-owned phone OTP persistence.
-- Additive migration: existing email identity and sessions remain unchanged.

CREATE TYPE "PhoneOtpPurpose" AS ENUM (
  'SIGN_UP',
  'PHONE_CHANGE',
  'PASSWORD_RECOVERY',
  'SENSITIVE_ACTION'
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

CREATE UNIQUE INDEX "User_phoneE164_key"
  ON "User"("phoneE164");

CREATE TABLE "PhoneOtpChallenge" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "phoneE164" TEXT NOT NULL,
  "purpose" "PhoneOtpPurpose" NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "requestIpHash" TEXT,
  "idempotencyKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PhoneOtpChallenge_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PhoneOtpChallenge_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PhoneOtpChallenge_idempotencyKey_key"
  ON "PhoneOtpChallenge"("idempotencyKey");
CREATE INDEX "PhoneOtpChallenge_phoneE164_purpose_createdAt_idx"
  ON "PhoneOtpChallenge"("phoneE164", "purpose", "createdAt");
CREATE INDEX "PhoneOtpChallenge_userId_purpose_createdAt_idx"
  ON "PhoneOtpChallenge"("userId", "purpose", "createdAt");
CREATE INDEX "PhoneOtpChallenge_expiresAt_consumedAt_idx"
  ON "PhoneOtpChallenge"("expiresAt", "consumedAt");

CREATE TABLE "SmsDeliveryLedger" (
  "id" TEXT NOT NULL,
  "challengeId" TEXT,
  "provider" TEXT NOT NULL,
  "status" "PhoneOtpLedgerStatus" NOT NULL DEFAULT 'REQUESTED',
  "providerMessageId" TEXT,
  "destinationHash" TEXT NOT NULL,
  "costMinor" BIGINT,
  "currency" CHAR(3) NOT NULL DEFAULT 'AOA',
  "acceptedAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "errorCode" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SmsDeliveryLedger_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SmsDeliveryLedger_challengeId_fkey"
    FOREIGN KEY ("challengeId") REFERENCES "PhoneOtpChallenge"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "SmsDeliveryLedger_status_createdAt_idx"
  ON "SmsDeliveryLedger"("status", "createdAt");
CREATE INDEX "SmsDeliveryLedger_provider_createdAt_idx"
  ON "SmsDeliveryLedger"("provider", "createdAt");
CREATE INDEX "SmsDeliveryLedger_destinationHash_createdAt_idx"
  ON "SmsDeliveryLedger"("destinationHash", "createdAt");
