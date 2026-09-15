import {
  createHash,
  randomBytes,
} from "node:crypto";

import { Prisma } from "@prisma/client";
import { prisma } from "@/database/client/prisma";

const VERIFICATION_TOKEN_BYTES = 48;
const VERIFICATION_TOKEN_HOURS = 24;

export interface VerificationTokenResult {
  token: string;
  expiresAt: Date;
}

type DatabaseClient =
  | typeof prisma
  | Prisma.TransactionClient;

export class VerificationService {
  private hashToken(token: string): string {
    return createHash("sha256")
      .update(token)
      .digest("hex");
  }

  async createToken(
    userId: string,
    database: DatabaseClient = prisma
  ): Promise<VerificationTokenResult> {
    const token = randomBytes(
      VERIFICATION_TOKEN_BYTES
    ).toString("base64url");

    const tokenHash = this.hashToken(token);

    const expiresAt = new Date(
      Date.now() +
        VERIFICATION_TOKEN_HOURS *
          60 *
          60 *
          1000
    );

    await database.emailVerificationToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return {
      token,
      expiresAt,
    };
  }

  async verifyToken(token: string) {
    const tokenHash = this.hashToken(token);

    const verificationToken =
      await prisma.emailVerificationToken.findUnique({
        where: {
          tokenHash,
        },
        include: {
          user: true,
        },
      });

    if (!verificationToken) {
      return null;
    }

    if (verificationToken.verifiedAt) {
      return null;
    }

    if (
      verificationToken.expiresAt <=
      new Date()
    ) {
      return null;
    }

    const user =
      await prisma.$transaction(
        async (tx) => {
          const updatedToken =
            await tx.emailVerificationToken.updateMany({
              where: {
                id: verificationToken.id,
                verifiedAt: null,
                expiresAt: {
                  gt: new Date(),
                },
              },
              data: {
                verifiedAt: new Date(),
              },
            });

          if (updatedToken.count !== 1) {
            return null;
          }

          return tx.user.update({
            where: {
              id: verificationToken.userId,
            },
            data: {
              status: "ACTIVE",
              emailVerifiedAt: new Date(),
            },
            select: {
              id: true,
              email: true,
              name: true,
              status: true,
              emailVerifiedAt: true,
            },
          });
        }
      );

    return user;
  }

  async invalidateActiveTokens(
    userId: string
  ): Promise<void> {
    await prisma.emailVerificationToken.updateMany({
      where: {
        userId,
        verifiedAt: null,
      },
      data: {
        verifiedAt: new Date(),
      },
    });
  }

  async hasPendingVerification(
    userId: string
  ): Promise<boolean> {
    const token =
      await prisma.emailVerificationToken.findFirst({
        where: {
          userId,
          verifiedAt: null,
          expiresAt: {
            gt: new Date(),
          },
        },
        select: {
          id: true,
        },
      });

    return Boolean(token);
  }
}
