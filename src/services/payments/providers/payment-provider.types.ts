export interface PaymentProviderCreateIntentInput {
  paymentId: string;
  orderId: string;
  amountMinor: bigint;
  currency: string;
  customerId: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentProviderIntentResult {
  provider: string;
  providerPaymentId: string;
  status:
    | "CREATED"
    | "PENDING"
    | "PROCESSING"
    | "COMPLETED"
    | "FAILED"
    | "CANCELLED";
  rawResponse?: Record<string, unknown>;
}

export interface PaymentProviderConfirmInput {
  paymentId: string;
  providerPaymentId: string;
  amountMinor: bigint;
  currency: string;
  orderId: string;
  customerId: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentProviderConfirmResult {
  provider: string;
  providerPaymentId: string;
  status:
    | "PENDING"
    | "PROCESSING"
    | "COMPLETED"
    | "FAILED"
    | "CANCELLED";
  rawResponse?: Record<string, unknown>;
}

export interface PaymentProviderRefundInput {
  paymentId: string;
  providerPaymentId: string;
  amountMinor: bigint;
  currency: string;
  orderId: string;
  customerId: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentProviderRefundResult {
  provider: string;
  providerPaymentId: string;
  status:
    | "PENDING"
    | "PROCESSING"
    | "COMPLETED"
    | "FAILED";
  rawResponse?: Record<string, unknown>;
}

export interface PaymentProviderAdapter {
  readonly name: string;

  createIntent(
    input: PaymentProviderCreateIntentInput
  ): Promise<PaymentProviderIntentResult>;

  confirm(
    input: PaymentProviderConfirmInput
  ): Promise<PaymentProviderConfirmResult>;

  refund(
    input: PaymentProviderRefundInput
  ): Promise<PaymentProviderRefundResult>;
}
