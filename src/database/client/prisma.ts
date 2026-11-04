import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export function getDatabaseUrlWithSafePoolLimit(
  databaseUrl: string | undefined,
): string | undefined {
  if (!databaseUrl) return undefined;

  try {
    const url = new URL(databaseUrl);

    // Supabase transaction pooling uses port 6543. Prisma 6 must use
    // pgbouncer=true unless the pooler is explicitly configured for named
    // prepared statements. Normalize session-mode pooler URLs to transaction
    // mode while preserving credentials and all unrelated query parameters.
    if (url.hostname.endsWith(".pooler.supabase.com")) {
      if (url.port === "" || url.port === "5432") {
        url.port = "6543";
      }

      if (url.port === "6543") {
        url.searchParams.set("pgbouncer", "true");
      }
    }

    // Bound each serverless Prisma instance to one connection by default.
    // Respect an explicit operator-provided limit.
    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set("connection_limit", "1");
    }

    return url.toString();
  } catch {
    // Preserve the original value so Prisma can report the canonical URL error.
    return databaseUrl;
  }
}

const datasourceUrl = getDatabaseUrlWithSafePoolLimit(
  process.env.DATABASE_URL,
);

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
