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

export class SessionService {
  private readonly sessionDurationMs =
    AuthConfig.sessionHours * 60 * 60 * 1000;

  private hashToken(token: string): string {
    return createHash("sha256")
      .update(token)
      .digest("hex");
  }

  async create(
    input: CreateSessionInput
  ): Promise<SessionResult> {
    const token = randomBytes(48).toString("base64url");
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

  async validate(token: string) {
    const tokenHash = this.hashToken(token);

    const session = await prisma.session.findUnique({
      where: {
        tokenHash,
      },
    });

    if (!session) {
      return null;
    }

    if (session.revokedAt) {
      return null;
    }

    if (session.expiresAt <= new Date()) {
      return null;
    }

    await prisma.session.update({
      where: {
        id: session.id,
      },
      data: {
        lastSeenAt: new Date(),
      },
    });

    return session;
  }

  async revoke(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);

    const session = await prisma.session.findUnique({
      where: {
        tokenHash,
      },
    });

    if (!session || session.revokedAt) {
      return;
    }

    await prisma.session.update({
      where: {
        id: session.id,
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
}
