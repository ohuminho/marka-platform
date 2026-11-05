import type {
  PhoneOtpDeliveryProvider,
  PhoneOtpDeliveryRequest,
  PhoneOtpDeliveryResult,
} from "./phone-otp.contracts";

interface MimoVerifyResponse {
  status?: string;
  id?: string;
  message_id?: string;
  request_id?: string;
}

/**
 * MIMO Verify SMS transport.
 * The public integration page documents the endpoint and payload but not
 * the authentication header or complete response schema. Those details
 * remain configurable and must be confirmed by Backbone before activation.
 */
export class MimoVerifySmsProvider
  implements PhoneOtpDeliveryProvider
{
  readonly name = "mimo-verify";

  async send(
    request: PhoneOtpDeliveryRequest
  ): Promise<PhoneOtpDeliveryResult> {
    const apiKey = process.env.MIMO_VERIFY_API_KEY;
    const authHeaderName =
      process.env.MIMO_VERIFY_AUTH_HEADER_NAME;
    const authHeaderValue =
      process.env.MIMO_VERIFY_AUTH_HEADER_VALUE;
    const baseUrl = (
      process.env.MIMO_VERIFY_BASE_URL ??
      "https://verify.mimo.ao"
    ).replace(/\/+$/, "");

    if (!apiKey || !authHeaderName || !authHeaderValue) {
      throw new Error(
        "MIMO Verify is not configured. Obtain the API key and authentication-header specification from Backbone."
      );
    }

    if (!/^[A-Za-z0-9-]+$/.test(authHeaderName)) {
      throw new Error("MIMO_VERIFY_AUTH_HEADER_NAME is invalid.");
    }

    const response = await fetch(`${baseUrl}/v1/otp/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [authHeaderName]: authHeaderValue.replace("{API_KEY}", apiKey),
      },
      body: JSON.stringify({
        recipient: request.recipientE164,
        channel: "sms",
        code: request.code,
        expires_in: request.expiresInSeconds,
      }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });

    const payload = (await response
      .json()
      .catch(() => null)) as MimoVerifyResponse | null;

    if (!response.ok) {
      return {
        status: "REJECTED",
        provider: this.name,
        providerStatus: payload?.status ?? `HTTP_${response.status}`,
      };
    }

    return {
      status: "ACCEPTED",
      provider: this.name,
      providerMessageId:
        payload?.id ?? payload?.message_id ?? payload?.request_id,
      providerStatus: payload?.status ?? "ACCEPTED_BY_API",
    };
  }
}
