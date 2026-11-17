import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@/database/client/prisma";
import { AuthConfig } from "@/core/authentication/auth.config";

export interface CreateSessionInput {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SessionResult {
  id: string;
  token: string;
  expiresAt: Date;
}

export interface ValidatedSession {
  id: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
  lastSeenAt: Date | null;
}

export class SessionService {
  private readonly sessionDurationMs =
    AuthConfig.session.durationHours * 60 * 60 * 1000;

  private hashToken(token: string): string {
    return createHash("sha256")
      .update(token)
      .digest("hex");
  }

  private generateToken(): string {
    return randomBytes(48).toString("base64url");
  }

  async create(
    input: CreateSessionInput
  ): Promise<SessionResult> {
    const token = this.generateToken();
    const tokenHash = this.hashToken(token);

    const expiresAt = new Date(
      Date.now() + this.sessionDurationMs
    );

    const session = await prisma.session.create({
      data: {
        userId: input.userId,
        tokenHash,
        expiresAt,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        lastSeenAt: new Date(),
      },
    });

    return {
      id: session.id,
      token,
      expiresAt,
    };
  }

  async validate(
    token: string
  ): Promise<ValidatedSession | null> {
    if (!token.trim()) {
      return null;
    }

    const tokenHash = this.hashToken(token);

    // Keep session validation read-only. Writing lastSeenAt on the
    // authentication hot path adds a second database round-trip to
    // nearly every authenticated request and can exhaust the small
    // per-instance Prisma pool under serverless concurrency.
    const session = await prisma.session.findUnique({
      where: {
        tokenHash,
      },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
        lastSeenAt: true,
        user: {
          select: {
            status: true,
          },
        },
      },
    });

    // Session validity follows the account's current state. This central
    // check protects every API that validates a session, including older
    // routes that do not independently reload the user record.
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.user.status !== "ACTIVE"
    ) {
      return null;
    }

    return {
      id: session.id,
      userId: session.userId,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      lastSeenAt: session.lastSeenAt,
    };
  }

  async refresh(token: string): Promise<SessionResult | null> {
    if (!token.trim()) {
      return null;
    }

    const tokenHash = this.hashToken(token);
    const now = new Date();
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        revokedAt: true,
        user: { select: { status: true } },
      },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= now ||
      session.user.status !== "ACTIVE"
    ) {
      return null;
    }

    const refreshWindowMs =
      AuthConfig.session.refreshWindowHours * 60 * 60 * 1000;
    if (session.expiresAt.getTime() - now.getTime() > refreshWindowMs) {
      return {
        id: session.id,
        token,
        expiresAt: session.expiresAt,
      };
    }

    const expiresAt = new Date(now.getTime() + this.sessionDurationMs);
    const updated = await prisma.session.updateMany({
      where: {
        id: session.id,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: {
        expiresAt,
        lastSeenAt: now,
      },
    });

    if (updated.count !== 1) {
      return null;
    }

    return {
      id: session.id,
      token,
      expiresAt,
    };
  }

  async revoke(token: string): Promise<void> {
    if (!token.trim()) {
      return;
    }

    const tokenHash = this.hashToken(token);

    await prisma.session.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async revokeById(sessionId: string): Promise<void> {
    await prisma.session.updateMany({
      where: {
        id: sessionId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async revokeExpired(): Promise<void> {
    await prisma.session.updateMany({
      where: {
        expiresAt: {
          lte: new Date(),
        },
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async getActiveSessions(userId: string) {
    return prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        expiresAt: true,
        createdAt: true,
        lastSeenAt: true,
        ipAddress: true,
        userAgent: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }
}
