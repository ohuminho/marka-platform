-- First-party 1:1 call lifecycle and ephemeral WebRTC signalling.
-- No recording or media payload is persisted. SDP/ICE payloads expire and must be pruned.
CREATE TYPE "CommunicationCallMode" AS ENUM ('AUDIO', 'VIDEO');
CREATE TYPE "CommunicationCallStatus" AS ENUM ('RINGING', 'ACCEPTED', 'REJECTED', 'ENDED', 'MISSED', 'EXPIRED', 'FAILED');
CREATE TYPE "CommunicationSignalType" AS ENUM ('OFFER', 'ANSWER', 'ICE_CANDIDATE');

CREATE TABLE "CommunicationCallSession" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "callerId" TEXT NOT NULL,
  "calleeId" TEXT NOT NULL,
  "mode" "CommunicationCallMode" NOT NULL DEFAULT 'AUDIO',
  "status" "CommunicationCallStatus" NOT NULL DEFAULT 'RINGING',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommunicationCallSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunicationCallSession_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "MarketplaceConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommunicationCallSession_callerId_fkey" FOREIGN KEY ("callerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommunicationCallSession_calleeId_fkey" FOREIGN KEY ("calleeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "CommunicationCallSignal" (
  "id" TEXT NOT NULL,
  "callId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "type" "CommunicationSignalType" NOT NULL,
  "payload" JSONB NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunicationCallSignal_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunicationCallSignal_callId_fkey" FOREIGN KEY ("callId") REFERENCES "CommunicationCallSession"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommunicationCallSignal_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "CommunicationCallSession_conversationId_createdAt_idx" ON "CommunicationCallSession"("conversationId", "createdAt");
CREATE INDEX "CommunicationCallSession_callerId_status_createdAt_idx" ON "CommunicationCallSession"("callerId", "status", "createdAt");
CREATE INDEX "CommunicationCallSession_calleeId_status_createdAt_idx" ON "CommunicationCallSession"("calleeId", "status", "createdAt");
CREATE INDEX "CommunicationCallSession_status_expiresAt_idx" ON "CommunicationCallSession"("status", "expiresAt");
CREATE INDEX "CommunicationCallSignal_callId_createdAt_idx" ON "CommunicationCallSignal"("callId", "createdAt");
CREATE INDEX "CommunicationCallSignal_expiresAt_idx" ON "CommunicationCallSignal"("expiresAt");
