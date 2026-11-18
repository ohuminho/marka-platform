import assert from "node:assert/strict";
import type { Prisma, PrismaClient } from "@prisma/client";

import { PasswordResetService } from "../../../src/core/authentication/password-reset.service";
import { hashPasswordResetToken, PASSWORD_RESET_TOKEN_TTL_MS } from "../../../src/core/authentication/password-reset.security";

type TokenRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
};

type State = {
  tokens: TokenRecord[];
  password: string;
  sessions: Array<{ userId: string; revokedAt: Date | null }>;
};

function createHarness() {
  const state: State = {
    tokens: [],
    password: "old-password-hash",
    sessions: [
      { userId: "user-1", revokedAt: null },
      { userId: "user-1", revokedAt: null },
    ],
  };
  let nextId = 0;

  const transaction = {
    $queryRaw: async () => [],
    passwordResetToken: {
      findFirst: async ({ where }: { where: { userId: string; createdAt: { gt: Date }; usedAt: null } }) =>
        state.tokens.find((item) =>
          item.userId === where.userId &&
          item.createdAt > where.createdAt.gt &&
          item.usedAt === null,
        ) ?? null,
      findUnique: async ({ where }: { where: { tokenHash: string } }) =>
        state.tokens.find((item) => item.tokenHash === where.tokenHash) ?? null,
      create: async ({ data }: { data: { userId: string; tokenHash: string; expiresAt: Date } }) => {
        const record = {
          id: `token-${++nextId}`,
          ...data,
          usedAt: null,
          createdAt: new Date(now),
        };
        state.tokens.push(record);
        return record;
      },
      updateMany: async ({ where, data }: {
        where: { userId?: string; id?: string; usedAt: null; expiresAt?: { gt: Date } };
        data: { usedAt: Date };
      }) => {
        const matches = state.tokens.filter((item) =>
          (where.userId === undefined || item.userId === where.userId) &&
          (where.id === undefined || item.id === where.id) &&
          item.usedAt === null &&
          (where.expiresAt === undefined || item.expiresAt > where.expiresAt.gt),
        );
        for (const item of matches) item.usedAt = data.usedAt;
        return { count: matches.length };
      },
    },
    user: {
      update: async ({ data }: { data: { password: string } }) => {
        state.password = data.password;
        return { id: "user-1" };
      },
    },
    session: {
      updateMany: async ({ where, data }: {
        where: { userId: string; revokedAt: null };
        data: { revokedAt: Date };
      }) => {
        const matches = state.sessions.filter((item) =>
          item.userId === where.userId && item.revokedAt === null,
        );
        for (const item of matches) item.revokedAt = data.revokedAt;
        return { count: matches.length };
      },
    },
  } as unknown as Prisma.TransactionClient;

  const db = {
    $transaction: async <T>(work: (tx: Prisma.TransactionClient) => Promise<T>) => work(transaction),
  } as unknown as Pick<PrismaClient, "$transaction">;

  let now = new Date("2026-11-18T05:00:00.000Z");
  const issuedTokens = ["reset-token-first-000000000000000000", "reset-token-second-00000000000000"];
  let tokenIndex = 0;
  const passwords = {
    validatePassword(password: string) {
      if (password.length < 12) throw new Error("Password too short");
    },
    async hash(password: string) {
      return `hashed:${password}`;
    },
  };
  const service = new PasswordResetService({
    db,
    passwords,
    now: () => new Date(now),
    createToken: () => issuedTokens[tokenIndex++],
  });

  return {
    service,
    state,
    setNow(value: Date) { now = value; },
  };
}

async function runPasswordResetServiceTests(): Promise<void> {
  const harness = createHarness();
  const first = await harness.service.issue("user-1");
  assert.ok(first);
  assert.equal(first.expiresAt.getTime(), new Date("2026-11-18T05:30:00.000Z").getTime());
  assert.equal(await harness.service.issue("user-1"), null, "cooldown must prevent repeated token issuance");

  harness.setNow(new Date("2026-11-18T05:01:00.001Z"));
  const second = await harness.service.issue("user-1");
  assert.ok(second);
  assert.equal(harness.state.tokens[0].usedAt?.getTime(), new Date("2026-11-18T05:01:00.001Z").getTime());

  const updated = await harness.service.reset(second.token, "new-secure-password-2026");
  assert.equal(updated, true);
  assert.equal(harness.state.password, "hashed:new-secure-password-2026");
  assert.ok(harness.state.tokens[1].usedAt);
  assert.ok(harness.state.sessions.every((session) => session.revokedAt !== null));

  assert.equal(
    await harness.service.reset(second.token, "another-secure-password-2026"),
    false,
    "a consumed token must not be reusable",
  );
  assert.equal(PASSWORD_RESET_TOKEN_TTL_MS, 30 * 60 * 1000);
  assert.equal(hashPasswordResetToken(second.token), harness.state.tokens[1].tokenHash);

  const concurrentHarness = createHarness();
  const concurrentToken = await concurrentHarness.service.issue("user-1");
  assert.ok(concurrentToken);
  const results = await Promise.all([
    concurrentHarness.service.reset(concurrentToken.token, "concurrent-password-one-2026"),
    concurrentHarness.service.reset(concurrentToken.token, "concurrent-password-two-2026"),
  ]);
  assert.equal(results.filter(Boolean).length, 1, "concurrent submissions must consume a token only once");
  assert.ok(concurrentHarness.state.sessions.every((session) => session.revokedAt !== null));

  console.log("Password reset service tests passed.");
}

runPasswordResetServiceTests().catch((error: unknown) => {
  console.error("Password reset service tests failed.");
  console.error(error);
  process.exitCode = 1;
});
