import { NextResponse } from "next/server";
import { PhoneOtpService } from "@/core/auth/phone/phone-otp.service";

export const dynamic = "force-dynamic";
const otpService = new PhoneOtpService();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (typeof body.challengeId !== "string" || typeof body.code !== "string") {
      return NextResponse.json({ message: "Código inválido." }, { status: 400 });
    }
    const result = await otpService.verify({ challengeId: body.challengeId, code: body.code });
    return NextResponse.json({ verified: true, phone: result.phoneE164, purpose: result.purpose });
  } catch (error) {
    const code = error instanceof Error ? error.message : "OTP_VERIFY_FAILED";
    const status = code === "OTP_INVALID" || code === "OTP_EXPIRED_OR_INVALID" || code === "OTP_NOT_DELIVERED" ? 400
      : code === "OTP_ATTEMPTS_EXCEEDED" ? 429 : 500;
    const message = code === "OTP_ATTEMPTS_EXCEEDED" ? "Limite de tentativas atingido. Solicite um novo código."
      : status === 400 ? "Código inválido ou expirado."
      : "Não foi possível validar o código.";
    return NextResponse.json({ verified: false, message }, { status });
  }
}
