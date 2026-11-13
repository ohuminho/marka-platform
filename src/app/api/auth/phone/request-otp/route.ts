import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthConfig } from "@/core/authentication/auth.config";
import { SessionService } from "@/core/auth/sessions/session.service";
import { prisma } from "@/database/client/prisma";
import { normalizePhoneE164 } from "@/core/auth/phone/phone-number";

const requestSchema = z.object({
  phone: z.string().trim().min(8).max(20),
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
      return NextResponse.json({ message: "Enter a valid international phone number." }, { status: 400 });
    }

    const phoneE164 = normalizePhoneE164(parsed.data.phone);
    const [owner, currentUser] = await Promise.all([
      prisma.user.findUnique({ where: { phoneE164 }, select: { id: true } }),
      prisma.user.findUnique({ where: { id: session.userId }, select: { phoneE164: true } }),
    ]);

    if (owner && owner.id !== session.userId) {
      return NextResponse.json({ message: "This phone number cannot be used." }, { status: 409 });
    }

    if (currentUser?.phoneE164 === phoneE164) {
      return NextResponse.json({ message: "This phone number is already linked to your account." }, { status: 409 });
    }

    // The MARKA OTP engine is ready, but SMS transport remains deliberately
    // disabled until MIMO's authentication and response contract is verified.
    if (!process.env.MIMO_VERIFY_API_KEY || !process.env.MIMO_VERIFY_AUTH_HEADER_NAME || !process.env.MIMO_VERIFY_AUTH_HEADER_VALUE) {
      return NextResponse.json(
        { message: "Phone verification is temporarily unavailable. Email sign-in remains available.", code: "PHONE_OTP_DELIVERY_UNAVAILABLE" },
        { status: 503 },
      );
    }

    // Do not guess MIMO's authentication protocol. Configuration alone does
    // not activate delivery; a verified adapter must be installed first.
    return NextResponse.json(
      { message: "Phone verification is not yet enabled.", code: "PHONE_OTP_DELIVERY_UNAVAILABLE" },
      { status: 503 },
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("E.164")) {
      return NextResponse.json({ message: "Enter a valid international phone number, including country code." }, { status: 400 });
    }
    console.error("[PHONE_OTP_REQUEST_ERROR]", error);
    return NextResponse.json({ message: "Unable to request phone verification." }, { status: 500 });
  }
}
