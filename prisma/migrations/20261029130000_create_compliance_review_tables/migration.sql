DO $$ BEGIN
  CREATE TYPE "ComplianceSubjectType" AS ENUM ('KYC', 'KYD', 'KYB');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "ComplianceStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'IN_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "ComplianceDocumentStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "ComplianceCaseStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public."ComplianceProfile" (
  "id" TEXT NOT NULL,
  "subjectType" "ComplianceSubjectType" NOT NULL,
  "subjectId" TEXT NOT NULL,
  "organizationId" TEXT,
  "status" "ComplianceStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "countryCode" TEXT,
  "submittedAt" TIMESTAMP(3),
  "verifiedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ComplianceProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ComplianceProfile_subjectType_subjectId_organizationId_key"
  ON public."ComplianceProfile"("subjectType", "subjectId", "organizationId");
CREATE INDEX IF NOT EXISTS "ComplianceProfile_subjectId_idx" ON public."ComplianceProfile"("subjectId");
CREATE INDEX IF NOT EXISTS "ComplianceProfile_organizationId_idx" ON public."ComplianceProfile"("organizationId");
CREATE INDEX IF NOT EXISTS "ComplianceProfile_subjectType_status_idx" ON public."ComplianceProfile"("subjectType", "status");

CREATE TABLE IF NOT EXISTS public."ComplianceDocument" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "documentType" TEXT NOT NULL,
  "documentRef" TEXT,
  "status" "ComplianceDocumentStatus" NOT NULL DEFAULT 'PENDING',
  "issuedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "reviewedBy" TEXT,
  "rejectionReason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ComplianceDocument_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ComplianceDocument_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES public."ComplianceProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ComplianceDocument_profileId_idx" ON public."ComplianceDocument"("profileId");
CREATE INDEX IF NOT EXISTS "ComplianceDocument_status_idx" ON public."ComplianceDocument"("status");
CREATE INDEX IF NOT EXISTS "ComplianceDocument_expiresAt_idx" ON public."ComplianceDocument"("expiresAt");

CREATE TABLE IF NOT EXISTS public."ComplianceCase" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "status" "ComplianceCaseStatus" NOT NULL DEFAULT 'OPEN',
  "reason" TEXT NOT NULL,
  "assignedTo" TEXT,
  "decision" TEXT,
  "notes" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ComplianceCase_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ComplianceCase_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES public."ComplianceProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ComplianceCase_profileId_idx" ON public."ComplianceCase"("profileId");
CREATE INDEX IF NOT EXISTS "ComplianceCase_status_idx" ON public."ComplianceCase"("status");
CREATE INDEX IF NOT EXISTS "ComplianceCase_assignedTo_idx" ON public."ComplianceCase"("assignedTo");
