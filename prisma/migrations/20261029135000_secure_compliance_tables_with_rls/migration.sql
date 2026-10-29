-- Compliance evidence and review records must not be exposed through the public PostgREST API.
-- The application accesses these tables server-side through Prisma; no anon/authenticated
-- Supabase client policies are intentionally granted for these sensitive records.
ALTER TABLE public."ComplianceProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ComplianceDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ComplianceCase" ENABLE ROW LEVEL SECURITY;
