import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { PhoneOtpInvalidError } from "@/core/auth/phone/phone-otp.service";
import { PhoneOtpService } from "@/core/auth/phone/phone-otp.service";
import { prisma } from "@/database/client/prisma";

// Verification does not need an SMS provider. The challenge must already
// exist and be bound to this authenticated account.
const requestSchema = z.object({
  challengeId: z.string().uuid(),
  phone: z.string().trim().min(8).max(20),
  code: z.string().regex(/^\d{6}$/),
});

export async function POST(request: Request) {
  try {
    const token = (await cookies()).get(AuthConfig.cookies.name)?.value;
    if (!token) {
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    }

    const session = await new SessionService().validate(token);
    if (!session) {
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    }

    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: "The verification code is invalid or expired.", code: "PHONE_OTP_INVALID" }, { status: 400 });
    }

    const otpService = new PhoneOtpService({
      name: "disabled-verification-transport",
      async send() {
        throw new Error("SMS delivery is not available in the verification route.");
      },
    });

    const result = await otpService.verify({
      challengeId: parsed.data.challengeId,
      phone: parsed.data.phone,
      purpose: "PHONE_CHANGE",
      code: parsed.data.code,
      userId: session.userId,
    });

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, phoneE164: true, phoneVerifiedAt: true },
    });

    return NextResponse.json({
      verified: true,
      phone: user?.phoneE164 ?? null,
      phoneVerifiedAt: user?.phoneVerifiedAt ?? null,
      userId: result.userId,
    });
  } catch (error) {
    if (error instanceof PhoneOtpInvalidError || (error instanceof Error && error.message.includes("E.164"))) {
      return NextResponse.json({ message: "The verification code is invalid or expired.", code: "PHONE_OTP_INVALID" }, { status: 400 });
    }
    console.error("[PHONE_OTP_VERIFY_ERROR]", error);
    return NextResponse.json({ message: "Unable to verify this phone number." }, { status: 500 });
  }
}
