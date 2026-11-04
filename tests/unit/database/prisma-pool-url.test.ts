import assert from "node:assert/strict";
import { getDatabaseUrlWithSafePoolLimit } from "../../../src/database/client/prisma";

function parse(value: string | undefined): URL {
  const normalized = getDatabaseUrlWithSafePoolLimit(value);
  assert.ok(normalized);
  return new URL(normalized);
}

assert.equal(getDatabaseUrlWithSafePoolLimit(undefined), undefined);

{
  const url = parse("postgresql://user:pass@aws-0-region.pooler.supabase.com:5432/postgres?sslmode=require");
  assert.equal(url.port, "6543");
  assert.equal(url.searchParams.get("pgbouncer"), "true");
  assert.equal(url.searchParams.get("connection_limit"), "1");
  assert.equal(url.searchParams.get("sslmode"), "require");
}

{
  const url = parse("postgresql://user:pass@aws-0-region.pooler.supabase.com:6543/postgres");
  assert.equal(url.port, "6543");
  assert.equal(url.searchParams.get("pgbouncer"), "true");
  assert.equal(url.searchParams.get("connection_limit"), "1");
}

{
  const url = parse("postgresql://user:pass@aws-0-region.pooler.supabase.com:6543/postgres?connection_limit=4&application_name=marka");
  assert.equal(url.searchParams.get("connection_limit"), "4");
  assert.equal(url.searchParams.get("pgbouncer"), "true");
  assert.equal(url.searchParams.get("application_name"), "marka");
}

{
  const url = parse("postgresql://user:pass@db.example.com:5432/marka");
  assert.equal(url.hostname, "db.example.com");
  assert.equal(url.port, "5432");
  assert.equal(url.searchParams.get("pgbouncer"), null);
  assert.equal(url.searchParams.get("connection_limit"), "1");
}

assert.equal(
  getDatabaseUrlWithSafePoolLimit("not a valid database url"),
  "not a valid database url",
);

console.log("Prisma pool URL normalization tests passed.");
