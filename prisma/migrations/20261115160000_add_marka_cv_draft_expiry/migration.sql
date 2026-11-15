CREATE TABLE "MarkaCvDraft" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "content" JSONB NOT NULL,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "MarkaCvDraft_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarkaCvDraft_userId_key" ON "MarkaCvDraft"("userId");
CREATE INDEX "MarkaCvDraft_expiresAt_idx" ON "MarkaCvDraft"("expiresAt");

ALTER TABLE "MarkaCvDraft"
ADD CONSTRAINT "MarkaCvDraft_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
