import {
  Prisma,
  SettlementStatus,
  TransactionActorType,
  TransactionDirection,
  TransactionStatus,
  TransactionType,
} from "@prisma/client";

import { FinancialAuditService } from "@/core/audit/financial-audit.service";
import { IdempotencyService } from "@/core/idempotency/idempotency.service";
import { prisma } from "@/database/client/prisma";
import {
  transactionService,
  type FinancialTransactionClient,
  type TransactionResult,
} from "@/services/transactions/transaction.service";

export interface CreateSettlementInput {
  organizationId: string;
  vendorId: string;
  financialInstrumentId: string;
  amountMinor: bigint;
  currency?: string;
  periodStart: Date;
  periodEnd: Date;

  actorUserId?: string;
  correlationId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;

  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}

export interface ProcessSettlementInput {
  organizationId: string;
  settlementId: string;

  actorUserId?: string;
  correlationId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;

  idempotencyKey: string;
}

export interface CompleteSettlementInput {
  organizationId: string;
  settlementId: string;
  providerReference: string;

  actorUserId?: string;
  correlationId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;

  idempotencyKey: string;
}

export interface SettlementResult {
  id: string;
  vendorId: string;
  financialInstrumentId: string;
  transactionId: string | null;
  amountMinor: string;
  currency: string;
  status: SettlementStatus;
  periodStart: Date;
  periodEnd: Date;
  providerReference: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SettlementListOptions {
  organizationId: string;
  vendorId?: string;
  status?: SettlementStatus;
  limit?: number;
  offset?: number;
}

export class SettlementService {
  private readonly idempotencyService = new IdempotencyService();
  private readonly financialAuditService = new FinancialAuditService();

  async create(input: CreateSettlementInput): Promise<SettlementResult> {
    this.validateCreateInput(input);

    const currency = this.normalizeCurrency(input.currency);

    const requestBody = {
      organizationId: input.organizationId,
      vendorId: input.vendorId,
      financialInstrumentId: input.financialInstrumentId,
      amountMinor: input.amountMinor.toString(),
      currency,
      periodStart: input.periodStart.toISOString(),
      periodEnd: input.periodEnd.toISOString(),
      metadata: input.metadata ?? null,
    };

    const result = await this.idempotencyService.execute(
      {
        key: input.idempotencyKey,
        scope: `financial.settlement.create:${input.organizationId}`,
        userId: input.actorUserId,
        requestBody,
      },
      async () => {
        const settlement = await prisma.$transaction(
          async (tx) => {
            const [organization, vendor, instrument] = await Promise.all([
              tx.organization.findUnique({
                where: {
                  id: input.organizationId,
                },
                select: {
                  id: true,
                  status: true,
                },
              }),

              tx.vendor.findFirst({
                where: {
                  id: input.vendorId,
                  organizationId: input.organizationId,
                },
                select: {
                  id: true,
                  organizationId: true,
                  status: true,
                  verified: true,
                },
              }),

              tx.financialInstrument.findUnique({
                where: {
                  id: input.financialInstrumentId,
                },
                select: {
                  id: true,
                  organizationId: true,
                  vendorId: true,
                  ownerType: true,
                  status: true,
                  currency: true,
                  verifiedAt: true,
                  expiresAt: true,
                },
              }),
            ]);

            if (!organization || organization.status !== "ACTIVE") {
              throw new Error("Organization is not active.");
            }

            if (!vendor) {
              throw new Error(
                "Vendor not found in the specified organization."
              );
            }

            if (vendor.status !== "ACTIVE" || !vendor.verified) {
              throw new Error(
                "Vendor must be active and verified before settlement."
              );
            }

            if (!instrument) {
              throw new Error("Financial instrument not found.");
            }

            if (instrument.organizationId !== input.organizationId) {
              throw new Error(
                "Financial instrument does not belong to the settlement organization."
              );
            }

            if (instrument.vendorId !== input.vendorId) {
              throw new Error(
                "Financial instrument does not belong to the settlement vendor."
              );
            }

            if (instrument.ownerType !== "VENDOR") {
              throw new Error(
                "Settlement requires a vendor-owned financial instrument."
              );
            }

            if (instrument.status !== "ACTIVE") {
              throw new Error(
                "Financial instrument must be active before settlement."
              );
            }

            if (!instrument.verifiedAt) {
              throw new Error(
                "Financial instrument must be verified before settlement."
              );
            }

            if (
              instrument.expiresAt &&
              instrument.expiresAt.getTime() <= Date.now()
            ) {
              throw new Error("Financial instrument has expired.");
            }

            if (instrument.currency !== currency) {
              throw new Error(
                "Settlement currency must match the financial instrument currency."
              );
            }

            return tx.settlement.create({
              data: {
                vendorId: input.vendorId,
                financialInstrumentId: input.financialInstrumentId,
                amountMinor: input.amountMinor,
                currency,
                status: SettlementStatus.PENDING,
                periodStart: input.periodStart,
                periodEnd: input.periodEnd,
                metadata: input.metadata
                  ? (input.metadata as Prisma.InputJsonValue)
                  : undefined,
              },
            });
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            maxWait: 5000,
            timeout: 10000,
          }
        );

        await this.financialAuditService.recordSettlement({
          organizationId: input.organizationId,
          actorUserId: input.actorUserId,
          action: "SETTLEMENT_CREATED",
          settlementId: settlement.id,
          correlationId: input.correlationId,
          requestId: input.requestId,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          metadata: {
            vendorId: input.vendorId,
            financialInstrumentId: input.financialInstrumentId,
            amountMinor: input.amountMinor.toString(),
            currency,
            periodStart: input.periodStart.toISOString(),
            periodEnd: input.periodEnd.toISOString(),
          },
        });

        return {
          responseStatus: 201,
          responseBody: this.toResult(settlement),
          resourceType: "SETTLEMENT",
          resourceId: settlement.id,
        };
      }
    );

    return result.responseBody as SettlementResult;
  }

  async process(
    input: ProcessSettlementInput
  ): Promise<SettlementResult> {
    this.validateProcessInput(input);

    const requestBody = {
      organizationId: input.organizationId,
      settlementId: input.settlementId,
    };

    const result = await this.idempotencyService.execute(
      {
        key: input.idempotencyKey,
        scope: `financial.settlement.process:${input.organizationId}`,
        userId: input.actorUserId,
        requestBody,
      },
      async () => {
        const settlement = await this.processWithRetry(input);

        return {
          responseStatus: 200,
          responseBody: this.toResult(settlement),
          resourceType: "SETTLEMENT",
          resourceId: settlement.id,
        };
      }
    );

    return result.responseBody as SettlementResult;
  }

  private async processWithRetry(
    input: ProcessSettlementInput
  ) {
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
      try {
        return await prisma.$transaction(
          async (tx) => this.processWithinTransaction(tx, input),
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            maxWait: 5000,
            timeout: 10000,
          }
        );
      } catch (error) {
        if (
          this.isSerializationConflict(error) &&
          attempt < maxRetries
        ) {
          await this.sleep(100 * attempt);
          continue;
        }

        throw error;
      }
    }

    throw new Error("Settlement processing failed after retries.");
  }

  private async processWithinTransaction(
    tx: FinancialTransactionClient,
    input: ProcessSettlementInput
  ) {
    const current = await tx.settlement.findFirst({
      where: {
        id: input.settlementId,
        vendor: {
          organizationId: input.organizationId,
        },
      },
    });

    if (!current) {
      throw new Error("Settlement not found.");
    }

    if (
      current.status === SettlementStatus.COMPLETED ||
      current.status === SettlementStatus.RECONCILED
    ) {
      return current;
    }

    if (current.status === SettlementStatus.FAILED) {
      throw new Error(
        "A failed settlement cannot be processed again without a new settlement operation."
      );
    }

    if (current.status === SettlementStatus.PROCESSING) {
      if (current.transactionId) {
        return current;
      }

      throw new Error(
        "Settlement is already processing but has no funding transaction."
      );
    }

    if (current.status !== SettlementStatus.PENDING) {
      throw new Error(
        `Settlement cannot be processed from status ${current.status}.`
      );
    }

    if (current.transactionId) {
      throw new Error(
        "Pending settlement already has a funding transaction."
      );
    }

    const accounts = await this.getSettlementAccountsWithinTransaction(
      tx,
      input.organizationId,
      current.vendorId,
      current.currency,
      current.amountMinor,
      current.id
    );

    const transaction = await transactionService.createWithinTransaction(
      tx,
      {
        organizationId: input.organizationId,
        idempotencyKey: `settlement-transfer:${current.id}`,
        type: TransactionType.SETTLEMENT,
        direction: TransactionDirection.DEBIT,
        amountMinor: current.amountMinor,
        currency: current.currency,
        actorUserId: input.actorUserId,
        actorType: TransactionActorType.SYSTEM,
        sourceAccountId: accounts.vendorPayable.id,
        destinationAccountId: accounts.settlement.id,
        reference: `SETTLEMENT-${current.id}`,
        referenceType: "SETTLEMENT",
        vendorId: current.vendorId,
        context: "VENDOR_SETTLEMENT_FUNDING",
        metadata: {
          settlementId: current.id,
          financialInstrumentId: current.financialInstrumentId,
          stage: "INTERNAL_FUNDING",
        },
        correlationId: input.correlationId,
        requestId: input.requestId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      }
    );

    if (transaction.status !== TransactionStatus.COMPLETED) {
      throw new Error(
        "Settlement funding transaction did not complete."
      );
    }

    const updated = await tx.settlement.update({
      where: {
        id: current.id,
      },
      data: {
        status: SettlementStatus.PROCESSING,
        transactionId: transaction.id,
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        actorType: input.actorUserId ? "USER" : "SYSTEM",
        action: "SETTLEMENT_FUNDED",
        entityType: "SETTLEMENT",
        entityId: current.id,
        correlationId: input.correlationId,
        requestId: input.requestId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        metadata: {
          settlementId: current.id,
          transactionId: transaction.id,
          vendorId: current.vendorId,
          financialInstrumentId: current.financialInstrumentId,
          amountMinor: current.amountMinor.toString(),
          currency: current.currency,
          stage: "INTERNAL_FUNDING",
        } as Prisma.InputJsonValue,
      },
    });

    return updated;
  }

  async complete(
    input: CompleteSettlementInput
  ): Promise<SettlementResult> {
    this.validateCompleteInput(input);

    const requestBody = {
      organizationId: input.organizationId,
      settlementId: input.settlementId,
      providerReference: input.providerReference.trim(),
    };

    const result = await this.idempotencyService.execute(
      {
        key: input.idempotencyKey,
        scope: `financial.settlement.complete:${input.organizationId}`,
        userId: input.actorUserId,
        requestBody,
      },
      async () => {
        const settlement = await prisma.$transaction(
          async (tx) => {
            const current = await tx.settlement.findFirst({
              where: {
                id: input.settlementId,
                vendor: {
                  organizationId: input.organizationId,
                },
              },
            });

            if (!current) {
              throw new Error("Settlement not found.");
            }

            if (current.status === SettlementStatus.RECONCILED) {
              return current;
            }

            if (current.status !== SettlementStatus.PROCESSING) {
              throw new Error(
                "Only a processing settlement can be completed."
              );
            }

            if (!current.transactionId) {
              throw new Error(
                "Settlement cannot be completed without a funding transaction."
              );
            }

            const transaction = await tx.transaction.findUnique({
              where: {
                id: current.transactionId,
              },
              select: {
                id: true,
                status: true,
                type: true,
                amountMinor: true,
                currency: true,
                sourceAccountId: true,
                destinationAccountId: true,
              },
            });

            if (!transaction) {
              throw new Error(
                "Settlement funding transaction was not found."
              );
            }

            if (transaction.status !== TransactionStatus.COMPLETED) {
              throw new Error(
                "Settlement funding transaction is not completed."
              );
            }

            if (transaction.type !== TransactionType.SETTLEMENT) {
              throw new Error(
                "Settlement funding transaction has an invalid type."
              );
            }

            if (transaction.amountMinor !== current.amountMinor) {
              throw new Error(
                "Settlement amount does not match the funding transaction."
              );
            }

            if (transaction.currency !== current.currency) {
              throw new Error(
                "Settlement currency does not match the funding transaction."
              );
            }

            const updated = await tx.settlement.update({
              where: {
                id: current.id,
              },
              data: {
                status: SettlementStatus.COMPLETED,
                providerReference: input.providerReference.trim(),
              },
            });

            await tx.auditLog.create({
              data: {
                organizationId: input.organizationId,
                actorUserId: input.actorUserId,
                actorType: input.actorUserId ? "USER" : "SYSTEM",
                action: "SETTLEMENT_COMPLETED",
                entityType: "SETTLEMENT",
                entityId: current.id,
                correlationId: input.correlationId,
                requestId: input.requestId,
                ipAddress: input.ipAddress,
                userAgent: input.userAgent,
                metadata: {
                  settlementId: current.id,
                  providerReference: input.providerReference.trim(),
                  transactionId: current.transactionId,
                  financialInstrumentId:
                    current.financialInstrumentId,
                  amountMinor: current.amountMinor.toString(),
                  currency: current.currency,
                } as Prisma.InputJsonValue,
              },
            });

            return updated;
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            maxWait: 5000,
            timeout: 10000,
          }
        );

        return {
          responseStatus: 200,
          responseBody: this.toResult(settlement),
          resourceType: "SETTLEMENT",
          resourceId: settlement.id,
        };
      }
    );

    return result.responseBody as SettlementResult;
  }

  async getById(
    organizationId: string,
    settlementId: string
  ): Promise<SettlementResult | null> {
    this.validateOrganizationId(organizationId);

    if (!settlementId.trim()) {
      throw new Error("Settlement ID is required.");
    }

    const settlement = await prisma.settlement.findFirst({
      where: {
        id: settlementId,
        vendor: {
          organizationId,
        },
      },
    });

    return settlement ? this.toResult(settlement) : null;
  }

  async list(
    options: SettlementListOptions
  ): Promise<SettlementResult[]> {
    this.validateOrganizationId(options.organizationId);

    const limit = Math.min(
      Math.max(options.limit ?? 50, 1),
      100
    );

    const offset = Math.max(options.offset ?? 0, 0);

    const settlements = await prisma.settlement.findMany({
      where: {
        vendor: {
          organizationId: options.organizationId,
          ...(options.vendorId ? { id: options.vendorId } : {}),
        },
        ...(options.status ? { status: options.status } : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    return settlements.map((settlement) =>
      this.toResult(settlement)
    );
  }

  private async getSettlementAccountsWithinTransaction(
    tx: FinancialTransactionClient,
    organizationId: string,
    vendorId: string,
    currency: string,
    amountMinor: bigint,
    settlementId: string
  ): Promise<{
    vendorPayable: {
      id: string;
      balanceMinor: bigint;
    };
    settlement: {
      id: string;
    };
  }> {
    const [vendorPayable, settlementAccount] = await Promise.all([
      tx.account.findFirst({
        where: {
          organizationId,
          vendorId,
          type: "VENDOR_PAYABLE",
          currency,
          status: "ACTIVE",
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          balanceMinor: true,
        },
      }),

      tx.account.findFirst({
        where: {
          organizationId,
          type: "SETTLEMENT",
          currency,
          status: "ACTIVE",
          userId: null,
          vendorId: null,
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
        },
      }),
    ]);

    if (!vendorPayable) {
      throw new Error(
        "Vendor payable account not found for the settlement currency."
      );
    }

    if (!settlementAccount) {
      throw new Error(
        "Settlement account not found for the settlement currency."
      );
    }

    const pendingOtherSettlements =
      await this.getPendingOtherSettlementAmountWithinTransaction(
        tx,
        organizationId,
        vendorId,
        currency,
        settlementId
      );

    if (
      vendorPayable.balanceMinor <
      amountMinor + pendingOtherSettlements
    ) {
      throw new Error(
        "Vendor payable account does not have sufficient available funds for this settlement."
      );
    }

    return {
      vendorPayable,
      settlement: settlementAccount,
    };
  }

  private async getPendingOtherSettlementAmountWithinTransaction(
    tx: FinancialTransactionClient,
    organizationId: string,
    vendorId: string,
    currency: string,
    settlementId: string
  ): Promise<bigint> {
    const pending = await tx.settlement.aggregate({
      where: {
        id: {
          not: settlementId,
        },
        vendorId,
        currency,
        status: {
          in: [
            SettlementStatus.PENDING,
            SettlementStatus.PROCESSING,
          ],
        },
        vendor: {
          organizationId,
        },
      },
      _sum: {
        amountMinor: true,
      },
    });

    return pending._sum.amountMinor ?? BigInt(0);
  }

  private validateCreateInput(
    input: CreateSettlementInput
  ): void {
    this.validateOrganizationId(input.organizationId);

    if (!input.vendorId.trim()) {
      throw new Error("Vendor ID is required.");
    }

    if (!input.financialInstrumentId.trim()) {
      throw new Error("Financial instrument ID is required.");
    }

    if (input.amountMinor <= BigInt(0)) {
      throw new Error(
        "Settlement amount must be greater than zero."
      );
    }

    if (Number.isNaN(input.periodStart.getTime())) {
      throw new Error("Settlement period start is invalid.");
    }

    if (Number.isNaN(input.periodEnd.getTime())) {
      throw new Error("Settlement period end is invalid.");
    }

    if (input.periodEnd <= input.periodStart) {
      throw new Error(
        "Settlement period end must be after period start."
      );
    }

    if (!input.idempotencyKey.trim()) {
      throw new Error("Idempotency key is required.");
    }
  }

  private validateProcessInput(
    input: ProcessSettlementInput
  ): void {
    this.validateOrganizationId(input.organizationId);

    if (!input.settlementId.trim()) {
      throw new Error("Settlement ID is required.");
    }

    if (!input.idempotencyKey.trim()) {
      throw new Error("Idempotency key is required.");
    }
  }

  private validateCompleteInput(
    input: CompleteSettlementInput
  ): void {
    this.validateOrganizationId(input.organizationId);

    if (!input.settlementId.trim()) {
      throw new Error("Settlement ID is required.");
    }

    if (!input.providerReference.trim()) {
      throw new Error("Provider reference is required.");
    }

    if (!input.idempotencyKey.trim()) {
      throw new Error("Idempotency key is required.");
    }
  }

  private validateOrganizationId(
    organizationId: string
  ): void {
    if (!organizationId.trim()) {
      throw new Error("Organization ID is required.");
    }
  }

  private normalizeCurrency(currency = "AOA"): string {
    const normalized = currency.trim().toUpperCase();

    if (!/^[A-Z]{3}$/.test(normalized)) {
      throw new Error(
        "Currency must be a valid 3-letter ISO code."
      );
    }

    return normalized;
  }

  private isSerializationConflict(error: unknown): boolean {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError
    ) {
      return error.code === "P2034";
    }

    return false;
  }

  private async sleep(milliseconds: number): Promise<void> {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }

  private toResult(settlement: {
    id: string;
    vendorId: string;
    financialInstrumentId: string;
    transactionId: string | null;
    amountMinor: bigint;
    currency: string;
    status: SettlementStatus;
    periodStart: Date;
    periodEnd: Date;
    providerReference: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): SettlementResult {
    return {
      id: settlement.id,
      vendorId: settlement.vendorId,
      financialInstrumentId: settlement.financialInstrumentId,
      transactionId: settlement.transactionId,
      amountMinor: settlement.amountMinor.toString(),
      currency: settlement.currency,
      status: settlement.status,
      periodStart: settlement.periodStart,
      periodEnd: settlement.periodEnd,
      providerReference: settlement.providerReference,
      createdAt: settlement.createdAt,
      updatedAt: settlement.updatedAt,
    };
  }
}

export const settlementService = new SettlementService();
