import type { PhoneOtpDeliveryProvider, PhoneOtpDeliveryRequest, PhoneOtpDeliveryResult } from "./phone-otp.contracts";
interface MimoResponse { status?: string; id?: string; message_id?: string; request_id?: string; }
export class MimoVerifySmsProvider implements PhoneOtpDeliveryProvider {
  readonly name = "mimo-verify";
  assertReady(): void {
    if (!process.env.MIMO_VERIFY_API_KEY || !process.env.MIMO_VERIFY_AUTH_HEADER_NAME || !process.env.MIMO_VERIFY_AUTH_HEADER_VALUE) {
      throw new Error("MIMO Verify is disabled until credentials and its exact authentication contract are configured.");
    }
  }
  async send(request: PhoneOtpDeliveryRequest): Promise<PhoneOtpDeliveryResult> {
    this.assertReady();
    const apiKey = process.env.MIMO_VERIFY_API_KEY;
    const headerName = process.env.MIMO_VERIFY_AUTH_HEADER_NAME;
    const headerValue = process.env.MIMO_VERIFY_AUTH_HEADER_VALUE;
    if (!apiKey || !headerName || !headerValue) throw new Error("MIMO Verify is disabled until credentials and its exact authentication contract are configured.");
    if (!/^[A-Za-z0-9-]+$/.test(headerName)) throw new Error("Invalid MIMO authentication header name.");
    if (!/^\+[1-9]\d{7,14}$/.test(request.recipientE164) || !/^\d{6}$/.test(request.code)) throw new Error("Invalid MIMO OTP payload.");
    const base = (process.env.MIMO_VERIFY_BASE_URL ?? "https://verify.mimo.ao").replace(/\/+$/, "");
    const endpoint = new URL(base + "/v1/otp/send");
    if (endpoint.protocol !== "https:") throw new Error("MIMO endpoint must use HTTPS.");
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", [headerName]: headerValue.replace("{API_KEY}", apiKey) }, body: JSON.stringify({ recipient: request.recipientE164, channel: "sms", code: request.code, expires_in: request.expiresInSeconds }), cache: "no-store", signal: AbortSignal.timeout(10000) });
    const data = await response.json().catch(() => null) as MimoResponse | null;
    if (!response.ok) return { status: "REJECTED", provider: this.name, providerStatus: data?.status ?? "HTTP_" + response.status };
    return { status: "ACCEPTED", provider: this.name, providerMessageId: data?.id ?? data?.message_id ?? data?.request_id, providerStatus: data?.status ?? "ACCEPTED_BY_API" };
  }
}
