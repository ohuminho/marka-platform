import { createHash } from "node:crypto";
import { prisma } from "@/database/client/prisma";

export type ApiRateLimitWindow = {
  limit: number;
  windowMs: number;
};

export type ApiRateLimitDecision = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export type ReserveApiRequestInput = {
  scope: string;
  actorUserId?: string;
  anonymousIdentity?: string;
  windows: ApiRateLimitWindow[];
  bypass?: boolean;
  /**
   * When false, atomically checks existing usage without consuming a slot.
   * Useful for authentication flows that should count failed credentials,
   * not successful sign-ins.
   */
  record?: boolean;
};

/**
 * Database-backed quota shared by all serverless instances.
 * PostgreSQL transaction advisory locks serialize quota checks per identity.
 * Anonymous identities are SHA-256 fingerprints; raw IP/visitor values are
 * never persisted in SecurityEvent.ipAddress.
 */
export async function reserveApiRequest(
  input: ReserveApiRequestInput,
): Promise<ApiRateLimitDecision> {
  if (input.bypass) return { allowed: true, retryAfterSeconds: 0 };
  if (!input.scope || input.windows.length === 0) {
    throw new Error("A rate-limit scope and at least one window are required.");
  }

  const actorUserId = input.actorUserId;
  const identity = actorUserId
    ? `user:${actorUserId}`
    : input.anonymousIdentity
      ? `anonymous:${createHash("sha256").update(input.anonymousIdentity).digest("hex")}`
      : null;

  if (!identity) throw new Error("A rate-limit identity is required.");

  const eventType = `API_RATE_LIMIT:${input.scope.toUpperCase()}`;
  const ipFingerprint = actorUserId
    ? undefined
    : identity.slice("anonymous:".length);

  return prisma.$transaction(async (tx) => {
    // Evaluate the advisory-lock call as part of a boolean expression.
    // Selecting PostgreSQL VOID directly causes Prisma P2010; placing it in
    // an unused subquery projection risks the planner removing the call.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`marka-api-rate:${input.scope}:${identity}`})) IS NULL AS locked`;

    const now = new Date();
    let retryAfterSeconds = 0;

    for (const window of input.windows) {
      const windowStart = new Date(now.getTime() - window.windowMs);
      const where = {
        type: eventType,
        createdAt: { gte: windowStart },
        ...(actorUserId
          ? { actorUserId }
          : { actorUserId: null, ipAddress: ipFingerprint }),
      };

      const count = await tx.securityEvent.count({ where });
      if (count < window.limit) continue;

      const oldest = await tx.securityEvent.findFirst({
        where,
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      });
      if (oldest) {
        retryAfterSeconds = Math.max(
          retryAfterSeconds,
          Math.ceil((oldest.createdAt.getTime() + window.windowMs - now.getTime()) / 1000),
        );
      }
    }

    if (retryAfterSeconds > 0) {
      return { allowed: false, retryAfterSeconds };
    }

    if (input.record !== false) {
      await tx.securityEvent.create({
        data: {
          type: eventType,
          severity: "INFO",
          ...(actorUserId ? { actorUserId } : { ipAddress: ipFingerprint }),
          metadata: {
            scope: input.scope,
            windows: input.windows.map(({ limit, windowMs }) => ({ limit, windowMs })),
          },
        },
      });
    }

    return { allowed: true, retryAfterSeconds: 0 };
  });
}

/**
 * Reserves multiple related quotas in one database transaction. This avoids
 * acquiring the small serverless Prisma pool once per quota when an endpoint
 * needs both per-user and provider-wide protection.
 */
export async function reserveApiRequests(
  inputs: ReserveApiRequestInput[],
): Promise<ApiRateLimitDecision[]> {
  if (inputs.length === 0) return [];
  const decisions: ApiRateLimitDecision[] = inputs.map(() => ({
    allowed: true,
    retryAfterSeconds: 0,
  }));
  const pending = inputs.flatMap((input, index) => {
    if (input.bypass) return [];
    if (!input.scope || input.windows.length === 0) {
      throw new Error("A rate-limit scope and at least one window are required.");
    }
    const actorUserId = input.actorUserId;
    const identity = actorUserId
      ? `user:${actorUserId}`
      : input.anonymousIdentity
        ? `anonymous:${createHash("sha256").update(input.anonymousIdentity).digest("hex")}`
        : null;
    if (!identity) throw new Error("A rate-limit identity is required.");
    return [{
      input,
      index,
      identity,
      actorUserId,
      eventType: `API_RATE_LIMIT:${input.scope.toUpperCase()}`,
      ipFingerprint: actorUserId ? undefined : identity.slice("anonymous:".length),
    }];
  });
  if (pending.length === 0) return decisions;

  return prisma.$transaction(async (tx) => {
    // Stable lock ordering prevents deadlocks when concurrent requests reserve
    // the same scopes in a different order.
    const lockKeys = pending
      .map(({ input, identity }) => `marka-api-rate:${input.scope}:${identity}`)
      .sort();
    for (const key of lockKeys) {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${key})) IS NULL AS locked`;
    }

    const now = new Date();
    for (const item of pending) {
      let retryAfterSeconds = 0;
      for (const window of item.input.windows) {
        const windowStart = new Date(now.getTime() - window.windowMs);
        const where = {
          type: item.eventType,
          createdAt: { gte: windowStart },
          ...(item.actorUserId
            ? { actorUserId: item.actorUserId }
            : { actorUserId: null, ipAddress: item.ipFingerprint }),
        };
        const count = await tx.securityEvent.count({ where });
        if (count < window.limit) continue;
        const oldest = await tx.securityEvent.findFirst({
          where,
          orderBy: { createdAt: "asc" },
          select: { createdAt: true },
        });
        if (oldest) {
          retryAfterSeconds = Math.max(
            retryAfterSeconds,
            Math.ceil((oldest.createdAt.getTime() + window.windowMs - now.getTime()) / 1000),
          );
        }
      }
      decisions[item.index] = {
        allowed: retryAfterSeconds === 0,
        retryAfterSeconds,
      };
    }

    // Do not consume one quota if another quota in the same request rejects it.
    if (decisions.some((decision) => !decision.allowed)) return decisions;

    for (const item of pending) {
      if (item.input.record === false) continue;
      await tx.securityEvent.create({
        data: {
          type: item.eventType,
          severity: "INFO",
          ...(item.actorUserId ? { actorUserId: item.actorUserId } : { ipAddress: item.ipFingerprint }),
          metadata: {
            scope: item.input.scope,
            windows: item.input.windows.map(({ limit, windowMs }) => ({ limit, windowMs })),
          },
        },
      });
    }
    return decisions;
  });
}
