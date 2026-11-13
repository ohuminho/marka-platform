import { NextResponse } from "next/server";
import { PhoneOtpService } from "@/core/auth/phone/phone-otp.service";

export const dynamic = "force-dynamic";
const otpService = new PhoneOtpService();

function clientIp(request: Request): string | undefined {
  return request.headers.get("x-real-ip")?.trim()
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? undefined;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (typeof body.phone !== "string" || body.purpose !== "SIGN_UP") {
      return NextResponse.json({ message: "Pedido de verificação inválido." }, { status: 400 });
    }
    const result = await otpService.request({ phone: body.phone, purpose: "SIGN_UP", ipAddress: clientIp(request) });
    return NextResponse.json({ challengeId: result.challengeId, expiresAt: result.expiresAt, retryAfterSeconds: 120 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "OTP_REQUEST_FAILED";
    const status = code.includes("RATE_LIMIT") || code.includes("RESEND_") ? 429
      : code === "OTP_MONTHLY_BUDGET_EXCEEDED" ? 503
      : code.includes("MIMO Verify is disabled") ? 503
      : code.includes("E.164") ? 400 : 500;
    const message = status === 429 ? "Limite atingido. Aguarde antes de pedir outro código."
      : status === 503 ? "A verificação por SMS está temporariamente indisponível."
      : status === 400 ? "Número de telefone inválido. Use o formato internacional."
      : "Não foi possível iniciar a verificação.";
    return NextResponse.json({ message, retryable: status === 429 || status === 503 }, { status });
  }
}
