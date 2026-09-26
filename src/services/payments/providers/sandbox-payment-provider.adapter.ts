import type {
  PaymentProviderAdapter,
  PaymentProviderConfirmInput,
  PaymentProviderConfirmResult,
  PaymentProviderCreateIntentInput,
  PaymentProviderIntentResult,
  PaymentProviderRefundInput,
  PaymentProviderRefundResult,
} from "./payment-provider.types";

export class SandboxPaymentProviderAdapter
  implements PaymentProviderAdapter
{
  readonly name = "SANDBOX";

  async createIntent(
    input: PaymentProviderCreateIntentInput
  ): Promise<PaymentProviderIntentResult> {
    if (!input.paymentId.trim()) {
      throw new Error(
        "Sandbox payment id is required."
      );
    }

    if (!input.orderId.trim()) {
      throw new Error(
        "Sandbox order id is required."
      );
    }

    if (input.amountMinor <= 0n) {
      throw new Error(
        "Sandbox payment amount must be greater than zero."
      );
    }

    if (!input.currency.trim()) {
      throw new Error(
        "Sandbox payment currency is required."
      );
    }

    if (!input.customerId.trim()) {
      throw new Error(
        "Sandbox customer id is required."
      );
    }

    return {
      provider: this.name,
      providerPaymentId:
        `SANDBOX-PAYMENT-${input.paymentId}`,
      status: "CREATED",
      rawResponse: {
        mode: "sandbox",
        operation: "create_intent",
        paymentId: input.paymentId,
        orderId: input.orderId,
        amountMinor: input.amountMinor.toString(),
        currency: input.currency,
      },
    };
  }

  async confirm(
    input: PaymentProviderConfirmInput
  ): Promise<PaymentProviderConfirmResult> {
    if (!input.paymentId.trim()) {
      throw new Error(
        "Sandbox payment id is required."
      );
    }

    if (!input.providerPaymentId.trim()) {
      throw new Error(
        "Sandbox provider payment id is required."
      );
    }

    if (input.amountMinor <= 0n) {
      throw new Error(
        "Sandbox payment amount must be greater than zero."
      );
    }

    if (!input.currency.trim()) {
      throw new Error(
        "Sandbox payment currency is required."
      );
    }

    if (!input.orderId.trim()) {
      throw new Error(
        "Sandbox order id is required."
      );
    }

    if (!input.customerId.trim()) {
      throw new Error(
        "Sandbox customer id is required."
      );
    }

    return {
      provider: this.name,
      providerPaymentId:
        input.providerPaymentId,
      status: "COMPLETED",
      rawResponse: {
        mode: "sandbox",
        operation: "confirm",
        paymentId: input.paymentId,
        providerPaymentId:
          input.providerPaymentId,
      },
    };
  }

  async refund(
    input: PaymentProviderRefundInput
  ): Promise<PaymentProviderRefundResult> {
    if (!input.paymentId.trim()) {
      throw new Error(
        "Sandbox payment id is required."
      );
    }

    if (!input.providerPaymentId.trim()) {
      throw new Error(
        "Sandbox provider payment id is required."
      );
    }

    if (input.amountMinor <= 0n) {
      throw new Error(
        "Sandbox refund amount must be greater than zero."
      );
    }

    if (!input.currency.trim()) {
      throw new Error(
        "Sandbox refund currency is required."
      );
    }

    if (!input.orderId.trim()) {
      throw new Error(
        "Sandbox order id is required."
      );
    }

    if (!input.customerId.trim()) {
      throw new Error(
        "Sandbox customer id is required."
      );
    }

    return {
      provider: this.name,
      providerPaymentId:
        input.providerPaymentId,
      status: "COMPLETED",
      rawResponse: {
        mode: "sandbox",
        operation: "refund",
        paymentId: input.paymentId,
        providerPaymentId:
          input.providerPaymentId,
        amountMinor:
          input.amountMinor.toString(),
      },
    };
  }
}
