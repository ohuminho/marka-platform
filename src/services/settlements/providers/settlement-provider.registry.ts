import type {
  SettlementProviderAdapter,
} from "./settlement-provider.types";

export class SettlementProviderRegistry {
  private readonly providers =
    new Map<string, SettlementProviderAdapter>();

  register(
    provider: SettlementProviderAdapter
  ): void {
    const name =
      provider.name.trim().toUpperCase();

    if (!name) {
      throw new Error(
        "Settlement provider name is required."
      );
    }

    if (this.providers.has(name)) {
      throw new Error(
        `Settlement provider "${name}" is already registered.`
      );
    }

    this.providers.set(name, provider);
  }

  get(
    providerName: string
  ): SettlementProviderAdapter {
    const normalized =
      providerName.trim().toUpperCase();

    if (!normalized) {
      throw new Error(
        "Settlement provider is required."
      );
    }

    const provider =
      this.providers.get(normalized);

    if (!provider) {
      throw new Error(
        `Settlement provider "${normalized}" is not configured.`
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

export const settlementProviderRegistry =
  new SettlementProviderRegistry();
