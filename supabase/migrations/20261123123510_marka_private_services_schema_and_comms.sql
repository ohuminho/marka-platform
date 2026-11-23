-- Private Services dispatch and confidential communication context.
-- Applied to production as Supabase migration 20261123123510.
-- RLS is enabled on all case-bearing tables; no client policies are granted.
CREATE TYPE "PrivateProfessionalStatus" AS ENUM ('PENDING', 'VERIFIED', 'SUSPENDED');
CREATE TYPE "PrivateServiceRequestStatus" AS ENUM ('SUBMITTED', 'MATCHING', 'OFFERED', 'IN_REVIEW', 'PROFESSIONAL_SELECTED', 'ENGAGED', 'CLOSED', 'CANCELLED');
CREATE TYPE "PrivateServiceOfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'SELECTED', 'WITHDRAWN');

CREATE TABLE "PrivateProfessionalProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "publicName" TEXT NOT NULL,
  "specialties" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "region" TEXT,
  "status" "PrivateProfessionalStatus" NOT NULL DEFAULT 'PENDING',
  "verifiedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "PrivateProfessionalProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PrivateServiceRequest" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "serviceType" TEXT NOT NULL,
  "specialty" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "region" TEXT,
  "status" "PrivateServiceRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
  "consentAt" TIMESTAMPTZ(3) NOT NULL,
  "consentVersion" TEXT NOT NULL DEFAULT 'private-services-v1',
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "selectedProfessionalId" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "PrivateServiceRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PrivateServiceOffer" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "professionalId" TEXT NOT NULL,
  "status" "PrivateServiceOfferStatus" NOT NULL DEFAULT 'PENDING',
  "respondedAt" TIMESTAMPTZ(3),
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "proposedFeeKz" INTEGER,
  "proposalAvailability" VARCHAR(500),
  "proposalApproach" VARCHAR(1500),
  "proposalSubmittedAt" TIMESTAMPTZ(3),
  CONSTRAINT "PrivateServiceOffer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PrivateProfessionalProfile_userId_key" ON "PrivateProfessionalProfile"("userId");
CREATE INDEX "PrivateProfessionalProfile_status_region_idx" ON "PrivateProfessionalProfile"("status", "region");
CREATE INDEX "PrivateProfessionalProfile_specialties_gin_idx" ON "PrivateProfessionalProfile" USING GIN ("specialties");
CREATE UNIQUE INDEX "PrivateServiceRequest_reference_key" ON "PrivateServiceRequest"("reference");
CREATE INDEX "PrivateServiceRequest_requesterId_createdAt_idx" ON "PrivateServiceRequest"("requesterId", "createdAt");
CREATE INDEX "PrivateServiceRequest_status_expiresAt_idx" ON "PrivateServiceRequest"("status", "expiresAt");
CREATE INDEX "PrivateServiceRequest_specialty_region_status_idx" ON "PrivateServiceRequest"("specialty", "region", "status");
CREATE UNIQUE INDEX "PrivateServiceOffer_requestId_professionalId_key" ON "PrivateServiceOffer"("requestId", "professionalId");
CREATE INDEX "PrivateServiceOffer_professionalId_status_createdAt_idx" ON "PrivateServiceOffer"("professionalId", "status", "createdAt");
CREATE INDEX "PrivateServiceOffer_requestId_status_idx" ON "PrivateServiceOffer"("requestId", "status");
CREATE INDEX "PrivateServiceOffer_status_expiresAt_idx" ON "PrivateServiceOffer"("status", "expiresAt");

ALTER TABLE "PrivateProfessionalProfile"
  ADD CONSTRAINT "PrivateProfessionalProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PrivateServiceRequest"
  ADD CONSTRAINT "PrivateServiceRequest_requesterId_fkey"
  FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PrivateServiceRequest"
  ADD CONSTRAINT "PrivateServiceRequest_selectedProfessionalId_fkey"
  FOREIGN KEY ("selectedProfessionalId") REFERENCES "PrivateProfessionalProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PrivateServiceOffer"
  ADD CONSTRAINT "PrivateServiceOffer_requestId_fkey"
  FOREIGN KEY ("requestId") REFERENCES "PrivateServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PrivateServiceOffer"
  ADD CONSTRAINT "PrivateServiceOffer_professionalId_fkey"
  FOREIGN KEY ("professionalId") REFERENCES "PrivateProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PrivateProfessionalProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PrivateServiceRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PrivateServiceOffer" ENABLE ROW LEVEL SECURITY;

ALTER TYPE "CommunicationContextType" ADD VALUE IF NOT EXISTS 'PRIVATE_SERVICE';
ALTER TYPE "CommunicationParticipantRole" ADD VALUE IF NOT EXISTS 'PROFESSIONAL';
