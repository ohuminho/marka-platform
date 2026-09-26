import type {
  PaymentProviderAdapter,
  PaymentProviderConfirmInput,
  PaymentProviderConfirmResult,
  PaymentProviderCreateIntentInput,
  PaymentProviderIntentResult,
  PaymentProviderRefundInput,
  PaymentProviderRefundResult,
} from "@/services/payments/providers/payment-provider.types";

import {
  PaymentProviderRegistry,
} from "@/services/payments/providers/payment-provider.registry";

function assert(
  condition: boolean,
  message: string
): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertThrows(
  callback: () => unknown,
  expectedMessage: string,
  message: string
): void {
  try {
    callback();
  } catch (error) {
    const received =
      error instanceof Error
        ? error.message
        : String(error);

    assert(
      received === expectedMessage,
      `${message}. Expected "${expectedMessage}", received "${received}".`
    );

    return;
  }

  throw new Error(
    `Assertion failed: ${message}. Expected an exception.`
  );
}

class TestPaymentProvider
  implements PaymentProviderAdapter
{
  readonly name = "TEST_PROVIDER";

  async createIntent(
    _input: PaymentProviderCreateIntentInput
  ): Promise<PaymentProviderIntentResult> {
    return {
      provider: this.name,
      providerPaymentId: "TEST-PAYMENT-001",
      status: "CREATED",
    };
  }

  async confirm(
    input: PaymentProviderConfirmInput
  ): Promise<PaymentProviderConfirmResult> {
    return {
      provider: this.name,
      providerPaymentId:
        input.providerPaymentId,
      status: "COMPLETED",
    };
  }

  async refund(
    input: PaymentProviderRefundInput
  ): Promise<PaymentProviderRefundResult> {
    return {
      provider: this.name,
      providerPaymentId:
        input.providerPaymentId,
      status: "COMPLETED",
    };
  }
}

const registry =
  new PaymentProviderRegistry();

const provider =
  new TestPaymentProvider();

registry.register(provider);

assert(
  registry.has("TEST_PROVIDER"),
  "Registered provider must be discoverable"
);

assert(
  registry.has("test_provider"),
  "Provider lookup must be case-insensitive"
);

const resolved =
  registry.get(" test_provider ");

assert(
  resolved === provider,
  "Registry must return the registered provider instance"
);

assert(
  registry.list().length === 1,
  "Registry should contain exactly one provider"
);

assert(
  registry.list()[0] === "TEST_PROVIDER",
  "Registry should normalize provider names"
);

assertThrows(
  () => registry.register(provider),
  'Payment provider "TEST_PROVIDER" is already registered.',
  "Duplicate providers must be rejected"
);

assertThrows(
  () => registry.get("UNKNOWN_PROVIDER"),
  'Payment provider "UNKNOWN_PROVIDER" is not configured.',
  "Unknown providers must be rejected"
);

assertThrows(
  () => registry.get(""),
  "Payment provider is required.",
  "Empty provider names must be rejected"
);

console.log(
  "Payment provider registry tests passed."
);
