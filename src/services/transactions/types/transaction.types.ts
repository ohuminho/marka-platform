export enum TransactionStatus {
  CREATED = "CREATED",
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
  REVERSED = "REVERSED",
  REFUNDED = "REFUNDED",
}

export enum TransactionDirection {
  CREDIT = "CREDIT",
  DEBIT = "DEBIT",
}

export enum TransactionType {
  DEPOSIT = "DEPOSIT",
  PAYMENT = "PAYMENT",
  WITHDRAWAL = "WITHDRAWAL",
  REFUND = "REFUND",
  TRANSFER = "TRANSFER",
  COMMISSION = "COMMISSION",
  SETTLEMENT = "SETTLEMENT",
  ADJUSTMENT = "ADJUSTMENT",
  HOLD = "HOLD",
  RELEASE = "RELEASE",
}

export enum TransactionActorType {
  CUSTOMER = "CUSTOMER",
  VENDOR = "VENDOR",
  DRIVER = "DRIVER",
  COURIER = "COURIER",
  PARTNER = "PARTNER",
  MARKA = "MARKA",
  SYSTEM = "SYSTEM",
  ADMIN = "ADMIN",
}

export interface Money {
  amount: number;
  currency: string;
}

export interface TransactionReference {
  reference: string;
  type?: string;
}

export interface TransactionContext {
  orderId?: string;
  paymentId?: string;
  walletId?: string;
  vendorId?: string;
  customerId?: string;
  driverId?: string;
  courierId?: string;
  deliveryId?: string;
  rideId?: string;
  settlementId?: string;
}

export interface TransactionMetadata {
  [key: string]: unknown;
}

export interface CreateTransactionInput {
  idempotencyKey: string;
  type: TransactionType;
  direction: TransactionDirection;
  amount: Money;
  actorId?: string;
  actorType?: TransactionActorType;
  sourceAccountId: string;
  destinationAccountId?: string;
  reference: TransactionReference;
  context?: TransactionContext;
  metadata?: TransactionMetadata;
}

export interface Transaction {
  id: string;
  idempotencyKey: string;
  type: TransactionType;
  direction: TransactionDirection;
  status: TransactionStatus;
  amount: Money;
  actorId?: string;
  actorType?: TransactionActorType;
  sourceAccountId: string;
  destinationAccountId?: string;
  reference: TransactionReference;
  context?: TransactionContext;
  metadata?: TransactionMetadata;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  failedAt?: Date;
  cancelledAt?: Date;
  reversedAt?: Date;
  refundedAt?: Date;
}

export interface TransactionFilter {
  accountId?: string;
  actorId?: string;
  type?: TransactionType;
  direction?: TransactionDirection;
  status?: TransactionStatus;
  reference?: string;
  createdFrom?: Date;
  createdTo?: Date;
  limit?: number;
  offset?: number;
}

export interface TransactionRepository {
  create(transaction: Transaction): Promise<Transaction>;
  findById(id: string): Promise<Transaction | null>;
  findByIdempotencyKey(
    idempotencyKey: string
  ): Promise<Transaction | null>;
  findByReference(
    reference: string
  ): Promise<Transaction | null>;
  list(
    filter: TransactionFilter
  ): Promise<Transaction[]>;
  update(
    transaction: Transaction
  ): Promise<Transaction>;
}

export interface TransactionResult {
  transaction: Transaction;
  idempotent: boolean;
}

export interface TransactionStatusTransition {
  transactionId: string;
  status: TransactionStatus;
  reason?: string;
}

export interface TransactionReversalInput {
  transactionId: string;
  idempotencyKey: string;
  reason: string;
  actorId?: string;
  actorType?: TransactionActorType;
}

export interface TransactionRefundInput {
  transactionId: string;
  idempotencyKey: string;
  amount?: Money;
  reason: string;
  actorId?: string;
  actorType?: TransactionActorType;
}
