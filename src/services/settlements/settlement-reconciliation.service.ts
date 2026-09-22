import {
  Prisma,
  ReconciliationStatus,
  SettlementStatus,
} from "@prisma/client";

import {
  prisma,
} from "@/database/client/prisma";

import {
  IdempotencyService,
} from "@/core/idempotency/idempotency.service";

import {
  FinancialAuditService,
} from "@/core/audit/financial-audit.service";

import {
  settlementProviderRegistry,
} from "./providers/settlement-provider.registry";

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

export interface ReconciliationResult {
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

interface SettlementReconciliationContext {
  settlement: {
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
  };

  financialInstrument: {
    id: string;
    provider: string;
    providerRef: string;
    status: string;
    currency: string;
  };
}

export class SettlementReconciliationService {
  private readonly idempotencyService =
    new IdempotencyService();

  private readonly financialAuditService =
    new FinancialAuditService();

  async reconcile(
    input: ReconcileSettlementInput
  ): Promise<ReconciliationResult> {
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
          key:
            input.idempotencyKey,
          scope:
            `financial.settlement.reconciliation:${input.organizationId}`,
          userId:
            input.actorUserId,
          requestBody,
        },
        async () => {
          const context =
            await this.getContext(
              input.organizationId,
              input.settlementId
            );

          if (
            context.settlement.status !==
              SettlementStatus.COMPLETED &&
            context.settlement.status !==
              SettlementStatus.RECONCILED
          ) {
            throw new Error(
              "Only a completed settlement can be reconciled."
            );
          }

          if (
            !context.settlement.providerReference
          ) {
            throw new Error(
              "Settlement has no provider reference for reconciliation."
            );
          }

          const existing =
            await prisma.reconciliation.findUnique(
              {
                where: {
                  settlementId:
                    context.settlement.id,
                },
              }
            );

          if (
            existing &&
            existing.status ===
              ReconciliationStatus.MATCHED
          ) {
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

          const provider =
            settlementProviderRegistry.get(
              context.financialInstrument.provider
            );

          const providerResult =
            await provider.getPayoutStatus(
              {
                settlementId:
                  context.settlement.id,
                providerPayoutId:
                  context.settlement
                    .providerReference,
                amountMinor:
                  context.settlement
                    .amountMinor,
                currency:
                  context.settlement
                    .currency,
                metadata: {
                  reconciliation: true,
                },
              }
            );

          if (
            providerResult.status !==
            "COMPLETED"
          ) {
            throw new Error(
              `External settlement payout is not completed. Current provider status: ${providerResult.status}.`
            );
          }

          if (
            providerResult.amountMinor ===
              undefined ||
            providerResult.currency ===
              undefined
          ) {
            throw new Error(
              "Settlement provider response does not contain the amount and currency required for reconciliation."
            );
          }

          const actualMinor =
            providerResult.amountMinor;

          const actualCurrency =
            providerResult.currency
              .trim()
              .toUpperCase();

          const expectedMinor =
            context.settlement
              .amountMinor;

          const expectedCurrency =
            context.settlement
              .currency
              .trim()
              .toUpperCase();

          const differenceMinor =
            actualMinor -
            expectedMinor;

          const matched =
            actualMinor ===
              expectedMinor &&
            actualCurrency ===
              expectedCurrency &&
            providerResult
              .providerPayoutId ===
              context.settlement
                .providerReference;

          const reconciliation =
            await this.persistReconciliation(
              input,
              context,
              {
                provider:
                  providerResult.provider,
                actualMinor,
                actualCurrency,
                expectedMinor,
                expectedCurrency,
                differenceMinor,
                reference:
                  providerResult
                    .providerPayoutId,
                status:
                  matched
                    ? ReconciliationStatus.MATCHED
                    : ReconciliationStatus.MISMATCH,
                rawResponse:
                  providerResult.rawResponse ??
                  null,
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

    return result.responseBody as ReconciliationResult;
  }

  async getBySettlementId(
    organizationId: string,
    settlementId: string
  ): Promise<ReconciliationResult | null> {
    this.validateOrganizationId(
      organizationId
    );

    if (!settlementId.trim()) {
      throw new Error(
        "Settlement ID is required."
      );
    }

    const reconciliation =
      await prisma.reconciliation.findFirst(
        {
          where: {
            settlementId,
            settlement: {
              vendor: {
                organizationId,
              },
            },
          },
        }
      );

    return reconciliation
      ? this.toResult(reconciliation)
      : null;
  }

  private async getContext(
    organizationId: string,
    settlementId: string
  ): Promise<SettlementReconciliationContext> {
    const settlement =
      await prisma.settlement.findFirst(
        {
          where: {
            id: settlementId,
            vendor: {
              organizationId,
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
        }
      );

    if (!settlement) {
      throw new Error(
        "Settlement not found."
      );
    }

    const financialInstrument =
      await prisma.financialInstrument.findFirst(
        {
          where: {
            id:
              settlement.financialInstrumentId,
            organizationId,
            vendorId:
              settlement.vendorId,
          },
          select: {
            id: true,
            provider: true,
            providerRef: true,
            status: true,
            currency: true,
          },
        }
      );

    if (!financialInstrument) {
      throw new Error(
        "Settlement financial instrument not found."
      );
    }

    if (
      financialInstrument.status !==
      "ACTIVE"
    ) {
      throw new Error(
        "Settlement financial instrument is not active."
      );
    }

    if (
      financialInstrument.currency !==
      settlement.currency
    ) {
      throw new Error(
        "Settlement financial instrument currency does not match the settlement currency."
      );
    }

    return {
      settlement,
      financialInstrument,
    };
  }

  private async persistReconciliation(
    input: ReconcileSettlementInput,
    context: SettlementReconciliationContext,
    data: {
      provider: string;
      actualMinor: bigint;
      actualCurrency: string;
      expectedMinor: bigint;
      expectedCurrency: string;
      differenceMinor: bigint;
      reference: string;
      status: ReconciliationStatus;
      rawResponse: Record<
        string,
        unknown
      > | null;
    }
  ): Promise<ReconciliationResult> {
    const result =
      await this.runWithSerializationRetry(
        async () =>
          prisma.$transaction(
            async (tx) => {
              const current =
                await tx.settlement.findFirst(
                  {
                    where: {
                      id:
                        context.settlement
                          .id,
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
                      periodStart: true,
                      periodEnd: true,
                      providerReference:
                        true,
                    },
                  }
                );

              if (!current) {
                throw new Error(
                  "Settlement not found."
                );
              }

              if (
                current.status !==
                  SettlementStatus.COMPLETED &&
                current.status !==
                  SettlementStatus.RECONCILED
              ) {
                throw new Error(
                  "Settlement is no longer eligible for reconciliation."
                );
              }

              if (
                current.amountMinor !==
                data.expectedMinor ||
                current.currency !==
                data.expectedCurrency
              ) {
                throw new Error(
                  "Settlement changed while reconciliation was being processed."
                );
              }

              const existing =
                await tx.reconciliation.findUnique(
                  {
                    where: {
                      settlementId:
                        current.id,
                    },
                  }
                );

              if (
                existing &&
                existing.status ===
                  ReconciliationStatus.MATCHED
              ) {
                return existing;
              }

              const reconciliation =
                existing
                  ? await tx.reconciliation.update(
                      {
                        where: {
                          id:
                            existing.id,
                        },
                        data: {
                          provider:
                            data.provider,
                          periodStart:
                            current.periodStart,
                          periodEnd:
                            current.periodEnd,
                          status:
                            data.status,
                          expectedMinor:
                            data.expectedMinor,
                          actualMinor:
                            data.actualMinor,
                          differenceMinor:
                            data.differenceMinor,
                          currency:
                            data.actualCurrency,
                          reference:
                            data.reference,
                          metadata:
                            {
                              settlementId:
                                current.id,
                              expectedCurrency:
                                data.expectedCurrency,
                              actualCurrency:
                                data.actualCurrency,
                              rawResponse:
                                data.rawResponse,
                              reconciledAt:
                                new Date().toISOString(),
                            } as Prisma.InputJsonValue,
                        },
                      }
                    )
                  : await tx.reconciliation.create(
                      {
                        data: {
                          settlementId:
                            current.id,
                          provider:
                            data.provider,
                          periodStart:
                            current.periodStart,
                          periodEnd:
                            current.periodEnd,
                          status:
                            data.status,
                          expectedMinor:
                            data.expectedMinor,
                          actualMinor:
                            data.actualMinor,
                          differenceMinor:
                            data.differenceMinor,
                          currency:
                            data.actualCurrency,
                          reference:
                            data.reference,
                          metadata:
                            {
                              settlementId:
                                current.id,
                              expectedCurrency:
                                data.expectedCurrency,
                              actualCurrency:
                                data.actualCurrency,
                              rawResponse:
                                data.rawResponse,
                              reconciledAt:
                                new Date().toISOString(),
                            } as Prisma.InputJsonValue,
                        },
                      }
                    );

              if (
                data.status ===
                ReconciliationStatus.MATCHED
              ) {
                await tx.settlement.update(
                  {
                    where: {
                      id:
                        current.id,
                    },
                    data: {
                      status:
                        SettlementStatus.RECONCILED,
                    },
                  }
                );
              }

              await tx.auditLog.create(
                {
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
                      data.status ===
                      ReconciliationStatus.MATCHED
                        ? "SETTLEMENT_RECONCILED"
                        : "SETTLEMENT_RECONCILIATION_MISMATCH",
                    entityType:
                      "RECONCILIATION",
                    entityId:
                      reconciliation.id,
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
                          current.id,
                        provider:
                          data.provider,
                        expectedMinor:
                          data.expectedMinor.toString(),
                        actualMinor:
                          data.actualMinor.toString(),
                        differenceMinor:
                          data.differenceMinor.toString(),
                        expectedCurrency:
                          data.expectedCurrency,
                        actualCurrency:
                          data.actualCurrency,
                        providerReference:
                          data.reference,
                        status:
                          data.status,
                      } as Prisma.InputJsonValue,
                  },
                }
              );

              return reconciliation;
            },
            {
              isolationLevel:
                Prisma.TransactionIsolationLevel.Serializable,
              maxWait: 5000,
              timeout: 10000,
            }
          )
      );

    return this.toResult(result);
  }

  private async runWithSerializationRetry<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    const maxRetries = 3;

    for (
      let attempt = 1;
      attempt <= maxRetries;
      attempt += 1
    ) {
      try {
        return await operation();
      } catch (error) {
        if (
          this.isSerializationConflict(
            error
          ) &&
          attempt < maxRetries
        ) {
          await this.sleep(
            100 * attempt
          );

          continue;
        }

        throw error;
      }
    }

    throw new Error(
      "Settlement reconciliation failed after retries."
    );
  }

  private isSerializationConflict(
    error: unknown
  ): boolean {
    return (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    );
  }

  private async sleep(
    milliseconds: number
  ): Promise<void> {
    await new Promise<void>(
      (resolve) =>
        setTimeout(
          resolve,
          milliseconds
        )
    );
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
  ): ReconciliationResult {
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
}

export const settlementReconciliationService =
  new SettlementReconciliationService();
