DO $$ BEGIN
  CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "SupportTicketPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "SupportTicket" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "priority" "SupportTicketPriority" NOT NULL DEFAULT 'NORMAL',
  "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
  "lastReplyAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SupportMessage" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "isStaff" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SupportTicket_reference_key" ON "SupportTicket"("reference");
CREATE INDEX IF NOT EXISTS "SupportTicket_userId_createdAt_idx" ON "SupportTicket"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "SupportTicket_status_priority_updatedAt_idx" ON "SupportTicket"("status", "priority", "updatedAt");
CREATE INDEX IF NOT EXISTS "SupportTicket_reference_idx" ON "SupportTicket"("reference");
CREATE INDEX IF NOT EXISTS "SupportMessage_ticketId_createdAt_idx" ON "SupportMessage"("ticketId", "createdAt");
CREATE INDEX IF NOT EXISTS "SupportMessage_authorId_createdAt_idx" ON "SupportMessage"("authorId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
