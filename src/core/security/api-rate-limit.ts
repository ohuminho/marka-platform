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

type ReserveApiRequestInput = {
  scope: string;
  actorUserId?: string;
  anonymousIdentity?: string;
  windows: ApiRateLimitWindow[];
  bypass?: boolean;
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
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`marka-api-rate:${input.scope}:${identity}`}))`;

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

    return { allowed: true, retryAfterSeconds: 0 };
  });
}
