export interface Transaction {
  id: string;
  walletId: string;
  type: "CREDIT" | "DEBIT";
  amount: number;
  createdAt: Date;
}
