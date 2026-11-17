import { prisma } from "@/database/client/prisma";
import { passwordService } from "@/core/authentication/password.service";
import {
  generatePasswordResetToken,
  hashPasswordResetToken,
  isPasswordResetTokenUsable,
  PASSWORD_RESET_TOKEN_TTL_MS,
} from "@/core/authentication/password-reset.security";

const TOKEN_COOLDOWN_MS = 60 * 1000;

export class PasswordResetService {
  async issue(userId: string) {
    if (!userId.trim()) return null;

    const now = new Date();
    const token = generatePasswordResetToken();
    const expiresAt = new Date(now.getTime() + PASSWORD_RESET_TOKEN_TTL_MS);
    const tokenHash = hashPasswordResetToken(token);

    const issued = await prisma.$transaction(async (tx) => {
      // Serialize requests for the same account so concurrent requests cannot
      // bypass the one-minute cooldown or leave multiple usable reset tokens.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`marka-password-reset:${userId}`})) IS NULL AS locked`;

      const recent = await tx.passwordResetToken.findFirst({
        where: {
          userId,
          createdAt: { gt: new Date(now.getTime() - TOKEN_COOLDOWN_MS) },
          usedAt: null,
        },
        select: { id: true },
      });
      if (recent) return false;

      await tx.passwordResetToken.updateMany({
        where: { userId, usedAt: null },
        data: { usedAt: now },
      });
      await tx.passwordResetToken.create({
        data: { userId, tokenHash, expiresAt },
      });
      return true;
    });

    return issued ? { token, expiresAt } : null;
  }

  async reset(token: string, password: string): Promise<boolean> {
    if (!token || token.length > 256) return false;
    passwordService.validatePassword(password);

    const tokenHash = hashPasswordResetToken(token);
    const passwordHash = await passwordService.hash(password);
    const now = new Date();

    return prisma.$transaction(async (tx) => {
      const record = await tx.passwordResetToken.findUnique({
        where: { tokenHash },
        select: { id: true, userId: true, expiresAt: true, usedAt: true },
      });
      if (!record || !isPasswordResetTokenUsable(record, now)) return false;

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
      // Password reset invalidates every existing session on every device.
      await tx.session.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: now },
      });
      return true;
    });
  }
}

export const passwordResetService = new PasswordResetService();
