// FILE: /workspaces/marka-platform/src/services/settlements/settlement.service.ts

import {
  Prisma,
  SettlementStatus,
  TransactionActorType,
  TransactionDirection,
  TransactionType,
} from "@prisma/client";

import { FinancialAuditService } from "@/core/audit/financial-audit.service";
import { IdempotencyService } from "@/core/idempotency/idempotency.service";
import { prisma } from "@/database/client/prisma";
import {
  accountService,
  type AccountResult,
} from "@/services/accounts/account.service";
import {
  transactionService,
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
        const settlement = await prisma.$transaction(async (tx) => {
          const [organization, vendor, instrument] = await Promise.all([
            tx.organization.findUnique({
              where: { id: input.organizationId },
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
        });

        const responseBody = this.toResult(settlement);

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
          responseBody,
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
        const settlement = await prisma.$transaction(async (tx) => {
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

          return tx.settlement.update({
            where: {
              id: current.id,
            },
            data: {
              status: SettlementStatus.PROCESSING,
            },
          });
        });

        let transaction: TransactionResult | null = null;

        try {
          const accounts = await this.getSettlementAccounts(
            input.organizationId,
            settlement.vendorId,
            settlement.currency,
            settlement.amountMinor
          );

          transaction = await transactionService.create({
            organizationId: input.organizationId,
            idempotencyKey: `settlement-transfer:${settlement.id}`,
            type: TransactionType.SETTLEMENT,
            direction: TransactionDirection.DEBIT,
            amountMinor: settlement.amountMinor,
            currency: settlement.currency,
            actorUserId: input.actorUserId,
            actorType: TransactionActorType.SYSTEM,
            sourceAccountId: accounts.vendorPayable.id,
            destinationAccountId: accounts.settlement.id,
            reference: `SETTLEMENT-${settlement.id}`,
            referenceType: "SETTLEMENT",
            vendorId: settlement.vendorId,
            context: "VENDOR_SETTLEMENT_FUNDING",
            metadata: {
              settlementId: settlement.id,
              financialInstrumentId: settlement.financialInstrumentId,
              stage: "INTERNAL_FUNDING",
            },
            correlationId: input.correlationId,
            requestId: input.requestId,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
          });

          const updated = await prisma.settlement.update({
            where: {
              id: settlement.id,
            },
            data: {
              status: SettlementStatus.PROCESSING,
              transactionId: transaction.id,
            },
          });

          await this.financialAuditService.recordSettlement({
            organizationId: input.organizationId,
            actorUserId: input.actorUserId,
            action: "SETTLEMENT_FUNDED",
            settlementId: settlement.id,
            correlationId: input.correlationId,
            requestId: input.requestId,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
            metadata: {
              transactionId: transaction.id,
              vendorId: settlement.vendorId,
              financialInstrumentId: settlement.financialInstrumentId,
              amountMinor: settlement.amountMinor.toString(),
              currency: settlement.currency,
              stage: "INTERNAL_FUNDING",
            },
          });

          return {
            responseStatus: 200,
            responseBody: this.toResult(updated),
            resourceType: "SETTLEMENT",
            resourceId: updated.id,
          };
        } catch (error) {
          await prisma.settlement.update({
            where: {
              id: settlement.id,
            },
            data: {
              status: SettlementStatus.FAILED,
              metadata: {
                ...(this.asRecord(settlement.metadata) ?? {}),
                processingFailure: {
                  message:
                    error instanceof Error
                      ? error.message
                      : "Unknown settlement processing failure.",
                  occurredAt: new Date().toISOString(),
                },
              },
            },
          });

          await this.financialAuditService.recordSettlement({
            organizationId: input.organizationId,
            actorUserId: input.actorUserId,
            action: "SETTLEMENT_FAILED",
            settlementId: settlement.id,
            correlationId: input.correlationId,
            requestId: input.requestId,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
            metadata: {
              transactionId: transaction?.id ?? null,
              error:
                error instanceof Error
                  ? error.message
                  : "Unknown settlement processing failure.",
            },
          });

          throw error;
        }
      }
    );

    return result.responseBody as SettlementResult;
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
        const settlement = await prisma.settlement.findFirst({
          where: {
            id: input.settlementId,
            vendor: {
              organizationId: input.organizationId,
            },
          },
        });

        if (!settlement) {
          throw new Error("Settlement not found.");
        }

        if (settlement.status === SettlementStatus.RECONCILED) {
          return {
            responseStatus: 200,
            responseBody: this.toResult(settlement),
            resourceType: "SETTLEMENT",
            resourceId: settlement.id,
          };
        }

        if (settlement.status !== SettlementStatus.PROCESSING) {
          throw new Error(
            "Only a processing settlement can be completed."
          );
        }

        const updated = await prisma.settlement.update({
          where: {
            id: settlement.id,
          },
          data: {
            status: SettlementStatus.COMPLETED,
            providerReference: input.providerReference.trim(),
          },
        });

        await this.financialAuditService.recordSettlement({
          organizationId: input.organizationId,
          actorUserId: input.actorUserId,
          action: "SETTLEMENT_COMPLETED",
          settlementId: settlement.id,
          correlationId: input.correlationId,
          requestId: input.requestId,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          metadata: {
            providerReference: input.providerReference.trim(),
            transactionId: settlement.transactionId,
            financialInstrumentId: settlement.financialInstrumentId,
          },
        });

        return {
          responseStatus: 200,
          responseBody: this.toResult(updated),
          resourceType: "SETTLEMENT",
          resourceId: updated.id,
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

    const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
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

  private async getSettlementAccounts(
    organizationId: string,
    vendorId: string,
    currency: string,
    amountMinor: bigint
  ): Promise<{
    vendorPayable: AccountResult;
    settlement: AccountResult;
  }> {
    const vendorPayable =
      await accountService.getVendorPayableAccount(
        organizationId,
        vendorId,
        currency
      );

    if (!vendorPayable) {
      throw new Error(
        "Vendor payable account not found for the settlement currency."
      );
    }

    const settlementAccount =
      await accountService.getSettlementAccount(
        organizationId,
        currency
      );

    if (!settlementAccount) {
      throw new Error(
        "Settlement account not found for the settlement currency."
      );
    }

    const availableBalance = BigInt(vendorPayable.balanceMinor);
    const pendingOtherSettlements =
      await this.getPendingOtherSettlementAmount(
        organizationId,
        vendorId,
        currency
      );

    if (availableBalance < amountMinor + pendingOtherSettlements) {
      throw new Error(
        "Vendor payable account does not have sufficient available funds for this settlement."
      );
    }

    return {
      vendorPayable,
      settlement: settlementAccount,
    };
  }

  private async getPendingOtherSettlementAmount(
    organizationId: string,
    vendorId: string,
    currency: string
  ): Promise<bigint> {
    const pending = await prisma.settlement.aggregate({
      where: {
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

  private validateCreateInput(input: CreateSettlementInput): void {
    this.validateOrganizationId(input.organizationId);

    if (!input.vendorId.trim()) {
      throw new Error("Vendor ID is required.");
    }

    if (!input.financialInstrumentId.trim()) {
      throw new Error("Financial instrument ID is required.");
    }

    if (input.amountMinor <= BigInt(0)) {
      throw new Error("Settlement amount must be greater than zero.");
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

  private validateProcessInput(input: ProcessSettlementInput): void {
    this.validateOrganizationId(input.organizationId);

    if (!input.settlementId.trim()) {
      throw new Error("Settlement ID is required.");
    }

    if (!input.idempotencyKey.trim()) {
      throw new Error("Idempotency key is required.");
    }
  }

  private validateCompleteInput(input: CompleteSettlementInput): void {
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

  private validateOrganizationId(organizationId: string): void {
    if (!organizationId.trim()) {
      throw new Error("Organization ID is required.");
    }
  }

  private normalizeCurrency(currency = "AOA"): string {
    const normalized = currency.trim().toUpperCase();

    if (!/^[A-Z]{3}$/.test(normalized)) {
      throw new Error("Currency must be a valid 3-letter ISO code.");
    }

    return normalized;
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

  private asRecord(value: unknown): Record<string, unknown> | null {
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      return value as Record<string, unknown>;
    }

    return null;
  }
}

export const settlementService = new SettlementService();
