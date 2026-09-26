import { SandboxPaymentProviderAdapter } from "@/services/payments/providers/sandbox-payment-provider.adapter";

function assert(
  condition: boolean,
  message: string
): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function assertRejects(
  callback: () => Promise<unknown>,
  expectedMessage: string,
  message: string
): Promise<void> {
  try {
    await callback();
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

async function main(): Promise<void> {
  const adapter =
    new SandboxPaymentProviderAdapter();

  const intent =
    await adapter.createIntent({
      paymentId: "payment-001",
      orderId: "order-001",
      amountMinor: 100000n,
      currency: "AOA",
      customerId: "user-001",
      metadata: {
        test: true,
      },
    });

  assert(
    intent.provider === "SANDBOX",
    "Create intent should use SANDBOX provider"
  );

  assert(
    intent.status === "CREATED",
    "Create intent should return CREATED"
  );

  assert(
    intent.providerPaymentId ===
      "SANDBOX-PAYMENT-payment-001",
    "Provider payment id must be deterministic"
  );

  assert(
    intent.rawResponse?.amountMinor ===
      "100000",
    "Raw response must preserve amount in minor units"
  );

  const confirmation =
    await adapter.confirm({
      paymentId: "payment-001",
      providerPaymentId:
        intent.providerPaymentId,
      amountMinor: 100000n,
      currency: "AOA",
      orderId: "order-001",
      customerId: "user-001",
    });

  assert(
    confirmation.provider === "SANDBOX",
    "Confirmation should use SANDBOX provider"
  );

  assert(
    confirmation.status === "COMPLETED",
    "Sandbox confirmation should complete"
  );

  assert(
    confirmation.providerPaymentId ===
      intent.providerPaymentId,
    "Confirmation must preserve provider payment id"
  );

  const refund =
    await adapter.refund({
      paymentId: "payment-001",
      providerPaymentId:
        intent.providerPaymentId,
      amountMinor: 100000n,
      currency: "AOA",
      orderId: "order-001",
      customerId: "user-001",
    });

  assert(
    refund.provider === "SANDBOX",
    "Refund should use SANDBOX provider"
  );

  assert(
    refund.status === "COMPLETED",
    "Sandbox refund should complete"
  );

  await assertRejects(
    () =>
      adapter.createIntent({
        paymentId: "",
        orderId: "order-001",
        amountMinor: 100000n,
        currency: "AOA",
        customerId: "user-001",
      }),
    "Sandbox payment id is required.",
    "Empty payment id must be rejected"
  );

  await assertRejects(
    () =>
      adapter.createIntent({
        paymentId: "payment-002",
        orderId: "order-002",
        amountMinor: 0n,
        currency: "AOA",
        customerId: "user-001",
      }),
    "Sandbox payment amount must be greater than zero.",
    "Zero payment amount must be rejected"
  );

  await assertRejects(
    () =>
      adapter.confirm({
        paymentId: "payment-001",
        providerPaymentId: "",
        amountMinor: 100000n,
        currency: "AOA",
        orderId: "order-001",
        customerId: "user-001",
      }),
    "Sandbox provider payment id is required.",
    "Missing provider payment id must be rejected"
  );

  await assertRejects(
    () =>
      adapter.refund({
        paymentId: "payment-001",
        providerPaymentId:
          intent.providerPaymentId,
        amountMinor: 0n,
        currency: "AOA",
        orderId: "order-001",
        customerId: "user-001",
      }),
    "Sandbox refund amount must be greater than zero.",
    "Zero refund amount must be rejected"
  );

  console.log(
    "Sandbox payment provider contract tests passed."
  );
}

main().catch((error) => {
  console.error(
    "Sandbox payment provider tests failed."
  );
  console.error(error);
  process.exitCode = 1;
});
