import {
  Prisma,
  SettlementStatus,
  TransactionActorType,
  TransactionDirection,
  TransactionStatus,
  TransactionType,
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
  settlementService,
  type SettlementResult,
} from "./settlement.service";

import {
  transactionService,
  type FinancialTransactionClient,
} from "@/services/transactions/transaction.service";

import {
  settlementProviderRegistry,
} from "./providers/settlement-provider.registry";

import type {
  SettlementProviderCreatePayoutResult,
  SettlementProviderGetPayoutStatusResult,
} from "./providers/settlement-provider.types";

export interface ExecuteSettlementPayoutInput {
  organizationId: string;
  settlementId: string;

  actorUserId?: string;
  correlationId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;

  idempotencyKey: string;
}

export interface SyncSettlementPayoutInput {
  organizationId: string;
  settlementId: string;

  actorUserId?: string;
  correlationId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;

  idempotencyKey: string;
}

interface SettlementContext {
  settlement: {
    id: string;
    vendorId: string;
    financialInstrumentId: string;
    transactionId: string | null;
    amountMinor: bigint;
    currency: string;
    status: SettlementStatus;
    providerReference: string | null;
    metadata: Prisma.JsonValue | null;
  };

  financialInstrument: {
    id: string;
    provider: string;
    providerRef: string;
    type: string;
    status: string;
    currency: string;
  };
}

export class SettlementPayoutService {
  private readonly idempotencyService =
    new IdempotencyService();

  private readonly financialAuditService =
    new FinancialAuditService();

  async execute(
    input: ExecuteSettlementPayoutInput
  ): Promise<SettlementResult> {
    this.validateExecuteInput(input);

    const requestBody = {
      organizationId: input.organizationId,
      settlementId: input.settlementId,
    };

    const result =
      await this.idempotencyService.execute(
        {
          key: input.idempotencyKey,
          scope:
            `financial.settlement.payout.execute:${input.organizationId}`,
          userId:
            input.actorUserId,
          requestBody,
        },
        async () => {
          /*
           * First make sure the internal settlement funding exists.
           *
           * This uses a deterministic idempotency key so retrying the
           * external payout operation cannot create a second internal
           * funding transaction.
           */
          await settlementService.process({
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
              `settlement-funding:${input.settlementId}`,
          });

          let context =
            await this.getSettlementContext(
              input.organizationId,
              input.settlementId
            );

          if (
            context.settlement.status ===
              SettlementStatus.COMPLETED ||
            context.settlement.status ===
              SettlementStatus.RECONCILED
          ) {
            return {
              responseStatus: 200,
              responseBody:
                this.toResult(
                  context.settlement
                ),
              resourceType:
                "SETTLEMENT",
              resourceId:
                context.settlement.id,
            };
          }

          const provider =
            settlementProviderRegistry.get(
              context.financialInstrument.provider
            );

          let providerResult:
            | SettlementProviderCreatePayoutResult
            | SettlementProviderGetPayoutStatusResult;

          if (
            context.settlement.providerReference
          ) {
            providerResult =
              await provider.getPayoutStatus({
                settlementId:
                  context.settlement.id,
                providerPayoutId:
                  context.settlement.providerReference,
                amountMinor:
                  context.settlement.amountMinor,
                currency:
                  context.settlement.currency,
                metadata:
                  this.metadataObject(
                    context.settlement.metadata
                  ),
              });
          } else {
            providerResult =
              await provider.createPayout({
                settlementId:
                  context.settlement.id,
                amountMinor:
                  context.settlement.amountMinor,
                currency:
                  context.settlement.currency,
                financialInstrumentType:
                  context.financialInstrument.type,
                financialInstrumentProviderRef:
                  context.financialInstrument.providerRef,
                idempotencyKey:
                  `marka:settlement:payout:${context.settlement.id}`,
                metadata:
                  this.metadataObject(
                    context.settlement.metadata
                  ),
              });
          }

          this.validateProviderResult(
            providerResult,
            context.settlement
          );

          await this.persistProviderResult(
            input,
            providerResult
          );

          if (
            providerResult.status ===
            "COMPLETED"
          ) {
            const completed =
              await settlementService.complete({
                organizationId:
                  input.organizationId,
                settlementId:
                  input.settlementId,
                providerReference:
                  providerResult.providerPayoutId,
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
                  `settlement-complete:${context.settlement.id}:${providerResult.providerPayoutId}`,
              });

            return {
              responseStatus: 200,
              responseBody:
                completed,
              resourceType:
                "SETTLEMENT",
              resourceId:
                completed.id,
            };
          }

          if (
            providerResult.status ===
            "FAILED"
          ) {
            const failed =
              await this.failSettlementWithReversal(
                {
                  organizationId:
                    input.organizationId,
                  settlementId:
                    input.settlementId,
                  providerReference:
                    providerResult.providerPayoutId,
                  failureReason:
                    this.extractFailureReason(
                      providerResult.rawResponse
                    ),
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
                }
              );

            return {
              responseStatus: 200,
              responseBody:
                failed,
              resourceType:
                "SETTLEMENT",
              resourceId:
                failed.id,
            };
          }

          context =
            await this.getSettlementContext(
              input.organizationId,
              input.settlementId
            );

          return {
            responseStatus: 200,
            responseBody:
              this.toResult(
                context.settlement
              ),
            resourceType:
              "SETTLEMENT",
            resourceId:
              context.settlement.id,
          };
        }
      );

    return result.responseBody as SettlementResult;
  }

  async sync(
    input: SyncSettlementPayoutInput
  ): Promise<SettlementResult> {
    this.validateSyncInput(input);

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
            `financial.settlement.payout.sync:${input.organizationId}`,
          userId:
            input.actorUserId,
          requestBody,
        },
        async () => {
          const context =
            await this.getSettlementContext(
              input.organizationId,
              input.settlementId
            );

          if (
            context.settlement.status ===
              SettlementStatus.COMPLETED ||
            context.settlement.status ===
              SettlementStatus.RECONCILED ||
            context.settlement.status ===
              SettlementStatus.FAILED
          ) {
            return {
              responseStatus: 200,
              responseBody:
                this.toResult(
                  context.settlement
                ),
              resourceType:
                "SETTLEMENT",
              resourceId:
                context.settlement.id,
            };
          }

          if (
            context.settlement.status !==
            SettlementStatus.PROCESSING
          ) {
            throw new Error(
              `Settlement cannot be synchronized from status ${context.settlement.status}.`
            );
          }

          if (
            !context.settlement.providerReference
          ) {
            throw new Error(
              "Settlement has no external provider reference."
            );
          }

          const provider =
            settlementProviderRegistry.get(
              context.financialInstrument.provider
            );

          const providerResult =
            await provider.getPayoutStatus({
              settlementId:
                context.settlement.id,
              providerPayoutId:
                context.settlement.providerReference,
              amountMinor:
                context.settlement.amountMinor,
              currency:
                context.settlement.currency,
              metadata:
                this.metadataObject(
                  context.settlement.metadata
                ),
            });

          this.validateProviderResult(
            providerResult,
            context.settlement
          );

          await this.persistProviderResult(
            input,
            providerResult
          );

          if (
            providerResult.status ===
            "COMPLETED"
          ) {
            const completed =
              await settlementService.complete({
                organizationId:
                  input.organizationId,
                settlementId:
                  input.settlementId,
                providerReference:
                  providerResult.providerPayoutId,
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
                  `settlement-complete:${context.settlement.id}:${providerResult.providerPayoutId}`,
              });

            return {
              responseStatus: 200,
              responseBody:
                completed,
              resourceType:
                "SETTLEMENT",
              resourceId:
                completed.id,
            };
          }

          if (
            providerResult.status ===
            "FAILED"
          ) {
            const failed =
              await this.failSettlementWithReversal(
                {
                  organizationId:
                    input.organizationId,
                  settlementId:
                    input.settlementId,
                  providerReference:
                    providerResult.providerPayoutId,
                  failureReason:
                    this.extractFailureReason(
                      providerResult.rawResponse
                    ),
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
                }
              );

            return {
              responseStatus: 200,
              responseBody:
                failed,
              resourceType:
                "SETTLEMENT",
              resourceId:
                failed.id,
            };
          }

          const current =
            await settlementService.getById(
              input.organizationId,
              input.settlementId
            );

          if (!current) {
            throw new Error(
              "Settlement not found."
            );
          }

          return {
            responseStatus: 200,
            responseBody:
              current,
            resourceType:
              "SETTLEMENT",
            resourceId:
              current.id,
          };
        }
      );

    return result.responseBody as SettlementResult;
  }

  private async getSettlementContext(
    organizationId: string,
    settlementId: string
  ): Promise<SettlementContext> {
    const settlement =
      await prisma.settlement.findFirst({
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
          providerReference: true,
          metadata: true,
        },
      });

    if (!settlement) {
      throw new Error(
        "Settlement not found."
      );
    }

    const financialInstrument =
      await prisma.financialInstrument.findFirst({
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
          type: true,
          status: true,
          currency: true,
        },
      });

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

  private async persistProviderResult(
    input:
      | ExecuteSettlementPayoutInput
      | SyncSettlementPayoutInput,
    providerResult:
      | SettlementProviderCreatePayoutResult
      | SettlementProviderGetPayoutStatusResult
  ): Promise<void> {
    const providerReference =
      providerResult.providerPayoutId.trim();

    const current =
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
          providerReference: true,
          metadata: true,
        },
      });

    if (!current) {
      throw new Error(
        "Settlement not found."
      );
    }

    if (
      current.providerReference &&
      current.providerReference !==
        providerReference
    ) {
      throw new Error(
        "Settlement is already associated with a different provider reference."
      );
    }

    const existingMetadata =
      this.metadataObject(
        current.metadata
      );

    const updatedMetadata = {
      ...existingMetadata,
      payout: {
        provider:
          providerResult.provider,
        providerPayoutId:
          providerReference,
        status:
          providerResult.status,
        lastUpdatedAt:
          new Date().toISOString(),
        rawResponse:
          providerResult.rawResponse ??
          null,
      },
    };

    await prisma.$transaction(
      async (tx) => {
        const locked =
          await tx.settlement.findFirst({
            where: {
              id:
                input.settlementId,
              vendor: {
                organizationId:
                  input.organizationId,
              },
            },
            select: {
              id: true,
              providerReference:
                true,
              status: true,
            },
          });

        if (!locked) {
          throw new Error(
            "Settlement not found."
          );
        }

        if (
          locked.providerReference &&
          locked.providerReference !==
            providerReference
        ) {
          throw new Error(
            "Settlement is already associated with a different provider reference."
          );
        }

        if (
          locked.status ===
            SettlementStatus.COMPLETED ||
          locked.status ===
            SettlementStatus.RECONCILED
        ) {
          return;
        }

        await tx.settlement.update({
          where: {
            id:
              locked.id,
          },
          data: {
            providerReference,
            metadata:
              updatedMetadata as Prisma.InputJsonValue,
          },
        });

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
              "SETTLEMENT_PROVIDER_UPDATED",
            entityType:
              "SETTLEMENT",
            entityId:
              locked.id,
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
                provider:
                  providerResult.provider,
                providerPayoutId:
                  providerReference,
                status:
                  providerResult.status,
              } as Prisma.InputJsonValue,
          },
        });
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      }
    );
  }

  private async failSettlementWithReversal(
    input: {
      organizationId: string;
      settlementId: string;
      providerReference: string;
      failureReason: string;
      actorUserId?: string;
      correlationId?: string;
      requestId?: string;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<SettlementResult> {
    const result =
      await prisma.$transaction(
        async (tx) => {
          const settlement =
            await tx.settlement.findFirst({
              where: {
                id:
                  input.settlementId,
                vendor: {
                  organizationId:
                    input.organizationId,
                },
              },
            });

          if (!settlement) {
            throw new Error(
              "Settlement not found."
            );
          }

          if (
            settlement.status ===
              SettlementStatus.FAILED
          ) {
            return settlement;
          }

          if (
            settlement.status ===
              SettlementStatus.COMPLETED ||
            settlement.status ===
              SettlementStatus.RECONCILED
          ) {
            throw new Error(
              "A completed settlement cannot be failed."
            );
          }

          if (
            settlement.status !==
            SettlementStatus.PROCESSING
          ) {
            throw new Error(
              "Only a processing settlement can be failed."
            );
          }

          if (!settlement.transactionId) {
            throw new Error(
              "Failed settlement has no internal funding transaction."
            );
          }

          const fundingTransaction =
            await tx.transaction.findUnique({
              where: {
                id:
                  settlement.transactionId,
              },
              select: {
                id: true,
                status: true,
                type: true,
                amountMinor: true,
                currency: true,
                sourceAccountId: true,
                destinationAccountId:
                  true,
              },
            });

          if (!fundingTransaction) {
            throw new Error(
              "Settlement funding transaction was not found."
            );
          }

          if (
            fundingTransaction.status !==
            TransactionStatus.COMPLETED
          ) {
            throw new Error(
              "Settlement funding transaction is not completed."
            );
          }

          if (
            fundingTransaction.type !==
            TransactionType.SETTLEMENT
          ) {
            throw new Error(
              "Settlement funding transaction has an invalid type."
            );
          }

          if (
            fundingTransaction.amountMinor !==
            settlement.amountMinor
          ) {
            throw new Error(
              "Settlement amount does not match the funding transaction."
            );
          }

          if (
            fundingTransaction.currency !==
            settlement.currency
          ) {
            throw new Error(
              "Settlement currency does not match the funding transaction."
            );
          }

          if (
            !fundingTransaction.sourceAccountId ||
            !fundingTransaction.destinationAccountId
          ) {
            throw new Error(
              "Settlement funding transaction has incomplete account references."
            );
          }

          const reversal =
            await transactionService.createWithinTransaction(
              tx,
              {
                organizationId:
                  input.organizationId,
                idempotencyKey:
                  `settlement-reversal:${settlement.id}`,
                type:
                  TransactionType.ADJUSTMENT,
                direction:
                  TransactionDirection.DEBIT,
                amountMinor:
                  settlement.amountMinor,
                currency:
                  settlement.currency,
                actorUserId:
                  input.actorUserId,
                actorType:
                  TransactionActorType.SYSTEM,
                sourceAccountId:
                  fundingTransaction.destinationAccountId,
                destinationAccountId:
                  fundingTransaction.sourceAccountId,
                reference:
                  `SETTLEMENT-REVERSAL-${settlement.id}`,
                referenceType:
                  "SETTLEMENT_REVERSAL",
                vendorId:
                  settlement.vendorId,
                context:
                  "EXTERNAL_SETTLEMENT_PAYOUT_FAILED",
                metadata: {
                  settlementId:
                    settlement.id,
                  originalTransactionId:
                    fundingTransaction.id,
                  providerReference:
                    input.providerReference,
                  failureReason:
                    input.failureReason,
                },
                correlationId:
                  input.correlationId,
                requestId:
                  input.requestId,
                ipAddress:
                  input.ipAddress,
                userAgent:
                  input.userAgent,
              }
            );

          if (
            reversal.status !==
            TransactionStatus.COMPLETED
          ) {
            throw new Error(
              "Settlement reversal transaction did not complete."
            );
          }

          const metadata =
            this.metadataObject(
              settlement.metadata
            );

          const failedMetadata = {
            ...metadata,
            payout: {
              ...(metadata.payout &&
              typeof metadata.payout ===
                "object"
                ? metadata.payout
                : {}),
              providerPayoutId:
                input.providerReference,
              status:
                "FAILED",
              failureReason:
                input.failureReason,
              reversalTransactionId:
                reversal.id,
              failedAt:
                new Date().toISOString(),
            },
          };

          const updated =
            await tx.settlement.update({
              where: {
                id:
                  settlement.id,
              },
              data: {
                status:
                  SettlementStatus.FAILED,
                providerReference:
                  input.providerReference,
                metadata:
                  failedMetadata as Prisma.InputJsonValue,
              },
            });

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
                "SETTLEMENT_PAYOUT_FAILED",
              entityType:
                "SETTLEMENT",
              entityId:
                settlement.id,
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
                    settlement.id,
                  providerReference:
                    input.providerReference,
                  failureReason:
                    input.failureReason,
                  reversalTransactionId:
                    reversal.id,
                  amountMinor:
                    settlement.amountMinor.toString(),
                  currency:
                    settlement.currency,
                } as Prisma.InputJsonValue,
            },
          });

          return updated;
        },
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5000,
          timeout: 10000,
        }
      );

    return this.toResult(
      result
    );
  }

  private validateProviderResult(
    result:
      | SettlementProviderCreatePayoutResult
      | SettlementProviderGetPayoutStatusResult,
    settlement: SettlementContext["settlement"]
  ): void {
    if (!result.provider.trim()) {
      throw new Error(
        "Settlement provider returned an empty provider name."
      );
    }

    if (
      !result.providerPayoutId ||
      !result.providerPayoutId.trim()
    ) {
      throw new Error(
        "Settlement provider did not return a payout reference."
      );
    }

    if (
      result.status !==
        "PENDING" &&
      result.status !==
        "PROCESSING" &&
      result.status !==
        "COMPLETED" &&
      result.status !==
        "FAILED"
    ) {
      throw new Error(
        "Settlement provider returned an unsupported payout status."
      );
    }

    if (
      settlement.amountMinor <=
      BigInt(0)
    ) {
      throw new Error(
        "Settlement amount must be greater than zero."
      );
    }
  }

  private extractFailureReason(
    rawResponse?: Record<string, unknown>
  ): string {
    if (!rawResponse) {
      return "External settlement provider reported a payout failure.";
    }

    const candidates = [
      rawResponse["failureReason"],
      rawResponse["failure_code"],
      rawResponse["failureCode"],
      rawResponse["message"],
      rawResponse["error"],
    ];

    for (const candidate of candidates) {
      if (
        typeof candidate ===
          "string" &&
        candidate.trim()
      ) {
        return candidate.trim().slice(
          0,
          1000
        );
      }
    }

    return "External settlement provider reported a payout failure.";
  }

  private metadataObject(
    value: Prisma.JsonValue | null
  ): Record<string, unknown> {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      return {
        ...(value as Record<
          string,
          unknown
        >),
      };
    }

    return {};
  }

  private toResult(
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
      createdAt: Date;
      updatedAt: Date;
    }
  ): SettlementResult {
    return {
      id:
        settlement.id,
      vendorId:
        settlement.vendorId,
      financialInstrumentId:
        settlement.financialInstrumentId,
      transactionId:
        settlement.transactionId,
      amountMinor:
        settlement.amountMinor.toString(),
      currency:
        settlement.currency,
      status:
        settlement.status,
      periodStart:
        settlement.periodStart,
      periodEnd:
        settlement.periodEnd,
      providerReference:
        settlement.providerReference,
      createdAt:
        settlement.createdAt,
      updatedAt:
        settlement.updatedAt,
    };
  }

  private validateExecuteInput(
    input: ExecuteSettlementPayoutInput
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

  private validateSyncInput(
    input: SyncSettlementPayoutInput
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

export const settlementPayoutService =
  new SettlementPayoutService();
