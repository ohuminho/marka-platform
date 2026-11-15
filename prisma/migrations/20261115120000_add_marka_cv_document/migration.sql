CREATE TABLE "MarkaCvDocument" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL DEFAULT 'O meu currículo',
  "content" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarkaCvDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MarkaCvDocument_userId_updatedAt_idx"
  ON "MarkaCvDocument"("userId", "updatedAt");

ALTER TABLE "MarkaCvDocument"
  ADD CONSTRAINT "MarkaCvDocument_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
