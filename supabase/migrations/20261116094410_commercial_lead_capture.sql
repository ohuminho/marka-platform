CREATE TYPE "CommercialLeadType" AS ENUM (
  'ADVERTISER',
  'MERCHANT',
  'LOGISTICS',
  'SUPPLIER',
  'SERVICE_PROVIDER',
  'STRATEGIC_PARTNER',
  'OTHER'
);

CREATE TYPE "CommercialLeadStatus" AS ENUM (
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'CONVERTED',
  'DISQUALIFIED'
);

CREATE TABLE "CommercialLead" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "email" VARCHAR(254),
  "phone" VARCHAR(32),
  "organizationName" VARCHAR(160),
  "leadType" "CommercialLeadType" NOT NULL DEFAULT 'OTHER',
  "message" TEXT,
  "source" VARCHAR(64) NOT NULL DEFAULT 'MARKA_PUBLIC_SITE',
  "consentAt" TIMESTAMPTZ(3) NOT NULL,
  "status" "CommercialLeadStatus" NOT NULL DEFAULT 'NEW',
  "internalNotes" TEXT,
  "ipFingerprint" CHAR(64),
  "userAgent" VARCHAR(500),
  "lastContactedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "CommercialLead_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CommercialLead_status_createdAt_idx"
  ON "CommercialLead" ("status", "createdAt" DESC);
CREATE INDEX "CommercialLead_leadType_createdAt_idx"
  ON "CommercialLead" ("leadType", "createdAt" DESC);
CREATE INDEX "CommercialLead_email_idx"
  ON "CommercialLead" ("email");
CREATE INDEX "CommercialLead_phone_idx"
  ON "CommercialLead" ("phone");

ALTER TABLE "CommercialLead" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "CommercialLead" FROM anon, authenticated;
