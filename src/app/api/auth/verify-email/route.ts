import { z } from "zod";
import { reserveApiRequest } from "@/core/security/api-rate-limit";

import { VerificationService } from "@/core/auth/verification/verification.service";

const requestSchema = z.object({
  token: z
    .string()
    .min(1)
    .max(512),
});

export async function POST(
  request: Request
) {
  try {
    const body = await request.json();

    const parsed =
      requestSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        {
          message:
            "A valid verification token is required.",
        },
        {
          status: 400,
        }
      );
    }

    const clientIp =
      request.headers.get("x-real-ip")?.trim() ||
      request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();

    const ipQuota = await reserveApiRequest({
      scope: "AUTH_VERIFY_EMAIL_IP",
      anonymousIdentity: clientIp || "email-verification-unknown-ip",
      windows: [
        { limit: 20, windowMs: 60_000 },
        { limit: 100, windowMs: 60 * 60 * 1000 },
      ],
    });
    if (!ipQuota.allowed) {
      return Response.json(
        { message: "Demasiadas tentativas de confirmação. Tenta novamente mais tarde.", code: "EMAIL_VERIFY_RATE_LIMITED", retryAfterSeconds: ipQuota.retryAfterSeconds },
        { status: 429, headers: { "Retry-After": String(ipQuota.retryAfterSeconds), "Cache-Control": "no-store" } },
      );
    }

    const tokenQuota = await reserveApiRequest({
      scope: "AUTH_VERIFY_EMAIL_TOKEN",
      anonymousIdentity: `token:${parsed.data.token}`,
      windows: [{ limit: 5, windowMs: 15 * 60 * 1000 }],
    });
    if (!tokenQuota.allowed) {
      return Response.json(
        { message: "Este link recebeu demasiadas tentativas. Solicita um novo e-mail de confirmação.", code: "EMAIL_VERIFY_TOKEN_RATE_LIMITED" },
        { status: 429, headers: { "Cache-Control": "no-store" } },
      );
    }

    const verificationService =
      new VerificationService();

    const user =
      await verificationService.verifyToken(
        parsed.data.token
      );

    if (!user) {
      return Response.json(
        {
          message:
            "The verification link is invalid or has expired.",
          code: "INVALID_VERIFICATION_TOKEN",
        },
        {
          status: 400,
        }
      );
    }

    return Response.json({
      message:
        "Email address verified successfully.",
      user,
    });
  } catch (error) {
    console.error(
      "[AUTH_VERIFY_EMAIL_ERROR]",
      error
    );

    return Response.json(
      {
        message:
          "Unable to verify the email address at this time.",
      },
      {
        status: 500,
      }
    );
  }
}
