import { z } from "zod";

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
