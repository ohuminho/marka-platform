export interface SettlementProviderConfig {
  enabled: boolean;
  name: string;
  baseUrl: string;
  createPayoutPath: string;
  payoutStatusPath: string;
  apiKey?: string;
  bearerToken?: string;
  timeoutMs: number;
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

function parsePositiveInteger(
  value: string | undefined,
  fallback: number
): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function normalizePath(
  value: string | undefined,
  fallback: string
): string {
  const path = (value ?? fallback).trim();

  if (!path) {
    return fallback;
  }

  return path.startsWith("/")
    ? path
    : `/${path}`;
}

export function getSettlementProviderConfig(): SettlementProviderConfig {
  const enabled = parseBoolean(
    process.env.SETTLEMENT_PROVIDER_ENABLED,
    false
  );

  const name = (
    process.env.SETTLEMENT_PROVIDER_NAME ??
    ""
  ).trim().toUpperCase();

  const baseUrl = (
    process.env.SETTLEMENT_PROVIDER_BASE_URL ??
    ""
  ).trim();

  const createPayoutPath = normalizePath(
    process.env.SETTLEMENT_PROVIDER_CREATE_PAYOUT_PATH,
    "/payouts"
  );

  const payoutStatusPath = normalizePath(
    process.env.SETTLEMENT_PROVIDER_PAYOUT_STATUS_PATH,
    "/payouts/{providerPayoutId}"
  );

  const apiKey =
    process.env.SETTLEMENT_PROVIDER_API_KEY?.trim() ||
    undefined;

  const bearerToken =
    process.env.SETTLEMENT_PROVIDER_BEARER_TOKEN?.trim() ||
    undefined;

  const timeoutMs = parsePositiveInteger(
    process.env.SETTLEMENT_PROVIDER_TIMEOUT_MS,
    15000
  );

  if (!enabled) {
    return {
      enabled: false,
      name,
      baseUrl,
      createPayoutPath,
      payoutStatusPath,
      apiKey,
      bearerToken,
      timeoutMs,
    };
  }

  if (!name) {
    throw new Error(
      "Settlement provider name is required when the settlement provider is enabled."
    );
  }

  if (!baseUrl) {
    throw new Error(
      "Settlement provider base URL is required when the settlement provider is enabled."
    );
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(baseUrl);
  } catch {
    throw new Error(
      "Settlement provider base URL is invalid."
    );
  }

  if (
    parsedUrl.protocol !== "https:" &&
    process.env.NODE_ENV === "production"
  ) {
    throw new Error(
      "Settlement provider base URL must use HTTPS in production."
    );
  }

  if (!apiKey && !bearerToken) {
    throw new Error(
      "Settlement provider authentication is required when the settlement provider is enabled."
    );
  }

  return {
    enabled,
    name,
    baseUrl: baseUrl.replace(/\/+$/, ""),
    createPayoutPath,
    payoutStatusPath,
    apiKey,
    bearerToken,
    timeoutMs,
  };
}
