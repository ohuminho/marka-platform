-- Durable in-app notification inbox.
-- RLS is enabled and direct anon/authenticated access is revoked.
-- Application access is performed server-side through the trusted Prisma connection.

CREATE TABLE IF NOT EXISTS public."Notification" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES public."User"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL DEFAULT 'GENERAL',
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "data" JSONB,
  "readAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx"
  ON public."Notification" ("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "Notification_userId_readAt_createdAt_idx"
  ON public."Notification" ("userId", "readAt", "createdAt");

ALTER TABLE public."Notification" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."Notification" FROM anon, authenticated;
