import type {
  PaymentProviderAdapter,
} from "./payment-provider.types";

export class PaymentProviderRegistry {
  private readonly providers =
    new Map<string, PaymentProviderAdapter>();

  register(
    provider: PaymentProviderAdapter
  ): void {
    const name =
      provider.name.trim().toUpperCase();

    if (!name) {
      throw new Error(
        "Payment provider name is required."
      );
    }

    if (this.providers.has(name)) {
      throw new Error(
        `Payment provider "${name}" is already registered.`
      );
    }

    this.providers.set(name, provider);
  }

  get(
    providerName: string
  ): PaymentProviderAdapter {
    const normalized =
      providerName.trim().toUpperCase();

    if (!normalized) {
      throw new Error(
        "Payment provider is required."
      );
    }

    const provider =
      this.providers.get(normalized);

    if (!provider) {
      throw new Error(
        `Payment provider "${normalized}" is not configured.`
      );
    }

    return provider;
  }

  has(
    providerName: string
  ): boolean {
    return this.providers.has(
      providerName.trim().toUpperCase()
    );
  }

  list(): string[] {
    return Array.from(
      this.providers.keys()
    );
  }
}

export const paymentProviderRegistry =
  new PaymentProviderRegistry();
