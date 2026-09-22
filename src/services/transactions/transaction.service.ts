import {
  Prisma,
  TransactionActorType,
  TransactionDirection,
  TransactionStatus,
  TransactionType,
} from "@prisma/client";

import { prisma } from "@/database/client/prisma";
import { IdempotencyService } from "@/core/idempotency/idempotency.service";

export interface CreateTransactionInput {
  organizationId: string;
  idempotencyKey: string;

  type: TransactionType;
  direction: TransactionDirection;

  amountMinor: bigint;
  currency: string;

  actorUserId?: string;
  actorType?: TransactionActorType;

  sourceAccountId: string;
  destinationAccountId: string;

  reference?: string;
  referenceType?: string;
  orderId?: string;
  vendorId?: string;
  context?: string;

  metadata?: Record<string, unknown>;

  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
  requestId?: string;
}

export interface CreateExternalCreditInput {
  organizationId: string;
  idempotencyKey: string;

  type: TransactionType;
  amountMinor: bigint;
  currency: string;

  destinationAccountId: string;

  actorUserId?: string;
  actorType?: TransactionActorType;

  reference?: string;
  referenceType?: string;

  orderId?: string;
  vendorId?: string;
  context?: string;

  paymentId?: string;
  provider?: string;
  providerPaymentId?: string;

  metadata?: Record<string, unknown>;

  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
  requestId?: string;
}

export interface TransactionResult {
  id: string;
  reference: string;
  status: TransactionStatus;
  type: TransactionType;
  direction: TransactionDirection;
  amountMinor: string;
  currency: string;
  sourceAccountId: string;
  destinationAccountId: string;
  completedAt: Date | null;
}

export interface ExternalCreditTransactionResult {
  id: string;
  reference: string;
  status: TransactionStatus;
  type: TransactionType;
  direction: TransactionDirection;
  amountMinor: string;
  currency: string;
  sourceAccountId: null;
  destinationAccountId: string;
  completedAt: Date | null;
}

export type FinancialTransactionClient =
  Prisma.TransactionClient;

const DEFAULT_LEDGER_CODE =
  "MARKA-OPERATING";

export class TransactionService {
  private readonly idempotencyService =
    new IdempotencyService();

  async create(
    input: CreateTransactionInput
  ): Promise<TransactionResult> {
    this.validateInput(input);

    const requestBody = {
      organizationId:
        input.organizationId,
      type: input.type,
      direction:
        input.direction,
      amountMinor:
        input.amountMinor.toString(),
      currency:
        input.currency,
      actorUserId:
        input.actorUserId ?? null,
      actorType:
        input.actorType ?? "SYSTEM",
      sourceAccountId:
        input.sourceAccountId,
      destinationAccountId:
        input.destinationAccountId,
      reference:
        input.reference ?? null,
      referenceType:
        input.referenceType ?? null,
      orderId:
        input.orderId ?? null,
      vendorId:
        input.vendorId ?? null,
      context:
        input.context ?? null,
      metadata:
        input.metadata ?? null,
    };

    const result =
      await this.idempotencyService.execute(
        {
          key: input.idempotencyKey,
          scope:
            `financial.transaction.create:${input.organizationId}`,
          userId:
            input.actorUserId,
          requestBody,
        },
        async () => {
          const transaction =
            await prisma.$transaction(
              async (database) =>
                this.createWithinTransaction(
                  database,
                  input
                ),
              {
                isolationLevel:
                  Prisma.TransactionIsolationLevel.Serializable,
                maxWait: 5000,
                timeout: 10000,
              }
            );

          return {
            responseStatus: 201,
            responseBody:
              this.toResult(transaction),
            resourceType:
              "TRANSACTION",
            resourceId:
              transaction.id,
          };
        }
      );

    return result.responseBody as TransactionResult;
  }

  /**
   * Records money that has arrived from an external
   * payment provider into an internal MARKA account.
   *
   * This operation deliberately does not create or debit
   * a customer wallet/account because the actual source
   * of funds exists outside MARKA.
   *
   * The Prisma Transaction model already supports a
   * nullable sourceAccountId for this exact boundary.
   */
  async createExternalCredit(
    input: CreateExternalCreditInput
  ): Promise<ExternalCreditTransactionResult> {
    this.validateExternalCreditInput(
      input
    );

    const requestBody = {
      organizationId:
        input.organizationId,
      type:
        input.type,
      amountMinor:
        input.amountMinor.toString(),
      currency:
        input.currency,
      destinationAccountId:
        input.destinationAccountId,
      actorUserId:
        input.actorUserId ?? null,
      actorType:
        input.actorType ?? "SYSTEM",
      reference:
        input.reference ?? null,
      referenceType:
        input.referenceType ?? null,
      orderId:
        input.orderId ?? null,
      vendorId:
        input.vendorId ?? null,
      context:
        input.context ?? null,
      paymentId:
        input.paymentId ?? null,
      provider:
        input.provider ?? null,
      providerPaymentId:
        input.providerPaymentId ?? null,
      metadata:
        input.metadata ?? null,
    };

    const result =
      await this.idempotencyService.execute(
        {
          key: input.idempotencyKey,
          scope:
            `financial.transaction.external-credit:${input.organizationId}`,
          userId:
            input.actorUserId,
          requestBody,
        },
        async () => {
          const transaction =
            await prisma.$transaction(
              async (database) =>
                this.createExternalCreditWithinTransaction(
                  database,
                  input
                ),
              {
                isolationLevel:
                  Prisma.TransactionIsolationLevel.Serializable,
                maxWait: 5000,
                timeout: 10000,
              }
            );

          return {
            responseStatus: 201,
            responseBody:
              this.toExternalCreditResult(
                transaction
              ),
            resourceType:
              "TRANSACTION",
            resourceId:
              transaction.id,
          };
        }
      );

    return result.responseBody as ExternalCreditTransactionResult;
  }

  async createWithinTransaction(
    database: FinancialTransactionClient,
    input: CreateTransactionInput
  ) {
    this.validateInput(input);

    const existingTransaction =
      await database.transaction.findUnique({
        where: {
          idempotencyKey:
            input.idempotencyKey,
        },
      });

    if (existingTransaction) {
      if (
        existingTransaction.status ===
        TransactionStatus.COMPLETED
      ) {
        return existingTransaction;
      }

      throw new Error(
        `Transaction with idempotency key "${input.idempotencyKey}" already exists with status ${existingTransaction.status}.`
      );
    }

    const [
      sourceAccount,
      destinationAccount,
      organization,
    ] = await Promise.all([
      database.account.findUnique({
        where: {
          id: input.sourceAccountId,
        },
        select: {
          id: true,
          organizationId: true,
          currency: true,
          status: true,
          balanceMinor: true,
          version: true,
        },
      }),

      database.account.findUnique({
        where: {
          id: input.destinationAccountId,
        },
        select: {
          id: true,
          organizationId: true,
          currency: true,
          status: true,
          balanceMinor: true,
          version: true,
        },
      }),

      database.organization.findUnique({
        where: {
          id: input.organizationId,
        },
        select: {
          id: true,
          status: true,
        },
      }),
    ]);

    if (
      !organization ||
      organization.status !== "ACTIVE"
    ) {
      throw new Error(
        "Organization is not active."
      );
    }

    if (!sourceAccount) {
      throw new Error(
        "Source account not found."
      );
    }

    if (!destinationAccount) {
      throw new Error(
        "Destination account not found."
      );
    }

    if (
      sourceAccount.id ===
      destinationAccount.id
    ) {
      throw new Error(
        "Source and destination accounts must be different."
      );
    }

    if (
      sourceAccount.organizationId !==
        input.organizationId ||
      destinationAccount.organizationId !==
        input.organizationId
    ) {
      throw new Error(
        "Both accounts must belong to the transaction organization."
      );
    }

    if (
      sourceAccount.status !==
        "ACTIVE" ||
      destinationAccount.status !==
        "ACTIVE"
    ) {
      throw new Error(
        "Both accounts must be active."
      );
    }

    if (
      sourceAccount.currency !==
        input.currency ||
      destinationAccount.currency !==
        input.currency
    ) {
      throw new Error(
        "Transaction currency must match both accounts."
      );
    }

    if (
      sourceAccount.balanceMinor <
      input.amountMinor
    ) {
      throw new Error(
        "Insufficient account balance."
      );
    }

    const ledger =
      await database.ledger.upsert({
        where: {
          code:
            `${DEFAULT_LEDGER_CODE}-${input.organizationId}`,
        },
        update: {},
        create: {
          organizationId:
            input.organizationId,
          code:
            `${DEFAULT_LEDGER_CODE}-${input.organizationId}`,
          name:
            "MARKA Operating Ledger",
          currency:
            input.currency,
          status:
            "ACTIVE",
        },
      });

    if (
      ledger.status !== "ACTIVE" ||
      ledger.currency !==
        input.currency
    ) {
      throw new Error(
        "Operating ledger is not available."
      );
    }

    const reference =
      input.reference?.trim() ||
      `TXN-${crypto
        .randomUUID()
        .replace(/-/g, "")
        .toUpperCase()}`;

    const createdAt =
      new Date();

    const transaction =
      await database.transaction.create({
        data: {
          idempotencyKey:
            input.idempotencyKey,
          type:
            input.type,
          direction:
            input.direction,
          status:
            TransactionStatus.PROCESSING,

          amountMinor:
            input.amountMinor,
          currency:
            input.currency,

          actorUserId:
            input.actorUserId,
          actorType:
            input.actorType ??
            TransactionActorType.SYSTEM,

          sourceAccountId:
            input.sourceAccountId,
          destinationAccountId:
            input.destinationAccountId,

          reference,
          referenceType:
            input.referenceType,
          orderId:
            input.orderId,
          vendorId:
            input.vendorId,
          context:
            input.context,

          metadata:
            input.metadata
              ? (input.metadata as Prisma.InputJsonValue)
              : undefined,

          processingStartedAt:
            createdAt,
        },
      });

    const sourceUpdate =
      await database.account.updateMany({
        where: {
          id: sourceAccount.id,
          version:
            sourceAccount.version,
          status: "ACTIVE",
          balanceMinor: {
            gte: input.amountMinor,
          },
        },
        data: {
          balanceMinor: {
            decrement:
              input.amountMinor,
          },
          version: {
            increment: 1,
          },
        },
      });

    if (
      sourceUpdate.count !== 1
    ) {
      throw new Error(
        "Source account changed during transaction. Please retry."
      );
    }

    const destinationUpdate =
      await database.account.updateMany({
        where: {
          id:
            destinationAccount.id,
          version:
            destinationAccount.version,
          status: "ACTIVE",
        },
        data: {
          balanceMinor: {
            increment:
              input.amountMinor,
          },
          version: {
            increment: 1,
          },
        },
      });

    if (
      destinationUpdate.count !== 1
    ) {
      throw new Error(
        "Destination account changed during transaction. Please retry."
      );
    }

    await database.ledgerEntry.createMany({
      data: [
        {
          ledgerId:
            ledger.id,
          transactionId:
            transaction.id,
          accountId:
            sourceAccount.id,
          direction:
            "DEBIT",
          amountMinor:
            input.amountMinor,
          currency:
            input.currency,
          sequence: 1,
          metadata: {
            role:
              "SOURCE",
          } as Prisma.InputJsonValue,
        },
        {
          ledgerId:
            ledger.id,
          transactionId:
            transaction.id,
          accountId:
            destinationAccount.id,
          direction:
            "CREDIT",
          amountMinor:
            input.amountMinor,
          currency:
            input.currency,
          sequence: 2,
          metadata: {
            role:
              "DESTINATION",
          } as Prisma.InputJsonValue,
        },
      ],
    });

    const completedAt =
      new Date();

    const completed =
      await database.transaction.update({
        where: {
          id:
            transaction.id,
        },
        data: {
          status:
            TransactionStatus.COMPLETED,
          completedAt,
        },
      });

    await database.auditLog.create({
      data: {
        organizationId:
          input.organizationId,
        actorUserId:
          input.actorUserId,
        actorType:
          input.actorUserId
            ? "USER"
            : "SYSTEM",
        action:
          "FINANCIAL_TRANSACTION_COMPLETED",
        entityType:
          "TRANSACTION",
        entityId:
          completed.id,
        correlationId:
          input.correlationId,
        requestId:
          input.requestId,
        ipAddress:
          input.ipAddress,
        userAgent:
          input.userAgent,
        metadata: {
          transactionId:
            completed.id,
          reference:
            completed.reference,
          type:
            completed.type,
          direction:
            completed.direction,
          amountMinor:
            input.amountMinor.toString(),
          currency:
            input.currency,
          sourceAccountId:
            input.sourceAccountId,
          destinationAccountId:
            input.destinationAccountId,
          orderId:
            input.orderId ?? null,
          vendorId:
            input.vendorId ?? null,
        } as Prisma.InputJsonValue,
      },
    });

    return completed;
  }

  async createExternalCreditWithinTransaction(
    database: FinancialTransactionClient,
    input: CreateExternalCreditInput
  ) {
    this.validateExternalCreditInput(
      input
    );

    const existingTransaction =
      await database.transaction.findUnique({
        where: {
          idempotencyKey:
            input.idempotencyKey,
        },
      });

    if (existingTransaction) {
      if (
        existingTransaction.status ===
        TransactionStatus.COMPLETED
      ) {
        return existingTransaction;
      }

      throw new Error(
        `External transaction with idempotency key "${input.idempotencyKey}" already exists with status ${existingTransaction.status}.`
      );
    }

    const organization =
      await database.organization.findUnique({
        where: {
          id:
            input.organizationId,
        },
        select: {
          id: true,
          status: true,
        },
      });

    if (
      !organization ||
      organization.status !==
        "ACTIVE"
    ) {
      throw new Error(
        "Organization is not active."
      );
    }

    const destinationAccount =
      await database.account.findUnique({
        where: {
          id:
            input.destinationAccountId,
        },
        select: {
          id: true,
          organizationId: true,
          currency: true,
          status: true,
          version: true,
        },
      });

    if (!destinationAccount) {
      throw new Error(
        "Destination account not found."
      );
    }

    if (
      destinationAccount.organizationId !==
      input.organizationId
    ) {
      throw new Error(
        "Destination account must belong to the transaction organization."
      );
    }

    if (
      destinationAccount.status !==
      "ACTIVE"
    ) {
      throw new Error(
        "Destination account must be active."
      );
    }

    if (
      destinationAccount.currency !==
      input.currency
    ) {
      throw new Error(
        "External transaction currency must match the destination account."
      );
    }

    if (
      input.paymentId
    ) {
      const payment =
        await database.payment.findUnique({
          where: {
            id:
              input.paymentId,
          },
          select: {
            id: true,
            transactionId: true,
            amountMinor: true,
            currency: true,
            status: true,
          },
        });

      if (!payment) {
        throw new Error(
          "Payment not found."
        );
      }

      if (
        payment.transactionId &&
        payment.transactionId !==
          input.paymentId
      ) {
        throw new Error(
          "Payment is already linked to a financial transaction."
        );
      }

      if (
        payment.amountMinor !==
        input.amountMinor
      ) {
        throw new Error(
          "External transaction amount does not match the payment."
        );
      }

      if (
        payment.currency !==
        input.currency
      ) {
        throw new Error(
          "External transaction currency does not match the payment."
        );
      }
    }

    const ledger =
      await database.ledger.upsert({
        where: {
          code:
            `${DEFAULT_LEDGER_CODE}-${input.organizationId}`,
        },
        update: {},
        create: {
          organizationId:
            input.organizationId,
          code:
            `${DEFAULT_LEDGER_CODE}-${input.organizationId}`,
          name:
            "MARKA Operating Ledger",
          currency:
            input.currency,
          status:
            "ACTIVE",
        },
      });

    if (
      ledger.status !== "ACTIVE" ||
      ledger.currency !==
        input.currency
    ) {
      throw new Error(
        "Operating ledger is not available."
      );
    }

    const reference =
      input.reference?.trim() ||
      `EXT-${crypto
        .randomUUID()
        .replace(/-/g, "")
        .toUpperCase()}`;

    const createdAt =
      new Date();

    const transaction =
      await database.transaction.create({
        data: {
          idempotencyKey:
            input.idempotencyKey,

          type:
            input.type,

          direction:
            TransactionDirection.CREDIT,

          status:
            TransactionStatus.PROCESSING,

          amountMinor:
            input.amountMinor,

          currency:
            input.currency,

          actorUserId:
            input.actorUserId,

          actorType:
            input.actorType ??
            TransactionActorType.SYSTEM,

          sourceAccountId:
            null,

          destinationAccountId:
            input.destinationAccountId,

          reference,

          referenceType:
            input.referenceType ??
            "EXTERNAL_PAYMENT",

          orderId:
            input.orderId,

          vendorId:
            input.vendorId,

          context:
            input.context ??
            "EXTERNAL_PAYMENT_RECEIPT",

          metadata:
            this.toJsonValue({
              source:
                "EXTERNAL_PAYMENT_PROVIDER",
              provider:
                input.provider ??
                null,
              providerPaymentId:
                input.providerPaymentId ??
                null,
              paymentId:
                input.paymentId ??
                null,
              ...(input.metadata ??
                {}),
            }),

          processingStartedAt:
            createdAt,
        },
      });

    const destinationUpdate =
      await database.account.updateMany({
        where: {
          id:
            destinationAccount.id,
          version:
            destinationAccount.version,
          status:
            "ACTIVE",
        },
        data: {
          balanceMinor: {
            increment:
              input.amountMinor,
          },
          version: {
            increment: 1,
          },
        },
      });

    if (
      destinationUpdate.count !== 1
    ) {
      throw new Error(
        "Destination account changed during external credit. Please retry."
      );
    }

    /*
     * External funds have no MARKA internal source
     * account. The nullable sourceAccountId on the
     * Transaction model represents that boundary.
     *
     * The ledger entry therefore records the internal
     * recognition of the external funds as a CREDIT
     * against the destination account, while provider
     * identity is preserved in transaction metadata.
     */
    await database.ledgerEntry.create({
      data: {
        ledgerId:
          ledger.id,
        transactionId:
          transaction.id,
        accountId:
          destinationAccount.id,
        direction:
          "CREDIT",
        amountMinor:
          input.amountMinor,
        currency:
          input.currency,
        sequence: 1,
        metadata:
          this.toJsonValue({
            role:
              "EXTERNAL_SOURCE",
            source:
              "PAYMENT_PROVIDER",
            provider:
              input.provider ??
              null,
            providerPaymentId:
              input.providerPaymentId ??
              null,
            paymentId:
              input.paymentId ??
              null,
          }),
      },
    });

    const completedAt =
      new Date();

    const completed =
      await database.transaction.update({
        where: {
          id:
            transaction.id,
        },
        data: {
          status:
            TransactionStatus.COMPLETED,
          completedAt,
        },
      });

    if (
      input.paymentId
    ) {
      const paymentUpdate =
        await database.payment.updateMany({
          where: {
            id:
              input.paymentId,
            transactionId:
              null,
          },
          data: {
            transactionId:
              completed.id,
          },
        });

      if (
        paymentUpdate.count !== 1
      ) {
        throw new Error(
          "Payment could not be linked to the external financial transaction."
        );
      }
    }

    await database.auditLog.create({
      data: {
        organizationId:
          input.organizationId,
        actorUserId:
          input.actorUserId,
        actorType:
          input.actorUserId
            ? "USER"
            : "SYSTEM",
        action:
          "EXTERNAL_FINANCIAL_TRANSACTION_COMPLETED",
        entityType:
          "TRANSACTION",
        entityId:
          completed.id,
        correlationId:
          input.correlationId,
        requestId:
          input.requestId,
        ipAddress:
          input.ipAddress,
        userAgent:
          input.userAgent,
        metadata:
          this.toJsonValue({
            transactionId:
              completed.id,
            reference:
              completed.reference,
            type:
              completed.type,
            direction:
              completed.direction,
            amountMinor:
              input.amountMinor.toString(),
            currency:
              input.currency,
            destinationAccountId:
              input.destinationAccountId,
            paymentId:
              input.paymentId ??
              null,
            provider:
              input.provider ??
              null,
            providerPaymentId:
              input.providerPaymentId ??
              null,
            orderId:
              input.orderId ??
              null,
            vendorId:
              input.vendorId ??
              null,
          }),
      },
    });

    return completed;
  }

  async getById(
    organizationId: string,
    transactionId: string
  ): Promise<TransactionResult | null> {
    const transaction =
      await prisma.transaction.findFirst({
        where: {
          id:
            transactionId,
          OR: [
            {
              sourceAccount: {
                organizationId,
              },
            },
            {
              destinationAccount: {
                organizationId,
              },
            },
          ],
        },
      });

    if (!transaction) {
      return null;
    }

    return this.toResult(
      transaction
    );
  }

  async getByReference(
    organizationId: string,
    reference: string
  ): Promise<TransactionResult | null> {
    const transaction =
      await prisma.transaction.findFirst({
        where: {
          reference,
          OR: [
            {
              sourceAccount: {
                organizationId,
              },
            },
            {
              destinationAccount: {
                organizationId,
              },
            },
          ],
        },
      });

    if (!transaction) {
      return null;
    }

    return this.toResult(
      transaction
    );
  }

  private validateInput(
    input: CreateTransactionInput
  ): void {
    if (
      !input.organizationId.trim()
    ) {
      throw new Error(
        "Organization is required."
      );
    }

    if (
      !input.idempotencyKey.trim()
    ) {
      throw new Error(
        "Idempotency key is required."
      );
    }

    if (
      input.amountMinor <=
      BigInt(0)
    ) {
      throw new Error(
        "Transaction amount must be greater than zero."
      );
    }

    if (
      !/^[A-Z]{3}$/.test(
        input.currency
      )
    ) {
      throw new Error(
        "Currency must be a valid ISO 4217 code."
      );
    }

    if (
      !input.sourceAccountId.trim()
    ) {
      throw new Error(
        "Source account is required."
      );
    }

    if (
      !input.destinationAccountId.trim()
    ) {
      throw new Error(
        "Destination account is required."
      );
    }
  }

  private validateExternalCreditInput(
    input: CreateExternalCreditInput
  ): void {
    if (
      !input.organizationId.trim()
    ) {
      throw new Error(
        "Organization is required."
      );
    }

    if (
      !input.idempotencyKey.trim()
    ) {
      throw new Error(
        "Idempotency key is required."
      );
    }

    if (
      input.amountMinor <=
      BigInt(0)
    ) {
      throw new Error(
        "External credit amount must be greater than zero."
      );
    }

    if (
      !/^[A-Z]{3}$/.test(
        input.currency
      )
    ) {
      throw new Error(
        "Currency must be a valid ISO 4217 code."
      );
    }

    if (
      !input.destinationAccountId.trim()
    ) {
      throw new Error(
        "Destination account is required."
      );
    }

    if (
      input.type !==
        TransactionType.PAYMENT &&
      input.type !==
        TransactionType.DEPOSIT &&
      input.type !==
        TransactionType.ADJUSTMENT
    ) {
      throw new Error(
        "External credit supports only payment, deposit, or adjustment transaction types."
      );
    }

    if (
      input.provider &&
      input.provider.trim()
        .length > 100
    ) {
      throw new Error(
        "Payment provider name is too long."
      );
    }

    if (
      input.providerPaymentId &&
      input.providerPaymentId
        .trim()
        .length > 255
    ) {
      throw new Error(
        "Provider payment id is too long."
      );
    }
  }

  private toJsonValue(
    value: unknown
  ): Prisma.InputJsonValue {
    return JSON.parse(
      JSON.stringify(value)
    ) as Prisma.InputJsonValue;
  }

  private toResult(
    transaction: {
      id: string;
      reference: string;
      status: TransactionStatus;
      type: TransactionType;
      direction: TransactionDirection;
      amountMinor: bigint;
      currency: string;
      sourceAccountId:
        | string
        | null;
      destinationAccountId:
        | string
        | null;
      completedAt: Date | null;
    }
  ): TransactionResult {
    if (
      !transaction.sourceAccountId
    ) {
      throw new Error(
        "Transaction source account is missing."
      );
    }

    if (
      !transaction.destinationAccountId
    ) {
      throw new Error(
        "Transaction destination account is missing."
      );
    }

    return {
      id:
        transaction.id,
      reference:
        transaction.reference,
      status:
        transaction.status,
      type:
        transaction.type,
      direction:
        transaction.direction,
      amountMinor:
        transaction.amountMinor.toString(),
      currency:
        transaction.currency,
      sourceAccountId:
        transaction.sourceAccountId,
      destinationAccountId:
        transaction.destinationAccountId,
      completedAt:
        transaction.completedAt,
    };
  }

  private toExternalCreditResult(
    transaction: {
      id: string;
      reference: string;
      status: TransactionStatus;
      type: TransactionType;
      direction: TransactionDirection;
      amountMinor: bigint;
      currency: string;
      sourceAccountId:
        | string
        | null;
      destinationAccountId:
        | string
        | null;
      completedAt: Date | null;
    }
  ): ExternalCreditTransactionResult {
    if (
      transaction.sourceAccountId !==
      null
    ) {
      throw new Error(
        "External credit transaction unexpectedly has an internal source account."
      );
    }

    if (
      !transaction.destinationAccountId
    ) {
      throw new Error(
        "External credit destination account is missing."
      );
    }

    return {
      id:
        transaction.id,
      reference:
        transaction.reference,
      status:
        transaction.status,
      type:
        transaction.type,
      direction:
        transaction.direction,
      amountMinor:
        transaction.amountMinor.toString(),
      currency:
        transaction.currency,
      sourceAccountId:
        null,
      destinationAccountId:
        transaction.destinationAccountId,
      completedAt:
        transaction.completedAt,
    };
  }
}

export const transactionService =
  new TransactionService();
