import {
  Prisma,
  ReconciliationStatus,
  SettlementStatus,
} from "@prisma/client";

import {
  FinancialAuditService,
} from "@/core/audit/financial-audit.service";

import {
  IdempotencyService,
} from "@/core/idempotency/idempotency.service";

import {
  prisma,
} from "@/database/client/prisma";

import {
  settlementPayoutService,
} from "./settlement-payout.service";

export interface ReconcileSettlementInput {
  organizationId: string;
  settlementId: string;

  actorUserId?: string;
  correlationId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;

  idempotencyKey: string;
}

export interface SettlementReconciliationResult {
  id: string;
  settlementId: string | null;
  provider: string;
  periodStart: Date;
  periodEnd: Date;
  status: ReconciliationStatus;
  expectedMinor: string;
  actualMinor: string;
  differenceMinor: string;
  currency: string;
  reference: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class SettlementReconciliationService {
  private readonly idempotencyService =
    new IdempotencyService();

  private readonly financialAuditService =
    new FinancialAuditService();

  async reconcile(
    input: ReconcileSettlementInput
  ): Promise<SettlementReconciliationResult> {
    this.validateInput(input);

    const requestBody = {
      organizationId:
        input.organizationId,
      settlementId:
        input.settlementId,
    };

    const result =
      await this.idempotencyService.execute(
        {
          key: input.idempotencyKey,
          scope:
            `financial.settlement.reconciliation:${input.organizationId}`,
          userId:
            input.actorUserId,
          requestBody,
        },
        async () => {
          const settlement =
            await prisma.settlement.findFirst({
              where: {
                id: input.settlementId,
                vendor: {
                  organizationId:
                    input.organizationId,
                },
              },
              select: {
                id: true,
                vendorId: true,
                financialInstrumentId: true,
                transactionId: true,
                amountMinor: true,
                currency: true,
                status: true,
                periodStart: true,
                periodEnd: true,
                providerReference: true,
              },
            });

          if (!settlement) {
            throw new Error(
              "Settlement not found."
            );
          }

          if (
            settlement.status ===
              SettlementStatus.RECONCILED
          ) {
            const existing =
              await prisma.reconciliation.findUnique({
                where: {
                  settlementId:
                    settlement.id,
                },
              });

            if (!existing) {
              throw new Error(
                "Settlement is reconciled but its reconciliation record is missing."
              );
            }

            return {
              responseStatus: 200,
              responseBody:
                this.toResult(existing),
              resourceType:
                "RECONCILIATION",
              resourceId:
                existing.id,
            };
          }

          if (
            settlement.status !==
            SettlementStatus.COMPLETED
          ) {
            throw new Error(
              "Only a completed settlement can be reconciled."
            );
          }

          if (
            !settlement.providerReference
          ) {
            throw new Error(
              "Settlement has no provider reference."
            );
          }

          /*
           * Ask the payout engine to synchronize
           * the external provider state first.
           *
           * No database transaction is held while
           * the external provider is contacted.
           */
          const synchronized =
            await settlementPayoutService.sync({
              organizationId:
                input.organizationId,
              settlementId:
                input.settlementId,
              actorUserId:
                input.actorUserId,
              correlationId:
                input.correlationId,
              requestId:
                input.requestId,
              ipAddress:
                input.ipAddress,
              userAgent:
                input.userAgent,
              idempotencyKey:
                `settlement-reconciliation-sync:${settlement.id}`,
            });

          if (
            synchronized.status !==
            SettlementStatus.COMPLETED
          ) {
            throw new Error(
              "Settlement provider state is not completed."
            );
          }

          const reconciliation =
            await this.persistMatchedReconciliation(
              input,
              {
                settlementId:
                  settlement.id,
                provider:
                  await this.getProviderName(
                    settlement.financialInstrumentId,
                    input.organizationId,
                    settlement.vendorId
                  ),
                periodStart:
                  settlement.periodStart,
                periodEnd:
                  settlement.periodEnd,
                expectedMinor:
                  settlement.amountMinor,
                actualMinor:
                  settlement.amountMinor,
                currency:
                  settlement.currency,
                reference:
                  settlement.providerReference,
              }
            );

          return {
            responseStatus: 200,
            responseBody:
              reconciliation,
            resourceType:
              "RECONCILIATION",
            resourceId:
              reconciliation.id,
          };
        }
      );

    return result.responseBody as SettlementReconciliationResult;
  }

  async getBySettlementId(
    organizationId: string,
    settlementId: string
  ): Promise<SettlementReconciliationResult | null> {
    this.validateOrganizationId(
      organizationId
    );

    if (!settlementId.trim()) {
      throw new Error(
        "Settlement ID is required."
      );
    }

    const reconciliation =
      await prisma.reconciliation.findFirst({
        where: {
          settlementId,
          settlement: {
            vendor: {
              organizationId,
            },
          },
        },
      });

    return reconciliation
      ? this.toResult(reconciliation)
      : null;
  }

  private async persistMatchedReconciliation(
    input: ReconcileSettlementInput,
    data: {
      settlementId: string;
      provider: string;
      periodStart: Date;
      periodEnd: Date;
      expectedMinor: bigint;
      actualMinor: bigint;
      currency: string;
      reference: string;
    }
  ): Promise<SettlementReconciliationResult> {
    const reconciliation =
      await prisma.$transaction(
        async (tx) => {
          const settlement =
            await tx.settlement.findFirst({
              where: {
                id: data.settlementId,
                vendor: {
                  organizationId:
                    input.organizationId,
                },
              },
              select: {
                id: true,
                status: true,
                amountMinor: true,
                currency: true,
                providerReference: true,
              },
            });

          if (!settlement) {
            throw new Error(
              "Settlement not found."
            );
          }

          if (
            settlement.status !==
            SettlementStatus.COMPLETED
          ) {
            throw new Error(
              "Settlement must remain completed during reconciliation."
            );
          }

          if (
            settlement.amountMinor !==
            data.expectedMinor
          ) {
            throw new Error(
              "Settlement amount changed during reconciliation."
            );
          }

          if (
            settlement.currency !==
            data.currency
          ) {
            throw new Error(
              "Settlement currency changed during reconciliation."
            );
          }

          const existing =
            await tx.reconciliation.findUnique({
              where: {
                settlementId:
                  data.settlementId,
              },
            });

          if (existing) {
            return existing;
          }

          const differenceMinor =
            data.actualMinor -
            data.expectedMinor;

          const status =
            differenceMinor === BigInt(0)
              ? ReconciliationStatus.MATCHED
              : ReconciliationStatus.MISMATCH;

          const created =
            await tx.reconciliation.create({
              data: {
                settlementId:
                  data.settlementId,
                provider:
                  data.provider,
                periodStart:
                  data.periodStart,
                periodEnd:
                  data.periodEnd,
                status,
                expectedMinor:
                  data.expectedMinor,
                actualMinor:
                  data.actualMinor,
                differenceMinor,
                currency:
                  data.currency,
                reference:
                  data.reference,
                metadata:
                  {
                    settlementId:
                      data.settlementId,
                    providerReference:
                      data.reference,
                    reconciliationType:
                      "SETTLEMENT",
                  } as Prisma.InputJsonValue,
              },
            });

          if (
            status ===
            ReconciliationStatus.MATCHED
          ) {
            await tx.settlement.update({
              where: {
                id: data.settlementId,
              },
              data: {
                status:
                  SettlementStatus.RECONCILED,
              },
            });
          }

          await tx.auditLog.create({
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
                status ===
                ReconciliationStatus.MATCHED
                  ? "SETTLEMENT_RECONCILED"
                  : "SETTLEMENT_RECONCILIATION_MISMATCH",
              entityType:
                "RECONCILIATION",
              entityId:
                created.id,
              correlationId:
                input.correlationId,
              requestId:
                input.requestId,
              ipAddress:
                input.ipAddress,
              userAgent:
                input.userAgent,
              metadata:
                {
                  settlementId:
                    data.settlementId,
                  provider:
                    data.provider,
                  expectedMinor:
                    data.expectedMinor.toString(),
                  actualMinor:
                    data.actualMinor.toString(),
                  differenceMinor:
                    differenceMinor.toString(),
                  currency:
                    data.currency,
                  reference:
                    data.reference,
                  status,
                } as Prisma.InputJsonValue,
            },
          });

          return created;
        },
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5000,
          timeout: 10000,
        }
      );

    return this.toResult(
      reconciliation
    );
  }

  private async getProviderName(
    financialInstrumentId: string,
    organizationId: string,
    vendorId: string
  ): Promise<string> {
    const instrument =
      await prisma.financialInstrument.findFirst({
        where: {
          id: financialInstrumentId,
          organizationId,
          vendorId,
        },
        select: {
          provider: true,
        },
      });

    if (!instrument) {
      throw new Error(
        "Settlement financial instrument not found."
      );
    }

    return instrument.provider;
  }

  private validateInput(
    input: ReconcileSettlementInput
  ): void {
    this.validateOrganizationId(
      input.organizationId
    );

    if (!input.settlementId.trim()) {
      throw new Error(
        "Settlement ID is required."
      );
    }

    if (!input.idempotencyKey.trim()) {
      throw new Error(
        "Idempotency key is required."
      );
    }
  }

  private validateOrganizationId(
    organizationId: string
  ): void {
    if (!organizationId.trim()) {
      throw new Error(
        "Organization ID is required."
      );
    }
  }

  private toResult(
    reconciliation: {
      id: string;
      settlementId: string | null;
      provider: string;
      periodStart: Date;
      periodEnd: Date;
      status: ReconciliationStatus;
      expectedMinor: bigint;
      actualMinor: bigint;
      differenceMinor: bigint;
      currency: string;
      reference: string | null;
      createdAt: Date;
      updatedAt: Date;
    }
  ): SettlementReconciliationResult {
    return {
      id:
        reconciliation.id,
      settlementId:
        reconciliation.settlementId,
      provider:
        reconciliation.provider,
      periodStart:
        reconciliation.periodStart,
      periodEnd:
        reconciliation.periodEnd,
      status:
        reconciliation.status,
      expectedMinor:
        reconciliation.expectedMinor.toString(),
      actualMinor:
        reconciliation.actualMinor.toString(),
      differenceMinor:
        reconciliation.differenceMinor.toString(),
      currency:
        reconciliation.currency,
      reference:
        reconciliation.reference,
      createdAt:
        reconciliation.createdAt,
      updatedAt:
        reconciliation.updatedAt,
    };
  }
}

export const settlementReconciliationService =
  new SettlementReconciliationService();
