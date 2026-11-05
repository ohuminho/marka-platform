export type PhoneOtpChannel = "sms" | "whatsapp" | "email";

export type PhoneOtpPurpose =
  | "SIGN_UP"
  | "PHONE_CHANGE"
  | "PASSWORD_RECOVERY"
  | "SENSITIVE_ACTION";

export type PhoneOtpDeliveryStatus =
  | "ACCEPTED"
  | "REJECTED"
  | "UNKNOWN";

export interface PhoneOtpDeliveryRequest {
  recipientE164: string;
  code: string;
  channel: PhoneOtpChannel;
  expiresInSeconds: number;
  idempotencyKey: string;
}

export interface PhoneOtpDeliveryResult {
  status: PhoneOtpDeliveryStatus;
  provider: string;
  providerMessageId?: string;
  providerStatus?: string;
}

export interface PhoneOtpDeliveryProvider {
  readonly name: string;

  send(
    request: PhoneOtpDeliveryRequest
  ): Promise<PhoneOtpDeliveryResult>;
}

/**
 * Provider contract only. A concrete paid provider must not be enabled
 * until its authentication headers, delivery semantics, pricing and
 * production credentials have been confirmed with the provider.
 */
