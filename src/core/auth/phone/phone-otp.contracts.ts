export type PhoneOtpChannel = "sms";

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

  send(request: PhoneOtpDeliveryRequest): Promise<PhoneOtpDeliveryResult>;
}

/**
 * SMS-only provider contract.
 * Email verification and recovery remain separate flows using the
 * existing MARKA email-delivery service. WhatsApp is intentionally
 * excluded from the phone OTP delivery contract.
 *
 * A concrete paid SMS provider must not be enabled until its
 * authentication headers, delivery semantics, pricing and production
 * credentials have been confirmed.
 */