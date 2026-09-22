import {
  getSettlementProviderConfig,
} from "@/config/settlement-provider.config";

import {
  settlementProviderRegistry,
} from "./settlement-provider.registry";

import {
  HttpSettlementProviderAdapter,
} from "./http-settlement-provider.adapter";

let initialized = false;

export function ensureSettlementProvidersRegistered(): void {
  if (initialized) {
    return;
  }

  const config =
    getSettlementProviderConfig();

  if (!config.enabled) {
    initialized = true;
    return;
  }

  if (
    settlementProviderRegistry.has(
      config.name
    )
  ) {
    initialized = true;
    return;
  }

  settlementProviderRegistry.register(
    new HttpSettlementProviderAdapter(
      config
    )
  );

  initialized = true;
}
