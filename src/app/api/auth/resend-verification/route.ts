import { z } from "zod";
import { reserveApiRequest } from "@/core/security/api-rate-limit";
import { getTrustedClientIp } from "@/core/security/client-ip";

import { prisma } from "@/database/client/prisma";
import { VerificationService } from "@/core/auth/verification/verification.service";
import { VerificationDeliveryService } from "@/core/auth/verification/verification-delivery.service";

const requestSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .max(254),
});

const genericMessage =
  "If the account exists and requires verification, a new verification email will be sent.";

export async function POST(
  request: Request
) {
  try {
    const body = await request.json();

    const parsed =
      requestSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({
        message: genericMessage,
      });
    }

    const clientIp = getTrustedClientIp(request);

    if (clientIp) {
      const ipQuota = await reserveApiRequest({
        scope: "AUTH_RESEND_VERIFICATION_IP",
        anonymousIdentity: clientIp,
        windows: [{ limit: 8, windowMs: 60 * 60 * 1000 }],
      });
      if (!ipQuota.allowed) {
        return Response.json(
          { message: genericMessage, code: "VERIFICATION_RESEND_RATE_LIMITED", retryAfterSeconds: ipQuota.retryAfterSeconds },
          { status: 429, headers: { "Retry-After": String(ipQuota.retryAfterSeconds), "Cache-Control": "no-store" } },
        );
      }
    }

    const emailQuota = await reserveApiRequest({
      scope: "AUTH_RESEND_VERIFICATION_EMAIL",
      anonymousIdentity: `email:${parsed.data.email}`,
      windows: [{ limit: 3, windowMs: 60 * 60 * 1000 }],
    });
    if (!emailQuota.allowed) {
      return Response.json(
        { message: genericMessage, code: "VERIFICATION_RESEND_RATE_LIMITED", retryAfterSeconds: emailQuota.retryAfterSeconds },
        { status: 429, headers: { "Retry-After": String(emailQuota.retryAfterSeconds), "Cache-Control": "no-store" } },
      );
    }

    const user =
      await prisma.user.findUnique({
        where: {
          emailNormalized:
            parsed.data.email,
        },
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
        },
      });

    /*
     * Deliberately return the same response for
     * nonexistent, already verified, suspended,
     * locked, and deleted accounts.
     */
    if (
      !user ||
      user.status !==
        "PENDING_VERIFICATION"
    ) {
      return Response.json({
        message: genericMessage,
      });
    }

    const verificationService =
      new VerificationService();

    await verificationService.invalidateActiveTokens(
      user.id
    );

    const verification =
      await verificationService.createToken(
        user.id
      );

    const delivery =
      new VerificationDeliveryService();

    await delivery.sendVerificationEmail({
      email: user.email,
      name: user.name,
      token: verification.token,
      expiresAt: verification.expiresAt,
    });

    return Response.json({
      message: genericMessage,
    });
  } catch (error) {
    console.error(
      "[AUTH_RESEND_VERIFICATION_ERROR]",
      error
    );

    // Never report a successful resend when the database or email
    // provider failed. The response remains generic and reveals no
    // account details.
    return Response.json(
      {
        message:
          "Não foi possível enviar o e-mail de verificação neste momento. Tente novamente mais tarde.",
        code: "VERIFICATION_EMAIL_DELIVERY_FAILED",
      },
      { status: 503 }
    );
  }
}
