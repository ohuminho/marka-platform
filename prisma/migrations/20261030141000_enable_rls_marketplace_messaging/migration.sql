-- Marketplace messages are accessed through the authenticated Next.js API using Prisma.
-- Deny direct PostgREST access; server-side authorization checks conversation membership.
ALTER TABLE public."MarketplaceConversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MarketplaceMessage" ENABLE ROW LEVEL SECURITY;