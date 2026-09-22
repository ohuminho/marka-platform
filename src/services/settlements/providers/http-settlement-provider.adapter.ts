import type {
  SettlementProviderAdapter,
  SettlementProviderCreatePayoutInput,
  SettlementProviderCreatePayoutResult,
  SettlementProviderGetPayoutStatusInput,
  SettlementProviderGetPayoutStatusResult,
  SettlementProviderPayoutStatus,
} from "./settlement-provider.types";

import {
  getSettlementProviderConfig,
  type SettlementProviderConfig,
} from "@/config/settlement-provider.config";

interface ProviderResponse {
  providerPayoutId?: unknown;
  payoutId?: unknown;
  id?: unknown;
  status?: unknown;
  rawResponse?: unknown;
  data?: unknown;
  message?: unknown;
  error?: unknown;
}

export class HttpSettlementProviderAdapter
  implements SettlementProviderAdapter
{
  readonly name: string;

  private readonly config: SettlementProviderConfig;

  constructor(
    config: SettlementProviderConfig = getSettlementProviderConfig()
  ) {
    if (!config.enabled) {
      throw new Error(
        "Settlement provider HTTP adapter is disabled."
      );
    }

    this.config = config;
    this.name = config.name;
  }

  async createPayout(
    input: SettlementProviderCreatePayoutInput
  ): Promise<SettlementProviderCreatePayoutResult> {
    this.validateCreateInput(input);

    const response = await this.request(
      this.config.createPayoutPath,
      {
        method: "POST",
        body: {
          settlementId: input.settlementId,
          amountMinor: input.amountMinor.toString(),
          currency: input.currency,
          financialInstrument: {
            type: input.financialInstrumentType,
            providerRef:
              input.financialInstrumentProviderRef,
          },
          idempotencyKey: input.idempotencyKey,
          metadata: input.metadata ?? {},
        },
        idempotencyKey: input.idempotencyKey,
      }
    );

    return this.toCreateResult(
      response
    );
  }

  async getPayoutStatus(
    input: SettlementProviderGetPayoutStatusInput
  ): Promise<SettlementProviderGetPayoutStatusResult> {
    this.validateStatusInput(input);

    const path =
      this.config.payoutStatusPath.replace(
        "{providerPayoutId}",
        encodeURIComponent(
          input.providerPayoutId
        )
      );

    const response = await this.request(
      path,
      {
        method: "GET",
      }
    );

    return this.toStatusResult(
      response,
      input.providerPayoutId
    );
  }

  private async request(
    path: string,
    options: {
      method: "GET" | "POST";
      body?: Record<string, unknown>;
      idempotencyKey?: string;
    }
  ): Promise<ProviderResponse> {
    const url = this.buildUrl(path);

    const headers = new Headers();

    headers.set(
      "Accept",
      "application/json"
    );

    headers.set(
      "Content-Type",
      "application/json"
    );

    headers.set(
      "User-Agent",
      "MARKA-SettlementEngine/1.0"
    );

    if (this.config.apiKey) {
      headers.set(
        "X-API-Key",
        this.config.apiKey
      );
    }

    if (this.config.bearerToken) {
      headers.set(
        "Authorization",
        `Bearer ${this.config.bearerToken}`
      );
    }

    if (options.idempotencyKey) {
      headers.set(
        "Idempotency-Key",
        options.idempotencyKey
      );
    }

    const controller =
      new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      this.config.timeoutMs
    );

    try {
      const response = await fetch(
        url,
        {
          method: options.method,
          headers,
          body:
            options.method === "POST"
              ? JSON.stringify(
                  options.body ?? {}
                )
              : undefined,
          signal:
            controller.signal,
          cache: "no-store",
        }
      );

      const text =
        await response.text();

      const parsed =
        this.parseResponse(text);

      if (!response.ok) {
        throw new Error(
          this.buildProviderError(
            response.status,
            parsed
          )
        );
      }

      if (
        parsed === null ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        throw new Error(
          "Settlement provider returned an invalid response."
        );
      }

      return parsed as ProviderResponse;
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "AbortError"
      ) {
        throw new Error(
          "Settlement provider request timed out."
        );
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildUrl(
    path: string
  ): string {
    const normalizedPath =
      path.startsWith("/")
        ? path
        : `/${path}`;

    return `${this.config.baseUrl}${normalizedPath}`;
  }

  private parseResponse(
    text: string
  ): unknown {
    if (!text.trim()) {
      return {};
    }

    try {
      return JSON.parse(text);
    } catch {
      throw new Error(
        "Settlement provider returned invalid JSON."
      );
    }
  }

  private buildProviderError(
    statusCode: number,
    response: ProviderResponse
  ): string {
    const message =
      typeof response.message ===
      "string"
        ? response.message
        : typeof response.error ===
          "string"
          ? response.error
          : undefined;

    if (message) {
      return `Settlement provider request failed with HTTP ${statusCode}: ${message}`;
    }

    return `Settlement provider request failed with HTTP ${statusCode}.`;
  }

  private toCreateResult(
    response: ProviderResponse
  ): SettlementProviderCreatePayoutResult {
    const providerPayoutId =
      this.extractProviderPayoutId(
        response
      );

    const status =
      this.extractStatus(
        response
      );

    return {
      provider: this.name,
      providerPayoutId,
      status,
      rawResponse:
        this.sanitizeResponse(
          response
        ),
    };
  }

  private toStatusResult(
    response: ProviderResponse,
    fallbackProviderPayoutId: string
  ): SettlementProviderGetPayoutStatusResult {
    const providerPayoutId =
      this.extractProviderPayoutId(
        response
      ) ||
      fallbackProviderPayoutId;

    const status =
      this.extractStatus(
        response
      );

    return {
      provider: this.name,
      providerPayoutId,
      status,
      rawResponse:
        this.sanitizeResponse(
          response
        ),
    };
  }

  private extractProviderPayoutId(
    response: ProviderResponse
  ): string {
    const candidates = [
      response.providerPayoutId,
      response.payoutId,
      response.id,
    ];

    for (const candidate of candidates) {
      if (
        typeof candidate ===
          "string" &&
        candidate.trim()
      ) {
        return candidate.trim();
      }
    }

    throw new Error(
      "Settlement provider response does not contain a payout identifier."
    );
  }

  private extractStatus(
    response: ProviderResponse
  ): SettlementProviderPayoutStatus {
    if (
      typeof response.status !==
      "string"
    ) {
      throw new Error(
        "Settlement provider response does not contain a payout status."
      );
    }

    const normalized =
      response.status
        .trim()
        .toUpperCase();

    switch (normalized) {
      case "PENDING":
      case "CREATED":
      case "QUEUED":
        return "PENDING";

      case "PROCESSING":
      case "IN_PROGRESS":
      case "SUBMITTED":
        return "PROCESSING";

      case "COMPLETED":
      case "SUCCESS":
      case "SUCCEEDED":
      case "PAID":
        return "COMPLETED";

      case "FAILED":
      case "FAILURE":
      case "REJECTED":
      case "DECLINED":
        return "FAILED";

      default:
        throw new Error(
          `Unsupported settlement provider payout status: ${normalized}`
        );
    }
  }

  private sanitizeResponse(
    response: ProviderResponse
  ): Record<string, unknown> {
    return this.sanitizeValue(
      response
    ) as Record<string, unknown>;
  }

  private sanitizeValue(
    value: unknown,
    key?: string
  ): unknown {
    if (
      key &&
      this.isSensitiveKey(key)
    ) {
      return "[REDACTED]";
    }

    if (
      Array.isArray(value)
    ) {
      return value.map(
        (item) =>
          this.sanitizeValue(
            item
          )
      );
    }

    if (
      value !== null &&
      typeof value === "object"
    ) {
      const source =
        value as Record<
          string,
          unknown
        >;

      const result: Record<
        string,
        unknown
      > = {};

      for (
        const [
          childKey,
          childValue,
        ] of Object.entries(
          source
        )
      ) {
        result[childKey] =
          this.sanitizeValue(
            childValue,
            childKey
          );
      }

      return result;
    }

    return value;
  }

  private isSensitiveKey(
    key: string
  ): boolean {
    const normalized =
      key
        .replace(
          /[_-]/g,
          ""
        )
        .toLowerCase();

    return [
      "apikey",
      "accesstoken",
      "authorization",
      "bearertoken",
      "clientsecret",
      "secret",
      "password",
      "cvv",
      "cvc",
      "pin",
    ].includes(
      normalized
    );
  }

  private validateCreateInput(
    input: SettlementProviderCreatePayoutInput
  ): void {
    if (
      !input.settlementId.trim()
    ) {
      throw new Error(
        "Settlement provider requires a settlement id."
      );
    }

    if (
      input.amountMinor <=
      BigInt(0)
    ) {
      throw new Error(
        "Settlement provider payout amount must be greater than zero."
      );
    }

    if (
      !/^[A-Z]{3}$/.test(
        input.currency
          .trim()
          .toUpperCase()
      )
    ) {
      throw new Error(
        "Settlement provider payout currency is invalid."
      );
    }

    if (
      !input.financialInstrumentType.trim()
    ) {
      throw new Error(
        "Settlement provider requires a financial instrument type."
      );
    }

    if (
      !input.financialInstrumentProviderRef.trim()
    ) {
      throw new Error(
        "Settlement provider requires a financial instrument reference."
      );
    }

    if (
      !input.idempotencyKey.trim()
    ) {
      throw new Error(
        "Settlement provider requires an idempotency key."
      );
    }
  }

  private validateStatusInput(
    input: SettlementProviderGetPayoutStatusInput
  ): void {
    if (
      !input.settlementId.trim()
    ) {
      throw new Error(
        "Settlement provider requires a settlement id."
      );
    }

    if (
      !input.providerPayoutId.trim()
    ) {
      throw new Error(
        "Settlement provider requires a payout id."
      );
    }

    if (
      input.amountMinor <=
      BigInt(0)
    ) {
      throw new Error(
        "Settlement provider payout amount must be greater than zero."
      );
    }

    if (
      !/^[A-Z]{3}$/.test(
        input.currency
          .trim()
          .toUpperCase()
      )
    ) {
      throw new Error(
        "Settlement provider payout currency is invalid."
      );
    }
  }
  }
