import {
  createHash,
  randomUUID,
} from "node:crypto";

import { prisma } from "@/database/client/prisma";
import {
  PhoneOtpDeliveryProvider,
  PhoneOtpPurpose,
} from "@/core/auth/phone/phone-otp.contracts";
import { PhoneOtpPolicy } from "@/core/auth/phone/phone-otp.policy";
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

    const [recentPhoneSends, recentIpSends, latestChallenge] = await Promise.all([
      prisma.phoneOtpChallenge.count({
        where: { phoneE164, createdAt: { gte: oneHourAgo } },
      }),
      input.ipAddress
        ? prisma.phoneOtpChallenge.count({
            where: {
              requestIpHash: sha256(input.ipAddress),
              createdAt: { gte: oneHourAgo },
            },
          })
        : Promise.resolve(0),
      prisma.phoneOtpChallenge.findFirst({
        where: { phoneE164, purpose: input.purpose },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

    if (recentPhoneSends >= PhoneOtpPolicy.maxSendsPerPhonePerHour) {
      throw new PhoneOtpRateLimitError();
    }
    if (input.ipAddress && recentIpSends >= PhoneOtpPolicy.maxSendsPerIpPerHour) {
      throw new PhoneOtpRateLimitError();
    }
    if (
      latestChallenge &&
      now.getTime() - latestChallenge.createdAt.getTime() <
        PhoneOtpPolicy.resendCooldownSeconds * 1000
    ) {
      throw new PhoneOtpRateLimitError();
    }

    const challengeId = randomUUID();
    const code = generatePhoneOtp();
    const expiresAt = new Date(
      now.getTime() + PhoneOtpPolicy.codeTtlSeconds * 1000,
    );

    await prisma.phoneOtpChallenge.create({
      data: {
        id: challengeId,
        userId: input.userId,
        phoneE164,
        purpose: input.purpose,
        codeHash: hashPhoneOtp(challengeId, code),
        expiresAt,
        maxAttempts: PhoneOtpPolicy.maxAttemptsPerChallenge,
        requestIpHash: input.ipAddress ? sha256(input.ipAddress) : undefined,
        lastSentAt: now,
      },
    });

    let delivery;
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
      throw new Error("SMS provider rejected the delivery request.");
    }

    return { challengeId, expiresAt };
  }

  async verify(input: VerifyPhoneOtpInput): Promise<{ userId: string | null }> {
    const phoneE164 = normalizePhoneE164(input.phone);
    if (!/^\\d{6}$/.test(input.code)) {
      throw new PhoneOtpInvalidError();
    }

    const challenge = await prisma.phoneOtpChallenge.findFirst({
      where: {
        id: input.challengeId,
        phoneE164,
        purpose: input.purpose,
        ...(input.userId ? { userId: input.userId } : {}),
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

