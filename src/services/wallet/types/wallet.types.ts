export enum TransactionType {
  DEPOSIT = "DEPOSIT",
  PAYMENT = "PAYMENT",
  WITHDRAWAL = "WITHDRAWAL",
  REFUND = "REFUND",
  COMMISSION = "COMMISSION",
}

export enum TransactionStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

export interface CreateTransactionInput {
  walletId: string;
  type: TransactionType;
  amount: number;
  reference: string;
  metadata?: string;
}

export interface WalletBalance {
  walletId: string;
  balanceMinor: string;
  heldBalanceMinor: string;
  currency: string;
  availableBalanceMinor: string;
}

export interface WalletSummary {
  walletId: string;
  userId: string;
  organizationId: string;
  accountId: string;
  balanceMinor: string;
  heldBalanceMinor: string;
  availableBalanceMinor: string;
  currency: string;
  status: "ACTIVE" | "FROZEN" | "CLOSED";
}

export interface WalletTransaction {
  id: string;
  type: string;
  status: string;
  direction: string;
  amountMinor: string;
  currency: string;
  reference: string;
  referenceType: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

export interface WalletDepositInput {
  walletId: string;
  amount: number;
  reference?: string;
  currency?: string;
  metadata?: string;
}

export interface WalletWithdrawalInput {
  walletId: string;
  amount: number;
  reference?: string;
  currency?: string;
  metadata?: string;
}

export interface WalletOperationResult {
  id: string;
  walletId: string;
  amountMinor: string;
  type: TransactionType;
  status: TransactionStatus;
  reference: string;
  currency: string;
  createdAt: Date;
}
