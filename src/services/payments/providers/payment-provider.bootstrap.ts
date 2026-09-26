import { getPaymentProviderConfig } from "@/config/payment-provider.config";

import { paymentProviderRegistry } from "./payment-provider.registry";
import { SandboxPaymentProviderAdapter } from "./sandbox-payment-provider.adapter";

let initialized = false;

export function ensurePaymentProvidersRegistered(): void {
  if (initialized) {
    return;
  }

  const config =
    getPaymentProviderConfig();

  if (!config.enabled) {
    initialized = true;
    return;
  }

  if (
    paymentProviderRegistry.has(
      config.name
    )
  ) {
    initialized = true;
    return;
  }

  switch (config.name) {
    case "SANDBOX":
      paymentProviderRegistry.register(
        new SandboxPaymentProviderAdapter()
      );
      break;

    default:
      throw new Error(
        `Payment provider "${config.name}" is not supported by the current bootstrap.`
      );
  }

  initialized = true;
}
