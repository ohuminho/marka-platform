import {
  createHash,
  randomUUID,
} from "node:crypto";

import { prisma } from "@/database/client/prisma";
import {
  PhoneOtpDeliveryProvider,
  PhoneOtpDeliveryResult,
  PhoneOtpPurpose,
} from "@/core/auth/phone/phone-otp.contracts";
import { PhoneOtpPolicy } from "@/core/auth/phone/phone-otp.policy";
import { getPhoneOtpRateLimitLockKeys } from "@/core/auth/phone/phone-otp.locks";
import {
  generatePhoneOtp,
  hashPhoneOtp,
  verifyPhoneOtp,
} from "@/core/auth/phone/phone-otp.security";
import { normalizePhoneE164 } from "@/core/auth/phone/phone-number";

export class PhoneOtpRateLimitError extends Error {
  constructor(message = "Please wait before requesting another verification code.") {
    super(message);
    this.name = "PhoneOtpRateLimitError";
  }
}

export class PhoneOtpInvalidError extends Error {
  constructor(message = "The verification code is invalid or expired.") {
    super(message);
    this.name = "PhoneOtpInvalidError";
  }
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export interface RequestPhoneOtpInput {
  phone: string;
  purpose: PhoneOtpPurpose;
  userId?: string;
  ipAddress?: string;
}

export interface VerifyPhoneOtpInput {
  challengeId: string;
  phone: string;
  purpose: PhoneOtpPurpose;
  code: string;
  userId?: string;
}

export class PhoneOtpService {
  constructor(
    private readonly provider: PhoneOtpDeliveryProvider,
  ) {}

  async request(input: RequestPhoneOtpInput): Promise<{ challengeId: string; expiresAt: Date }> {
    const phoneE164 = normalizePhoneE164(input.phone);
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const ipAddressHash = input.ipAddress ? sha256(input.ipAddress) : undefined;

    // Serialize the complete check-and-reserve operation. A count followed by
    // an insert outside a lock lets parallel requests all pass the same cap.
    // PostgreSQL transaction-scoped advisory locks make the reservation
    // atomic across application instances without holding a transaction open
    // during the external SMS request.
    const { challengeId, code, expiresAt } = await prisma.$transaction(async (tx) => {
      const lockKeys = getPhoneOtpRateLimitLockKeys(phoneE164, ipAddressHash);
      for (const lockKey of lockKeys) {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
      }

      const [recentPhoneSends, recentIpSends, latestChallenge] = await Promise.all([
        tx.phoneOtpChallenge.count({
          where: { phoneE164, createdAt: { gte: oneHourAgo } },
        }),
        ipAddressHash
          ? tx.phoneOtpChallenge.count({
              where: {
                requestIpHash: ipAddressHash,
                createdAt: { gte: oneHourAgo },
              },
            })
          : Promise.resolve(0),
        tx.phoneOtpChallenge.findFirst({
          where: { phoneE164, purpose: input.purpose },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        }),
      ]);

      if (recentPhoneSends >= PhoneOtpPolicy.maxSendsPerPhonePerHour) {
        throw new PhoneOtpRateLimitError();
      }
      if (ipAddressHash && recentIpSends >= PhoneOtpPolicy.maxSendsPerIpPerHour) {
        throw new PhoneOtpRateLimitError();
      }
      if (
        latestChallenge &&
        now.getTime() - latestChallenge.createdAt.getTime() <
          PhoneOtpPolicy.resendCooldownSeconds * 1000
      ) {
        throw new PhoneOtpRateLimitError();
      }

      const reservedChallengeId = randomUUID();
      const generatedCode = generatePhoneOtp();
      const challengeExpiresAt = new Date(
        now.getTime() + PhoneOtpPolicy.codeTtlSeconds * 1000,
      );

      await tx.phoneOtpChallenge.create({
        data: {
          id: reservedChallengeId,
          userId: input.userId,
          phoneE164,
          purpose: input.purpose,
          codeHash: hashPhoneOtp(reservedChallengeId, generatedCode),
          expiresAt: challengeExpiresAt,
          maxAttempts: PhoneOtpPolicy.maxAttemptsPerChallenge,
          requestIpHash: ipAddressHash,
          lastSentAt: now,
        },
      });

      return {
        challengeId: reservedChallengeId,
        code: generatedCode,
        expiresAt: challengeExpiresAt,
      };
    });

    let delivery: PhoneOtpDeliveryResult;
    try {
      delivery = await this.provider.send({
        recipientE164: phoneE164,
        code,
        expiresInSeconds: PhoneOtpPolicy.codeTtlSeconds,
        idempotencyKey: challengeId,
      });
    } catch (error) {
      await prisma.smsDeliveryLedger.create({
        data: {
          challengeId,
          provider: this.provider.name,
          status: "UNKNOWN",
          destinationHash: sha256(phoneE164),
          errorCode: "PROVIDER_RESULT_UNKNOWN",
        },
      }).catch(() => undefined);
      throw error;
    }

    await prisma.smsDeliveryLedger.create({
      data: {
        challengeId,
        provider: delivery.provider,
        status:
          delivery.status === "ACCEPTED"
            ? "ACCEPTED"
            : delivery.status === "REJECTED"
              ? "REJECTED"
              : "UNKNOWN",
        providerMessageId: delivery.providerMessageId,
        destinationHash: sha256(phoneE164),
        acceptedAt: delivery.status === "ACCEPTED" ? new Date() : undefined,
        errorCode: delivery.providerStatus,
      },
    });

    if (delivery.status === "REJECTED") {
      // The provider explicitly rejected this send, so this code must not
      // remain verifiable even if the challenge row is otherwise unexpired.
      await prisma.phoneOtpChallenge.updateMany({
        where: {
          id: challengeId,
          consumedAt: null,
        },
        data: { consumedAt: new Date() },
      });
      throw new Error("SMS provider rejected the delivery request.");
    }

    return { challengeId, expiresAt };
  }

  async verify(input: VerifyPhoneOtpInput): Promise<{ userId: string | null }> {
    const phoneE164 = normalizePhoneE164(input.phone);
    if (!/^\d{6}$/.test(input.code)) {
      throw new PhoneOtpInvalidError();
    }

    const challenge = await prisma.phoneOtpChallenge.findFirst({
      where: {
        id: input.challengeId,
        phoneE164,
        purpose: input.purpose,
        userId: input.userId ?? null,
        consumedAt: null,
        expiresAt: { gt: new Date() },
        attempts: { lt: PhoneOtpPolicy.maxAttemptsPerChallenge },
      },
      select: {
        id: true,
        userId: true,
        codeHash: true,
        attempts: true,
        maxAttempts: true,
      },
    });

    if (!challenge) {
      throw new PhoneOtpInvalidError();
    }

    if (!verifyPhoneOtp(challenge.id, input.code, challenge.codeHash)) {
      await prisma.phoneOtpChallenge.updateMany({
        where: {
          id: challenge.id,
          consumedAt: null,
          expiresAt: { gt: new Date() },
          attempts: { lt: challenge.maxAttempts },
        },
        data: { attempts: { increment: 1 } },
      });
      throw new PhoneOtpInvalidError();
    }

    try {
      await prisma.$transaction(async (tx) => {
        const consumed = await tx.phoneOtpChallenge.updateMany({
          where: {
            id: challenge.id,
            consumedAt: null,
            expiresAt: { gt: new Date() },
            attempts: { lt: challenge.maxAttempts },
            codeHash: challenge.codeHash,
          },
          data: { consumedAt: new Date() },
        });

        if (consumed.count !== 1) {
          throw new PhoneOtpInvalidError();
        }

        if (challenge.userId) {
          await tx.user.update({
            where: { id: challenge.userId },
            data: {
              phoneE164,
              phoneVerifiedAt: new Date(),
            },
          });
        }
      });
    } catch (error) {
      if (error instanceof PhoneOtpInvalidError) throw error;
      // Includes a unique-phone conflict. The transaction rolls back, so
      // the challenge remains unconsumed and no partial identity is written.
      throw new PhoneOtpInvalidError();
    }

    return { userId: challenge.userId };
  }
}
