import { Prisma } from "@prisma/client";

import { prisma } from "@/database/client/prisma";

export interface FinancialAuditInput {
  organizationId?: string;
  actorUserId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  correlationId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export class FinancialAuditService {
  async record(input: FinancialAuditInput) {
    return prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        actorType: input.actorUserId ? "USER" : "SYSTEM",
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        correlationId: input.correlationId,
        requestId: input.requestId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        metadata: input.metadata
          ? (input.metadata as Prisma.InputJsonValue)
          : undefined,
      },
    });
  }

  async recordTransaction(
    input: FinancialAuditInput & {
      transactionId: string;
    }
  ) {
    return this.record({
      ...input,
      entityType: "TRANSACTION",
      entityId: input.transactionId,
    });
  }

  async recordPayment(
    input: FinancialAuditInput & {
      paymentId: string;
    }
  ) {
    return this.record({
      ...input,
      entityType: "PAYMENT",
      entityId: input.paymentId,
    });
  }

  async recordSettlement(
    input: FinancialAuditInput & {
      settlementId: string;
    }
  ) {
    return this.record({
      ...input,
      entityType: "SETTLEMENT",
      entityId: input.settlementId,
    });
  }

  async recordFinancialInstrument(
    input: FinancialAuditInput & {
      financialInstrumentId: string;
    }
  ) {
    return this.record({
      ...input,
      entityType: "FINANCIAL_INSTRUMENT",
      entityId: input.financialInstrumentId,
    });
  }

  async recordAccount(
    input: FinancialAuditInput & {
      accountId: string;
    }
  ) {
    return this.record({
      ...input,
      entityType: "ACCOUNT",
      entityId: input.accountId,
    });
  }

  async recordWallet(
    input: FinancialAuditInput & {
      walletId: string;
    }
  ) {
    return this.record({
      ...input,
      entityType: "WALLET",
      entityId: input.walletId,
    });
  }
}

export const financialAuditService =
  new FinancialAuditService();
