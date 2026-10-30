-- Shared communication threads for assigned Mobility rides and Delivery fulfillments.
CREATE TYPE "CommunicationContextType" AS ENUM ('MOBILITY', 'DELIVERY');
CREATE TYPE "CommunicationThreadStatus" AS ENUM ('ACTIVE', 'CLOSED');
CREATE TYPE "CommunicationParticipantRole" AS ENUM ('CUSTOMER', 'DRIVER', 'MERCHANT', 'COURIER');

CREATE TABLE "CommunicationThread" (
  "id" TEXT NOT NULL,
  "contextType" "CommunicationContextType" NOT NULL,
  "contextId" TEXT NOT NULL,
  "subject" TEXT,
  "status" "CommunicationThreadStatus" NOT NULL DEFAULT 'ACTIVE',
  "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommunicationThread_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CommunicationThread_contextType_contextId_key" ON "CommunicationThread"("contextType", "contextId");
CREATE INDEX "CommunicationThread_status_lastMessageAt_idx" ON "CommunicationThread"("status", "lastMessageAt");

CREATE TABLE "CommunicationThreadParticipant" (
  "id" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "CommunicationParticipantRole" NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommunicationThreadParticipant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunicationThreadParticipant_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "CommunicationThread"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommunicationThreadParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CommunicationThreadParticipant_threadId_userId_key" ON "CommunicationThreadParticipant"("threadId", "userId");
CREATE INDEX "CommunicationThreadParticipant_userId_revokedAt_idx" ON "CommunicationThreadParticipant"("userId", "revokedAt");
CREATE INDEX "CommunicationThreadParticipant_threadId_revokedAt_idx" ON "CommunicationThreadParticipant"("threadId", "revokedAt");

CREATE TABLE "CommunicationThreadMessage" (
  "id" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunicationThreadMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunicationThreadMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "CommunicationThread"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommunicationThreadMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CommunicationThreadMessage_threadId_createdAt_idx" ON "CommunicationThreadMessage"("threadId", "createdAt");
CREATE INDEX "CommunicationThreadMessage_senderId_createdAt_idx" ON "CommunicationThreadMessage"("senderId", "createdAt");
CREATE INDEX "CommunicationThreadMessage_threadId_readAt_idx" ON "CommunicationThreadMessage"("threadId", "readAt");

ALTER TABLE "CommunicationCallSession" ALTER COLUMN "conversationId" DROP NOT NULL;
ALTER TABLE "CommunicationCallSession" ADD COLUMN "threadId" TEXT;
ALTER TABLE "CommunicationCallSession"
  ADD CONSTRAINT "CommunicationCallSession_threadId_fkey"
  FOREIGN KEY ("threadId") REFERENCES "CommunicationThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "CommunicationCallSession_threadId_createdAt_idx" ON "CommunicationCallSession"("threadId", "createdAt");
ALTER TABLE "CommunicationCallSession"
  ADD CONSTRAINT "CommunicationCallSession_exactly_one_context_check"
  CHECK (("conversationId" IS NOT NULL) <> ("threadId" IS NOT NULL));
