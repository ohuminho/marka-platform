import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getDatabaseUrlWithSafePoolLimit(): string | undefined {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return undefined;

  try {
    const url = new URL(databaseUrl);
    // Vercel serverless instances must not each open Prisma's default pool.
    // Keep one connection per warm instance to stay within Supabase pool limits.
    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set("connection_limit", "1");
    }
    return url.toString();
  } catch {
    // Preserve the original value so Prisma can report the canonical URL error.
    return databaseUrl;
  }
}

const datasourceUrl = getDatabaseUrlWithSafePoolLimit();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(
    datasourceUrl
      ? { datasources: { db: { url: datasourceUrl } } }
      : undefined,
  );

// Reuse the client in development and production to avoid duplicate pools
// during module reloads within a warm runtime.
globalForPrisma.prisma = prisma;
