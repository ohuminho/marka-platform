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

  balance: number;

  currency: string;

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

