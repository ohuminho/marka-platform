import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import {
  PhoneOtpInvalidError,
  PhoneOtpRateLimitError,
  PhoneOtpService,
} from "@/core/auth/phone/phone-otp.service";
import type {
  PhoneOtpDeliveryProvider,
  PhoneOtpDeliveryRequest,
} from "@/core/auth/phone/phone-otp.contracts";
import { prisma } from "@/database/client/prisma";

class CapturingProvider implements PhoneOtpDeliveryProvider {
  readonly name = "marka-otp-postgres-integration-test";
  lastRequest: PhoneOtpDeliveryRequest | null = null;

  async send(request: PhoneOtpDeliveryRequest) {
    this.lastRequest = request;
    return {
      status: "ACCEPTED" as const,
      provider: this.name,
      providerMessageId: randomUUID(),
    };
  }
}

async function main(): Promise<void> {
  process.env.PHONE_OTP_PEPPER ??= "integration-only-pepper-not-a-production-secret-0001";

  if (!process.env.DATABASE_URL || !process.env.RUN_PHONE_OTP_INTEGRATION) {
    throw new Error(
      "This test requires an isolated PostgreSQL DATABASE_URL and RUN_PHONE_OTP_INTEGRATION=1.",
    );
  }

  const provider = new CapturingProvider();
  const service = new PhoneOtpService(provider);
  const email = `otp-integration-${randomUUID()}@marka.test`;
  const user = await prisma.user.create({
    data: {
      name: "MARKA OTP Integration Test",
      email,
      emailNormalized: email,
      password: "integration-test-only-not-a-real-password",
      status: "ACTIVE",
    },
    select: { id: true },
  });

  try {
    const phone = "+244923000001";
    const request = await service.request({
      phone,
      purpose: "PHONE_CHANGE",
      userId: user.id,
      ipAddress: "192.0.2.10",
    });

    assert.ok(provider.lastRequest, "provider must receive the generated OTP");
    assert.equal(provider.lastRequest.recipientE164, phone);
    assert.equal(provider.lastRequest.idempotencyKey, request.challengeId);

    const result = await service.verify({
      challengeId: request.challengeId,
      phone,
      purpose: "PHONE_CHANGE",
      code: provider.lastRequest.code,
      userId: user.id,
    });

    assert.equal(result.userId, user.id);
    const updatedUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { phoneE164: true, phoneVerifiedAt: true },
    });
    assert.equal(updatedUser.phoneE164, phone);
    assert.ok(updatedUser.phoneVerifiedAt);

    await assert.rejects(
      service.verify({
        challengeId: request.challengeId,
        phone,
        purpose: "PHONE_CHANGE",
        code: provider.lastRequest.code,
        userId: user.id,
      }),
      PhoneOtpInvalidError,
      "a consumed challenge must not be reusable",
    );

    const cooldownPhone = "+244923000002";
    await service.request({
      phone: cooldownPhone,
      purpose: "PHONE_CHANGE",
      userId: user.id,
      ipAddress: "192.0.2.11",
    });
    await assert.rejects(
      service.request({
        phone: cooldownPhone,
        purpose: "PHONE_CHANGE",
        userId: user.id,
        ipAddress: "192.0.2.11",
      }),
      PhoneOtpRateLimitError,
      "resend cooldown must be enforced by PostgreSQL-backed state",
    );

    const attemptPhone = "+244923000003";
    const attempt = await service.request({
      phone: attemptPhone,
      purpose: "PHONE_CHANGE",
      userId: user.id,
      ipAddress: "192.0.2.12",
    });
    assert.ok(provider.lastRequest);
    const correctCode = provider.lastRequest.code;
    const wrongCode = correctCode === "000000" ? "000001" : "000000";

    for (let i = 0; i < 5; i += 1) {
      await assert.rejects(
        service.verify({
          challengeId: attempt.challengeId,
          phone: attemptPhone,
          purpose: "PHONE_CHANGE",
          code: wrongCode,
          userId: user.id,
        }),
        PhoneOtpInvalidError,
      );
    }

    await assert.rejects(
      service.verify({
        challengeId: attempt.challengeId,
        phone: attemptPhone,
        purpose: "PHONE_CHANGE",
        code: correctCode,
        userId: user.id,
      }),
      PhoneOtpInvalidError,
      "challenge must be locked after the maximum number of attempts",
    );

    const concurrentRequestPhone = "+244923000005";
    const concurrentRequests = await Promise.allSettled([
      service.request({
        phone: concurrentRequestPhone,
        purpose: "PHONE_CHANGE",
        userId: user.id,
        ipAddress: "192.0.2.14",
      }),
      service.request({
        phone: concurrentRequestPhone,
        purpose: "PHONE_CHANGE",
        userId: user.id,
        ipAddress: "192.0.2.14",
      }),
    ]);

    assert.equal(
      concurrentRequests.filter((entry) => entry.status === "fulfilled").length,
      1,
      "advisory locks must allow only one simultaneous request through the cooldown",
    );
    assert.equal(
      concurrentRequests.filter(
        (entry) =>
          entry.status === "rejected" &&
          entry.reason instanceof PhoneOtpRateLimitError,
      ).length,
      1,
      "the concurrent request must be rate-limited after the first reservation commits",
    );

    const concurrentPhone = "+244923000004";
    const concurrent = await service.request({
      phone: concurrentPhone,
      purpose: "PHONE_CHANGE",
      userId: user.id,
      ipAddress: "192.0.2.13",
    });
    assert.ok(provider.lastRequest);
    const concurrentCode = provider.lastRequest.code;
    const concurrentVerifications = await Promise.allSettled([
      service.verify({
        challengeId: concurrent.challengeId,
        phone: concurrentPhone,
        purpose: "PHONE_CHANGE",
        code: concurrentCode,
        userId: user.id,
      }),
      service.verify({
        challengeId: concurrent.challengeId,
        phone: concurrentPhone,
        purpose: "PHONE_CHANGE",
        code: concurrentCode,
        userId: user.id,
      }),
    ]);

    assert.equal(
      concurrentVerifications.filter((entry) => entry.status === "fulfilled").length,
      1,
      "exactly one concurrent verification may consume a challenge",
    );
    assert.equal(
      concurrentVerifications.filter((entry) => entry.status === "rejected").length,
      1,
    );

    console.log("MARKA phone OTP PostgreSQL integration tests passed.");
  } finally {
    await prisma.smsDeliveryLedger.deleteMany({
      where: { provider: provider.name },
    });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error("MARKA phone OTP PostgreSQL integration tests failed.");
  console.error(error);
  await prisma.$disconnect();
  process.exitCode = 1;
});
