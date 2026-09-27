

import { prisma } from "@/database/client/prisma";
import { accountService } from "@/services/accounts/account.service";

import {
  TransactionStatus,
  TransactionType,
  WalletBalance,
  WalletDepositInput,
  WalletSummary,
  WalletTransaction,
  WalletWithdrawalInput,
  WalletOperationResult,
  CreateTransactionInput,
} from "./types/wallet.types";

export class WalletService {
  async getWallet(
    userId: string,
    organizationId?: string,
    currency = "AOA"
  ): Promise<WalletSummary> {
    this.validateUserId(userId);

    const normalizedCurrency =
      this.normalizeCurrency(currency);

    const organization =
      await this.resolveOrganization(
        userId,
        organizationId
      );

    const account =
      await accountService.ensureCustomerWalletAccount({
        organizationId:
          organization.id,
        userId,
        currency:
          normalizedCurrency,
      });

    const wallet =
      await prisma.wallet.findUnique({
        where: {
          accountId: account.id,
        },
        select: {
          id: true,
          userId: true,
          currency: true,
          status: true,
        },
      });

    if (!wallet) {
      throw new Error(
        "Customer wallet record not found."
      );
    }

    const balanceMinor =
      BigInt(account.balanceMinor);

    const heldBalanceMinor =
      BigInt(account.heldBalanceMinor);

    const availableBalanceMinor =
      balanceMinor -
      heldBalanceMinor;

    return {
      walletId:
        wallet.id,
      userId:
        wallet.userId,
      organizationId:
        organization.id,
      accountId:
        account.id,
      balanceMinor:
        balanceMinor.toString(),
      heldBalanceMinor:
        heldBalanceMinor.toString(),
      availableBalanceMinor:
        availableBalanceMinor.toString(),
      currency:
        wallet.currency,
      status:
        wallet.status,
    };
  }

  async getBalance(
    userId: string,
    organizationId?: string,
    currency = "AOA"
  ): Promise<WalletBalance> {
    const wallet =
      await this.getWallet(
        userId,
        organizationId,
        currency
      );

    return {
      walletId:
        wallet.walletId,
      balanceMinor:
        wallet.balanceMinor,
      heldBalanceMinor:
        wallet.heldBalanceMinor,
      availableBalanceMinor:
        wallet.availableBalanceMinor,
      currency:
        wallet.currency,
    };
  }

  async listTransactions(
    userId: string,
    organizationId?: string,
    currency = "AOA",
    limit = 25
  ): Promise<WalletTransaction[]> {
    this.validateUserId(userId);

    const normalizedLimit =
      Math.min(
        Math.max(
          Number.isFinite(limit)
            ? Math.trunc(limit)
            : 25,
          1
        ),
        100
      );

    const wallet =
      await this.getWallet(
        userId,
        organizationId,
        currency
      );

    const transactions =
      await prisma.transaction.findMany({
        where: {
          OR: [
            {
              sourceAccountId:
                wallet.accountId,
            },
            {
              destinationAccountId:
                wallet.accountId,
            },
          ],
        },
        orderBy: {
          createdAt: "desc",
        },
        take:
          normalizedLimit,
        select: {
          id: true,
          type: true,
          status: true,
          direction: true,
          amountMinor: true,
          currency: true,
          reference: true,
          referenceType: true,
          createdAt: true,
          completedAt: true,
        },
      });

    return transactions.map(
      (transaction) => ({
        id:
          transaction.id,
        type:
          transaction.type,
        status:
          transaction.status,
        direction:
          transaction.direction,
        amountMinor:
          transaction.amountMinor.toString(),
        currency:
          transaction.currency,
        reference:
          transaction.reference,
        referenceType:
          transaction.referenceType,
        createdAt:
          transaction.createdAt,
        completedAt:
          transaction.completedAt,
      })
    );
  }

  /*
   * Wallet mutations must never manufacture money.
   *
   * Deposits must originate from a completed external
   * payment/provider flow and enter MARKA through the
   * Financial Core.
   */
  async deposit(
    _input: WalletDepositInput
  ): Promise<WalletOperationResult> {
    throw new Error(
      "Wallet deposits must be initiated through the MARKA Payment flow. Direct wallet balance mutation is not allowed."
    );
  }

  /*
   * Withdrawals are financial settlement operations.
   * They must go through the Settlement/Financial
   * Instrument flow rather than directly decrementing
   * the wallet balance.
   */
  async withdraw(
    _input: WalletWithdrawalInput
  ): Promise<WalletOperationResult> {
    throw new Error(
      "Wallet withdrawals must be processed through the MARKA Settlement flow. Direct wallet balance mutation is not allowed."
    );
  }

  /*
   * Retained only for compatibility with legacy callers.
   * It intentionally cannot mutate financial state.
   */
  async createTransaction(
    _input: CreateTransactionInput
  ): Promise<WalletOperationResult> {
    throw new Error(
      "Direct wallet transactions are disabled. Use the Financial Core TransactionService."
    );
  }

  async creditWallet(
    _walletId: string,
    _amount: number
  ): Promise<WalletOperationResult> {
    throw new Error(
      "Direct wallet credits are disabled. Use PaymentService and TransactionService."
    );
  }

  async debitWallet(
    _walletId: string,
    _amount: number
  ): Promise<WalletOperationResult> {
    throw new Error(
      "Direct wallet debits are disabled. Use TransactionService or the appropriate financial domain service."
    );
  }

  private async resolveOrganization(
    userId: string,
    requestedOrganizationId?: string
  ) {
    const membership =
      await prisma.organizationMembership.findFirst({
        where: {
          userId,
          status: "ACTIVE",
          organization: {
            status: "ACTIVE",
          },
          organizationId:
            requestedOrganizationId,
        },
        select: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      });

    if (membership) {
      return membership.organization;
    }

    if (requestedOrganizationId) {
      throw new Error(
        "User does not have access to the requested organization."
      );
    }

    const fallback =
      await prisma.organizationMembership.findFirst({
        where: {
          userId,
          status: "ACTIVE",
          organization: {
            status: "ACTIVE",
          },
        },
        select: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      });

    if (!fallback) {
      throw new Error(
        "Active organization membership not found."
      );
    }

    return fallback.organization;
  }

  private normalizeCurrency(
    currency: string
  ): string {
    const normalized =
      currency
        .trim()
        .toUpperCase();

    if (
      !/^[A-Z]{3}$/.test(
        normalized
      )
    ) {
      throw new Error(
        "Currency must be a valid ISO 4217 code."
      );
    }

    return normalized;
  }

  private validateUserId(
    userId: string
  ): void {
    if (!userId?.trim()) {
      throw new Error(
        "User is required."
      );
    }
  }
}

export const walletService =
  new WalletService();
