export interface LedgerResult {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  currency: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LedgerEntryResult {
  id: string;
  ledgerId: string;
  transactionId: string;
  accountId: string;
  direction: "DEBIT" | "CREDIT";
  amountMinor: string;
  currency: string;
  sequence: number;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface LedgerEntryFilter {
  accountId?: string;
  transactionId?: string;
  direction?: "DEBIT" | "CREDIT";
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

export interface LedgerSummaryResult {
  ledger: LedgerResult;
  entryCount: number;
  debitMinor: string;
  creditMinor: string;
  netMinor: string;
}
