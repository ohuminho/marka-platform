export type TransactionType =
  | "PAYMENT"
  | "REFUND"
  | "TRANSFER"
  | "COMMISSION";

export interface Transaction {
  id: string;
  walletId: string;
  type: TransactionType;
  amount: number;
  createdAt: Date;
}
