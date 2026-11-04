import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@/database/client/prisma";
import { passwordService } from "@/core/authentication/password.service";
import { SessionService } from "@/core/auth/sessions/session.service";

const TOKEN_TTL_MS = 30 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export class PasswordResetService {
  async issue(userId: string) {
    const now = new Date();
    const recent = await prisma.passwordResetToken.findFirst({
      where: { userId, createdAt: { gt: new Date(now.getTime() - 60_000) }, usedAt: null },
      select: { id: true },
    });
    if (recent) return null;

    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(now.getTime() + TOKEN_TTL_MS);
    await prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.updateMany({
        where: { userId, usedAt: null },
        data: { usedAt: now },
      });
      await tx.passwordResetToken.create({
        data: { userId, tokenHash: hashToken(token), expiresAt },
      });
    });
    return { token, expiresAt };
  }

  async reset(token: string, password: string): Promise<boolean> {
    if (!token || token.length > 256) return false;
    passwordService.validatePassword(password);
    const tokenHash = hashToken(token);
    const now = new Date();
    const passwordHash = await passwordService.hash(password);
    const changed = await prisma.$transaction(async (tx) => {
      const record = await tx.passwordResetToken.findUnique({
        where: { tokenHash },
        select: { id: true, userId: true, expiresAt: true, usedAt: true },
      });
      if (!record || record.usedAt || record.expiresAt <= now) return false;

      const consumed = await tx.passwordResetToken.updateMany({
        where: { id: record.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (consumed.count !== 1) return false;

      await tx.user.update({
        where: { id: record.userId },
        data: { password: passwordHash },
      });
      await tx.passwordResetToken.updateMany({
        where: { userId: record.userId, usedAt: null },
        data: { usedAt: now },
      });
      await tx.session.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: now },
      });
      return true;
    });
    return changed;
  }
}

export const passwordResetService = new PasswordResetService();
