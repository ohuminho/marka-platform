import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getDatabaseUrlWithSafePoolLimit(): string | undefined {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return undefined;

  try {
    const url = new URL(databaseUrl);

    // Vercel runs short-lived/serverless instances. Supabase session mode
    // (5432) reserves one server connection per warm Prisma client and can
    // exhaust the small session client cap under concurrent traffic.
    // When the configured URL is Supabase's shared pooler in session mode,
    // reuse the same credentials against its transaction endpoint instead.
    // This preserves the password/username while changing only the pool mode.
    if (
      url.hostname.endsWith(".pooler.supabase.com") &&
      (url.port === "" || url.port === "5432")
    ) {
      url.port = "6543";
      // Prisma 6 must disable prepared statements with transaction pooling.
      url.searchParams.set("pgbouncer", "true");
    }

    // Keep Prisma's per-instance pool bounded on Vercel.
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
