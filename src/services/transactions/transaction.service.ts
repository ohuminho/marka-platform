import {
  CreateTransactionInput,
  Money,
  Transaction,
  TransactionDirection,
  TransactionFilter,
  TransactionRepository,
  TransactionResult,
  TransactionReversalInput,
  TransactionRefundInput,
  TransactionStatus,
  TransactionStatusTransition,
} from "./types/transaction.types";

export class TransactionService {
  constructor(
    private readonly repository: TransactionRepository
  ) {}

  async createTransaction(
    input: CreateTransactionInput
  ): Promise<TransactionResult> {
    this.validateCreateTransactionInput(input);

    const existing =
      await this.repository.findByIdempotencyKey(
        input.idempotencyKey
      );

    if (existing) {
      return {
        transaction: existing,
        idempotent: true,
      };
    }

    const transaction: Transaction = {
      id: crypto.randomUUID(),
      idempotencyKey: input.idempotencyKey,
      type: input.type,
      direction: input.direction,
      status: TransactionStatus.CREATED,
      amount: {
        amount: input.amount.amount,
        currency: input.amount.currency.toUpperCase(),
      },
      actorId: input.actorId,
      actorType: input.actorType,
      sourceAccountId: input.sourceAccountId,
      destinationAccountId:
        input.destinationAccountId,
      reference: {
        reference: input.reference.reference,
        type: input.reference.type,
      },
      context: input.context,
      metadata: input.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const created =
      await this.repository.create(transaction);

    return {
      transaction: created,
      idempotent: false,
    };
  }

  async getTransactionById(
    transactionId: string
  ): Promise<Transaction | null> {
    if (!transactionId.trim()) {
      throw new Error("Transaction ID is required");
    }

    return this.repository.findById(transactionId);
  }

  async getTransactionByReference(
    reference: string
  ): Promise<Transaction | null> {
    if (!reference.trim()) {
      throw new Error(
        "Transaction reference is required"
      );
    }

    return this.repository.findByReference(reference);
  }

  async listTransactions(
    filter: TransactionFilter
  ): Promise<Transaction[]> {
    const normalizedFilter: TransactionFilter = {
      ...filter,
      limit: Math.min(
        Math.max(filter.limit ?? 50, 1),
        100
      ),
      offset: Math.max(filter.offset ?? 0, 0),
    };

    return this.repository.list(normalizedFilter);
  }

  async transitionStatus(
    input: TransactionStatusTransition
  ): Promise<Transaction> {
    const transaction =
      await this.repository.findById(
        input.transactionId
      );

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    if (transaction.status === input.status) {
      return transaction;
    }

    this.assertValidTransition(
      transaction.status,
      input.status
    );

    const now = new Date();

    const updated: Transaction = {
      ...transaction,
      status: input.status,
      updatedAt: now,
      ...(input.status === TransactionStatus.COMPLETED && {
        completedAt: now,
      }),
      ...(input.status === TransactionStatus.FAILED && {
        failedAt: now,
      }),
      ...(input.status === TransactionStatus.CANCELLED && {
        cancelledAt: now,
      }),
      ...(input.status === TransactionStatus.REVERSED && {
        reversedAt: now,
      }),
      ...(input.status === TransactionStatus.REFUNDED && {
        refundedAt: now,
      }),
    };

    return this.repository.update(updated);
  }

  async reverseTransaction(
    input: TransactionReversalInput
  ): Promise<TransactionResult> {
    if (!input.transactionId.trim()) {
      throw new Error("Transaction ID is required");
    }

    if (!input.idempotencyKey.trim()) {
      throw new Error("Idempotency key is required");
    }

    if (!input.reason.trim()) {
      throw new Error("Reversal reason is required");
    }

    const existing =
      await this.repository.findByIdempotencyKey(
        input.idempotencyKey
      );

    if (existing) {
      return {
        transaction: existing,
        idempotent: true,
      };
    }

    const original =
      await this.repository.findById(
        input.transactionId
      );

    if (!original) {
      throw new Error(
        "Original transaction not found"
      );
    }

    if (
      original.status !==
      TransactionStatus.COMPLETED
    ) {
      throw new Error(
        "Only completed transactions can be reversed"
      );
    }

    const reversalDirection =
      original.direction ===
      TransactionDirection.CREDIT
        ? TransactionDirection.DEBIT
        : TransactionDirection.CREDIT;

    const reversal: Transaction = {
      id: crypto.randomUUID(),
      idempotencyKey: input.idempotencyKey,
      type: original.type,
      direction: reversalDirection,
      status: TransactionStatus.CREATED,
      amount: {
        ...original.amount,
      },
      actorId: input.actorId,
      actorType: input.actorType,
      sourceAccountId:
        original.destinationAccountId ??
        original.sourceAccountId,
      destinationAccountId:
        original.sourceAccountId,
      reference: {
        reference: `REVERSAL-${original.id}`,
        type: "TRANSACTION_REVERSAL",
      },
      context: original.context,
      metadata: {
        ...original.metadata,
        reversalOf: original.id,
        reason: input.reason,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const created =
      await this.repository.create(reversal);

    return {
      transaction: created,
      idempotent: false,
    };
  }

  async refundTransaction(
    input: TransactionRefundInput
  ): Promise<TransactionResult> {
    if (!input.transactionId.trim()) {
      throw new Error("Transaction ID is required");
    }

    if (!input.idempotencyKey.trim()) {
      throw new Error("Idempotency key is required");
    }

    if (!input.reason.trim()) {
      throw new Error("Refund reason is required");
    }

    const existing =
      await this.repository.findByIdempotencyKey(
        input.idempotencyKey
      );

    if (existing) {
      return {
        transaction: existing,
        idempotent: true,
      };
    }

    const original =
      await this.repository.findById(
        input.transactionId
      );

    if (!original) {
      throw new Error(
        "Original transaction not found"
      );
    }

    if (
      original.status !==
      TransactionStatus.COMPLETED
    ) {
      throw new Error(
        "Only completed transactions can be refunded"
      );
    }

    const refundAmount =
      input.amount ?? original.amount;

    this.validateRefundAmount(
      original.amount,
      refundAmount
    );

    const refundDirection =
      original.direction ===
      TransactionDirection.CREDIT
        ? TransactionDirection.DEBIT
        : TransactionDirection.CREDIT;

    const refund: Transaction = {
      id: crypto.randomUUID(),
      idempotencyKey: input.idempotencyKey,
      type: original.type,
      direction: refundDirection,
      status: TransactionStatus.CREATED,
      amount: {
        ...refundAmount,
      },
      actorId: input.actorId,
      actorType: input.actorType,
      sourceAccountId:
        original.destinationAccountId ??
        original.sourceAccountId,
      destinationAccountId:
        original.sourceAccountId,
      reference: {
        reference:
          `REFUND-${original.id}-${crypto.randomUUID()}`,
        type: "TRANSACTION_REFUND",
      },
      context: original.context,
      metadata: {
        ...original.metadata,
        refundOf: original.id,
        reason: input.reason,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const created =
      await this.repository.create(refund);

    return {
      transaction: created,
      idempotent: false,
    };
  }

  private validateCreateTransactionInput(
    input: CreateTransactionInput
  ): void {
    if (!input.idempotencyKey.trim()) {
      throw new Error(
        "Idempotency key is required"
      );
    }

    if (!input.sourceAccountId.trim()) {
      throw new Error(
        "Source account is required"
      );
    }

    if (
      input.destinationAccountId &&
      !input.destinationAccountId.trim()
    ) {
      throw new Error(
        "Destination account cannot be empty"
      );
    }

    if (
      !input.reference.reference.trim()
    ) {
      throw new Error(
        "Transaction reference is required"
      );
    }

    this.validateMoney(input.amount);
  }

  private validateMoney(
    money: Money
  ): void {
    if (!Number.isSafeInteger(money.amount)) {
      throw new Error(
        "Transaction amount must be an integer represented in minor units"
      );
    }

    if (money.amount <= 0) {
      throw new Error(
        "Transaction amount must be greater than zero"
      );
    }

    if (
      !money.currency ||
      money.currency.trim().length !== 3
    ) {
      throw new Error(
        "Currency must be a valid ISO 4217 three-letter code"
      );
    }
  }

  private validateRefundAmount(
    original: Money,
    refund: Money
  ): void {
    this.validateMoney(refund);

    if (
      original.currency.toUpperCase() !==
      refund.currency.toUpperCase()
    ) {
      throw new Error(
        "Refund currency must match the original transaction currency"
      );
    }

    if (refund.amount > original.amount) {
      throw new Error(
        "Refund amount cannot exceed the original transaction amount"
      );
    }
  }

  private assertValidTransition(
    current: TransactionStatus,
    next: TransactionStatus
  ): void {
    const allowedTransitions: Record<
      TransactionStatus,
      TransactionStatus[]
    > = {
      [TransactionStatus.CREATED]: [
        TransactionStatus.PENDING,
        TransactionStatus.CANCELLED,
      ],

      [TransactionStatus.PENDING]: [
        TransactionStatus.PROCESSING,
        TransactionStatus.COMPLETED,
        TransactionStatus.FAILED,
        TransactionStatus.CANCELLED,
      ],

      [TransactionStatus.PROCESSING]: [
        TransactionStatus.COMPLETED,
        TransactionStatus.FAILED,
        TransactionStatus.CANCELLED,
      ],

      [TransactionStatus.COMPLETED]: [
        TransactionStatus.REVERSED,
        TransactionStatus.REFUNDED,
      ],

      [TransactionStatus.FAILED]: [],

      [TransactionStatus.CANCELLED]: [],

      [TransactionStatus.REVERSED]: [],

      [TransactionStatus.REFUNDED]: [],
    };

    if (
      !allowedTransitions[current].includes(next)
    ) {
      throw new Error(
        `Invalid transaction status transition: ${current} -> ${next}`
      );
    }
  }
}
