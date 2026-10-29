ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS "isFounder" BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE public."User" SET "isFounder" = TRUE WHERE name = 'Edgar Songanga' AND email IN ('ohuminho@gmail.com', 'veudaed@gmail.com');
