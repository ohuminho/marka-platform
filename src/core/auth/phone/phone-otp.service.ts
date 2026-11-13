import { createHmac, randomUUID } from "node:crypto";
import { prisma } from "@/database/client/prisma";
import { PhoneOtpPolicy } from "./phone-otp.policy";
import { generatePhoneOtp, hashPhoneOtp, verifyPhoneOtp } from "./phone-otp.security";
import { normalizePhoneE164 } from "./phone-number";
import { MimoVerifySmsProvider } from "./mimo-verify-sms.provider";
import type { PhoneOtpPurpose } from "./phone-otp.contracts";

type ChallengeRow = {
  id: string; phoneE164: string; purpose: PhoneOtpPurpose; codeHash: string;
  expiresAt: Date; attemptCount: number; maxAttempts: number; resendCount: number;
  lastSentAt: Date; consumedAt: Date | null; deliveryState: "PENDING" | "ACCEPTED" | "REJECTED" | "UNKNOWN";
};
const provider = new MimoVerifySmsProvider();

function digest(value: string): string {
  const pepper = process.env.PHONE_OTP_PEPPER;
  if (!pepper || pepper.length < 32) throw new Error("PHONE_OTP_PEPPER is not configured.");
  return createHmac("sha256", pepper).update(value).digest("hex");
}
function validPurpose(value: string): value is PhoneOtpPurpose {
  return ["SIGN_UP", "PHONE_CHANGE", "PASSWORD_RECOVERY", "SENSITIVE_ACTION"].includes(value);
}

export class PhoneOtpService {
  async request(input: { phone: string; purpose: string; ipAddress?: string }): Promise<{ challengeId: string; expiresAt: Date }> {
    const phone = normalizePhoneE164(input.phone);
    provider.assertReady();
    if (!validPurpose(input.purpose)) throw new Error("Unsupported OTP purpose.");
    const purpose = input.purpose;
    const ipHash = input.ipAddress ? digest("ip:" + input.ipAddress) : null;
    const phoneHash = digest("phone:" + phone);
    const code = generatePhoneOtp();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + PhoneOtpPolicy.codeTtlSeconds * 1000);

    const created = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${"MARKA_OTP_MONTHLY_BUDGET"}))`;
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${phoneHash}))`;
      if (ipHash) await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${ipHash}))`;

      const phoneCount = await tx.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count FROM "SmsDeliveryLedger"
        WHERE "destinationHash" = ${phoneHash} AND "requestedAt" >= ${new Date(now.getTime() - 60 * 60 * 1000)}
      `;
      if (Number(phoneCount[0]?.count ?? 0) >= PhoneOtpPolicy.maxSendsPerPhonePerHour) throw new Error("OTP_PHONE_RATE_LIMIT");
      if (ipHash) {
        const ipCount = await tx.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint AS count FROM "SmsDeliveryLedger"
          WHERE "requestIpHash" = ${ipHash} AND "requestedAt" >= ${new Date(now.getTime() - 60 * 60 * 1000)}
        `;
        if (Number(ipCount[0]?.count ?? 0) >= PhoneOtpPolicy.maxSendsPerIpPerHour) throw new Error("OTP_IP_RATE_LIMIT");
      }

      const active = await tx.$queryRaw<ChallengeRow[]>`
        SELECT * FROM "PhoneOtpChallenge"
        WHERE "phoneE164" = ${phone} AND "purpose" = CAST(${purpose} AS "PhoneOtpPurpose")
          AND "consumedAt" IS NULL AND "expiresAt" > ${now}
        ORDER BY "createdAt" DESC LIMIT 1 FOR UPDATE
      `;
      let challengeId: string;
      if (active[0]) {
        const challenge = active[0];
        if (now.getTime() - new Date(challenge.lastSentAt).getTime() < PhoneOtpPolicy.resendCooldownSeconds * 1000) throw new Error("OTP_RESEND_COOLDOWN");
        if (challenge.resendCount >= PhoneOtpPolicy.maxResendsPerChallenge) throw new Error("OTP_RESEND_LIMIT");
        challengeId = challenge.id;
        await tx.$executeRaw`
          UPDATE "PhoneOtpChallenge" SET "codeHash" = ${hashPhoneOtp(challengeId, code)},
            "resendCount" = "resendCount" + 1, "attemptCount" = 0, "lastSentAt" = ${now}, "expiresAt" = ${expiresAt},
            "deliveryState" = 'PENDING', "providerMessageId" = NULL, "updatedAt" = ${now}
          WHERE "id" = ${challengeId}
        `;
      } else {
        challengeId = randomUUID();
        await tx.$executeRaw`
          INSERT INTO "PhoneOtpChallenge"
          ("id","phoneE164","purpose","codeHash","expiresAt","attemptCount","maxAttempts","resendCount","lastSentAt","deliveryState","provider","requestIpHash","createdAt","updatedAt")
          VALUES (${challengeId},${phone},CAST(${purpose} AS "PhoneOtpPurpose"),${hashPhoneOtp(challengeId, code)},${expiresAt},0,${PhoneOtpPolicy.maxAttemptsPerChallenge},0,${now},'PENDING','mimo-verify',${ipHash},${now},${now})
        `;
      }

      const spent = await tx.$queryRaw<Array<{ total: string }>>`
        SELECT COALESCE(SUM("unitCost"),0)::text AS total FROM "SmsDeliveryLedger"
        WHERE "requestedAt" >= date_trunc('month', CURRENT_TIMESTAMP) AND "currency" = 'AOA'
      `;
      if (Number(spent[0]?.total ?? 0) + PhoneOtpPolicy.estimatedSmsUnitCostAoa > PhoneOtpPolicy.monthlyBudgetAoa) throw new Error("OTP_MONTHLY_BUDGET_EXCEEDED");

      await tx.$executeRaw`
        INSERT INTO "SmsDeliveryLedger" ("id","challengeId","provider","destinationHash","countryCode","requestIpHash","status","currency","unitCost","requestedAt","createdAt","updatedAt")
        VALUES (${randomUUID()},${challengeId},'mimo-verify',${phoneHash},'AO',${ipHash}, 'REQUESTED','AOA',${PhoneOtpPolicy.estimatedSmsUnitCostAoa},${now},${now},${now})
      `;
      return { challengeId };
    });

    try {
      const result = await provider.send({ recipientE164: phone, code, expiresInSeconds: PhoneOtpPolicy.codeTtlSeconds, idempotencyKey: created.challengeId });
      const deliveredAt = new Date();
      await prisma.$executeRaw`
        UPDATE "PhoneOtpChallenge" SET "deliveryState" = CAST(${result.status} AS "PhoneOtpDeliveryState"), "providerMessageId" = ${result.providerMessageId ?? null}, "updatedAt" = ${deliveredAt} WHERE "id" = ${created.challengeId}
      `;
      await prisma.$executeRaw`
        UPDATE "SmsDeliveryLedger" SET "status" = CAST(${result.status} AS "PhoneOtpLedgerStatus"), "providerMessageId" = ${result.providerMessageId ?? null},
          "acceptedAt" = CASE WHEN ${result.status} = 'ACCEPTED' THEN ${deliveredAt} ELSE NULL END,
          "failedAt" = CASE WHEN ${result.status} = 'REJECTED' THEN ${deliveredAt} ELSE NULL END,
          "updatedAt" = ${deliveredAt} WHERE "challengeId" = ${created.challengeId} AND "status" = 'REQUESTED'
      `;
      if (result.status !== "ACCEPTED") throw new Error("OTP_PROVIDER_REJECTED");
    } catch (error) {
      await prisma.$executeRaw`
        UPDATE "PhoneOtpChallenge" SET "deliveryState" = 'UNKNOWN', "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${created.challengeId} AND "deliveryState" = 'PENDING'
      `;
      await prisma.$executeRaw`
        UPDATE "SmsDeliveryLedger" SET "status" = 'UNKNOWN', "updatedAt" = CURRENT_TIMESTAMP
        WHERE "challengeId" = ${created.challengeId} AND "status" = 'REQUESTED'
      `;
      throw error;
    }
    return { challengeId: created.challengeId, expiresAt };
  }

  async verify(input: { challengeId: string; code: string }): Promise<{ verified: true; phoneE164: string; purpose: PhoneOtpPurpose }> {
    if (!/^\d{6}$/.test(input.code)) throw new Error("OTP_INVALID");
    const outcome = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<ChallengeRow[]>`
        SELECT * FROM "PhoneOtpChallenge" WHERE "id" = ${input.challengeId} FOR UPDATE
      `;
      const challenge = rows[0];
      const now = new Date();
      if (!challenge || challenge.consumedAt || new Date(challenge.expiresAt) <= now) throw new Error("OTP_EXPIRED_OR_INVALID");
      if (challenge.attemptCount >= challenge.maxAttempts) throw new Error("OTP_ATTEMPTS_EXCEEDED");
      if (!verifyPhoneOtp(challenge.id, input.code, challenge.codeHash)) {
        const nextAttempts = challenge.attemptCount + 1;
        await tx.$executeRaw`
          UPDATE "PhoneOtpChallenge" SET "attemptCount" = ${nextAttempts},
            "consumedAt" = CASE WHEN ${nextAttempts} >= "maxAttempts" THEN ${now} ELSE NULL END,
            "updatedAt" = ${now} WHERE "id" = ${challenge.id}
        `;
        return { failure: nextAttempts >= challenge.maxAttempts ? "OTP_ATTEMPTS_EXCEEDED" : "OTP_INVALID" as const };
      }
      if (challenge.deliveryState !== "ACCEPTED") throw new Error("OTP_NOT_DELIVERED");
      await tx.$executeRaw`UPDATE "PhoneOtpChallenge" SET "consumedAt" = ${now}, "updatedAt" = ${now} WHERE "id" = ${challenge.id}`;
      return { verified: true as const, phoneE164: challenge.phoneE164, purpose: challenge.purpose };
    });
    if ("failure" in outcome) throw new Error(outcome.failure);
    return outcome;
  }
}
