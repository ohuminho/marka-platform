CREATE TYPE "ComplianceSubjectType" AS ENUM ('KYC', 'KYD', 'KYB');
CREATE TYPE "ComplianceStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'IN_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED', 'SUSPENDED');
CREATE TYPE "ComplianceDocumentStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED');
CREATE TYPE "ComplianceCaseStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED');

CREATE TABLE "ComplianceProfile" (
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
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ComplianceProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ComplianceProfile_subjectType_subjectId_organizationId_key"
  ON "ComplianceProfile"("subjectType", "subjectId", "organizationId");
CREATE INDEX "ComplianceProfile_subjectId_idx" ON "ComplianceProfile"("subjectId");
CREATE INDEX "ComplianceProfile_organizationId_idx" ON "ComplianceProfile"("organizationId");
CREATE INDEX "ComplianceProfile_subjectType_status_idx" ON "ComplianceProfile"("subjectType", "status");

CREATE TABLE "ComplianceDocument" (
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
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ComplianceDocument_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ComplianceDocument_profileId_idx" ON "ComplianceDocument"("profileId");
CREATE INDEX "ComplianceDocument_status_idx" ON "ComplianceDocument"("status");
CREATE INDEX "ComplianceDocument_expiresAt_idx" ON "ComplianceDocument"("expiresAt");
ALTER TABLE "ComplianceDocument"
  ADD CONSTRAINT "ComplianceDocument_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "ComplianceProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ComplianceCase" (
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
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ComplianceCase_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ComplianceCase_profileId_idx" ON "ComplianceCase"("profileId");
CREATE INDEX "ComplianceCase_status_idx" ON "ComplianceCase"("status");
CREATE INDEX "ComplianceCase_assignedTo_idx" ON "ComplianceCase"("assignedTo");
ALTER TABLE "ComplianceCase"
  ADD CONSTRAINT "ComplianceCase_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "ComplianceProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
