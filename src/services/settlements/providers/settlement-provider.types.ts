export type SettlementProviderPayoutStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

export interface SettlementProviderCreatePayoutInput {
  settlementId: string;
  amountMinor: bigint;
  currency: string;

  financialInstrumentType: string;
  financialInstrumentProviderRef: string;

  idempotencyKey: string;

  metadata?: Record<string, unknown>;
}

export interface SettlementProviderCreatePayoutResult {
  provider: string;
  providerPayoutId: string;
  status: SettlementProviderPayoutStatus;
  rawResponse?: Record<string, unknown>;
}

export interface SettlementProviderGetPayoutStatusInput {
  settlementId: string;
  providerPayoutId: string;
  amountMinor: bigint;
  currency: string;

  metadata?: Record<string, unknown>;
}

export interface SettlementProviderGetPayoutStatusResult {
  provider: string;
  providerPayoutId: string;
  status: SettlementProviderPayoutStatus;
  rawResponse?: Record<string, unknown>;
}

export interface SettlementProviderAdapter {
  readonly name: string;

  createPayout(
    input: SettlementProviderCreatePayoutInput
  ): Promise<SettlementProviderCreatePayoutResult>;

  getPayoutStatus(
    input: SettlementProviderGetPayoutStatusInput
  ): Promise<SettlementProviderGetPayoutStatusResult>;
  }
