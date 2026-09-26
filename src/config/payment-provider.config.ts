export interface PaymentProviderConfig {
  enabled: boolean;
  name: string;
}

function parseBoolean(
  value: string | undefined,
  fallback: boolean
): boolean {
  if (value === undefined) {
    return fallback;
  }

  return value.trim().toLowerCase() === "true";
}

export function getPaymentProviderConfig(): PaymentProviderConfig {
  const enabled = parseBoolean(
    process.env.PAYMENT_PROVIDER_ENABLED,
    false
  );

  const name = (
    process.env.PAYMENT_PROVIDER_NAME ?? ""
  )
    .trim()
    .toUpperCase();

  if (!enabled) {
    return {
      enabled: false,
      name,
    };
  }

  if (!name) {
    throw new Error(
      "Payment provider name is required when the payment provider is enabled."
    );
  }

  if (
    process.env.NODE_ENV === "production" &&
    name === "SANDBOX"
  ) {
    throw new Error(
      "SANDBOX payment provider cannot be enabled in production."
    );
  }

  return {
    enabled: true,
    name,
  };
}
