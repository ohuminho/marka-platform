import { z } from "zod";

import { prisma } from "@/database/client/prisma";
import { reserveApiRequest } from "@/core/security/api-rate-limit";
import { getTrustedClientIp } from "@/core/security/client-ip";
import { passwordResetService } from "@/core/authentication/password-reset.service";
import { sendPasswordResetEmail } from "@/core/authentication/password-reset-delivery.service";

export const runtime = "nodejs";

const schema = z.object({ email: z.string().trim().toLowerCase().email().max(254) });
const genericMessage = "Se existir uma conta elegível para esse endereço, receberás instruções de recuperação.";
const noStore = { headers: { "Cache-Control": "no-store" } };

export async function POST(request: Request) {
  try {
    const trustedIp = getTrustedClientIp(request);
    if (trustedIp) {
      const ipQuota = await reserveApiRequest({
        scope: "AUTH_PASSWORD_RESET_REQUEST_IP",
        anonymousIdentity: trustedIp,
        windows: [{ limit: 10, windowMs: 60 * 60 * 1000 }],
      });
      if (!ipQuota.allowed) {
        return Response.json(
          { message: genericMessage, code: "PASSWORD_RESET_RATE_LIMITED" },
          {
            status: 429,
            headers: {
              "Retry-After": String(ipQuota.retryAfterSeconds),
              "Cache-Control": "no-store",
            },
          },
        );
      }
    }

    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ message: genericMessage }, noStore);
    }

    const email = parsed.data.email;
    const emailQuota = await reserveApiRequest({
      scope: "AUTH_PASSWORD_RESET_REQUEST_EMAIL",
      anonymousIdentity: `email:${email}`,
      windows: [{ limit: 3, windowMs: 60 * 60 * 1000 }],
    });
    if (!emailQuota.allowed) {
      return Response.json(
        { message: genericMessage, code: "PASSWORD_RESET_RATE_LIMITED" },
        {
          status: 429,
          headers: {
            "Retry-After": String(emailQuota.retryAfterSeconds),
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const user = await prisma.user.findUnique({
      where: { emailNormalized: email },
      select: { id: true, email: true, name: true, status: true },
    });
    // Password reset only applies to accounts that can sign in. Pending
    // accounts must complete email verification instead of receiving a
    // reset link that cannot make the account eligible for login.
    if (!user || user.status !== "ACTIVE") {
      return Response.json({ message: genericMessage }, noStore);
    }

    const issued = await passwordResetService.issue(user.id);
    if (issued) {
      try {
        await sendPasswordResetEmail({
          email: user.email,
          name: user.name,
          token: issued.token,
        });
      } catch {
        // Keep the response indistinguishable and never log reset credentials.
        console.error("[AUTH_PASSWORD_RESET_REQUEST_DELIVERY_FAILED]");
      }
    }

    return Response.json({ message: genericMessage }, noStore);
  } catch {
    console.error("[AUTH_PASSWORD_RESET_REQUEST_ERROR]");
    return Response.json({ message: genericMessage }, noStore);
  }
}
