import {
  TransactionStatus,
  TransactionType,
  CreateTransactionInput,
  WalletBalance,
  WalletDepositInput,
  WalletWithdrawalInput,
} from "./types/wallet.types";
export interface WalletSummary {
  walletId: string;
  userId: string;
  balance: number;
  currency: string;
  status: "ACTIVE" | "SUSPENDED" | "CLOSED";
}

export interface WalletOperationResult {
  id: string;
  walletId: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  reference: string;
  currency: string;
  createdAt: Date;
}


export class WalletService {
  async getWallet(
    walletId: string
  ): Promise<WalletSummary> {
    this.validateWalletId(walletId);

    return {
      walletId,
      userId: walletId,
      balance: 0,
      currency: "AOA",
      status: "ACTIVE",
    };
  }

  async getBalance(
    walletId: string
  ): Promise<WalletBalance> {
    this.validateWalletId(walletId);

    return {
      walletId,
      balance: 0,
      currency: "AOA",
    };
  }

  async createTransaction(
    input: CreateTransactionInput
  ): Promise<WalletOperationResult> {
    this.validateWalletId(input.walletId);
    this.validateAmount(input.amount);

    const transactionId =
      crypto.randomUUID();

    const reference =
      input.reference?.trim() ||
      `WALLET-${transactionId}`;

    return {
      id: transactionId,
      walletId: input.walletId,
      amount: input.amount,
      type: input.type,
      status: TransactionStatus.PENDING,
      reference,
      currency: "AOA",
      createdAt: new Date(),
    };
  }

  async creditWallet(
    walletId: string,
    amount: number
  ): Promise<WalletOperationResult> {
    this.validateWalletId(walletId);
    this.validateAmount(amount);

    return this.createOperation(
      walletId,
      amount,
      TransactionType.DEPOSIT,
      `DEPOSIT-${crypto.randomUUID()}`
    );
  }

  async debitWallet(
    walletId: string,
    amount: number
  ): Promise<WalletOperationResult> {
    this.validateWalletId(walletId);
    this.validateAmount(amount);

    return this.createOperation(
      walletId,
      amount,
      TransactionType.PAYMENT,
      `PAYMENT-${crypto.randomUUID()}`
    );
  }

  async deposit(
    input: WalletDepositInput
  ): Promise<WalletOperationResult> {
    this.validateWalletId(input.walletId);
    this.validateAmount(input.amount);

    return this.createOperation(
      input.walletId,
      input.amount,
      TransactionType.DEPOSIT,
      input.reference ??
        `DEPOSIT-${crypto.randomUUID()}`
    );
  }

  async withdraw(
    input: WalletWithdrawalInput
  ): Promise<WalletOperationResult> {
    this.validateWalletId(input.walletId);
    this.validateAmount(input.amount);

    return this.createOperation(
      input.walletId,
      input.amount,
      TransactionType.WITHDRAWAL,
      input.reference ??
        `WITHDRAWAL-${crypto.randomUUID()}`
    );
  }

  private createOperation(
    walletId: string,
    amount: number,
    type: TransactionType,
    reference: string
  ): WalletOperationResult {
    return {
      id: crypto.randomUUID(),
      walletId,
      amount,
      type,
      status: TransactionStatus.PENDING,
      reference,
      currency: "AOA",
      createdAt: new Date(),
    };
  }

  private validateWalletId(
    walletId: string
  ): void {
    if (!walletId || !walletId.trim()) {
      throw new Error(
        "Wallet ID is required"
      );
    }
  }

  private validateAmount(
    amount: number
  ): void {
    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      throw new Error(
        "Wallet amount must be greater than zero"
      );
    }
  }
}
