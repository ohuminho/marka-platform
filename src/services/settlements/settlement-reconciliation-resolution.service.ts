import {
  Prisma,
  ReconciliationStatus,
} from "@prisma/client";

import { prisma } from "@/database/client/prisma";
import {
  IdempotencyService,
} from "@/core/idempotency/idempotency.service";

export interface ResolveSettlementReconciliationInput {
  organizationId: string;
  reconciliationId: string;

  actorUserId: string;
  resolutionCode: string;
  resolutionNote: string;

  correlationId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;

  idempotencyKey: string;
}

export interface SettlementReconciliationResolutionResult {
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
  resolutionCode: string | null;
  resolutionNote: string | null;
  resolvedAt: Date | null;
  resolvedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ALLOWED_RESOLUTION_CODES = new Set([
  "PROVIDER_CONFIRMED_DIFFERENCE",
  "PROVIDER_CORRECTED",
  "INTERNAL_DATA_CORRECTED",
  "BANK_FEE_CONFIRMED",
  "CURRENCY_CONVERSION_CONFIRMED",
  "DUPLICATE_PAYOUT_CONFIRMED",
  "MANUAL_INVESTIGATION_COMPLETED",
  "OTHER",
]);

export class SettlementReconciliationResolutionService {
  private readonly idempotencyService =
    new IdempotencyService();

  async resolve(
    input: ResolveSettlementReconciliationInput
  ): Promise<SettlementReconciliationResolutionResult> {
    this.validateInput(input);

    const result =
      await this.idempotencyService.execute(
        {
          key: input.idempotencyKey,
          scope:
            `financial.settlement.reconciliation.resolve:${input.organizationId}`,
          userId: input.actorUserId,
          requestBody: {
            organizationId:
              input.organizationId,
            reconciliationId:
              input.reconciliationId,
            resolutionCode:
              input.resolutionCode,
            resolutionNote:
              input.resolutionNote,
          },
        },
        async () => {
          const reconciliation =
            await this.runWithSerializationRetry(
              async () =>
                prisma.$transaction(
                  async (tx) => {
                    const current =
                      await tx.reconciliation.findFirst(
                        {
                          where: {
                            id:
                              input.reconciliationId,
                            settlement: {
                              vendor: {
                                organizationId:
                                  input.organizationId,
                              },
                            },
                          },
                          select: {
                            id: true,
                            settlementId:
                              true,
                            provider: true,
                            periodStart:
                              true,
                            periodEnd:
                              true,
                            status: true,
                            expectedMinor:
                              true,
                            actualMinor:
                              true,
                            differenceMinor:
                              true,
                            currency: true,
                            reference: true,
                            metadata: true,
                            createdAt:
                              true,
                            updatedAt:
                              true,
                          },
                        }
                      );

                    if (!current) {
                      throw new Error(
                        "Reconciliation not found."
                      );
                    }

                    if (
                      current.status ===
                      ReconciliationStatus.RESOLVED
                    ) {
                      return current;
                    }

                    if (
                      current.status !==
                      ReconciliationStatus.MISMATCH
                    ) {
                      throw new Error(
                        "Only a mismatched reconciliation can be resolved."
                      );
                    }

                    const now =
                      new Date();

                    const existingMetadata =
                      current.metadata &&
                      typeof current.metadata ===
                        "object" &&
                      !Array.isArray(
                        current.metadata
                      )
                        ? (
                            current.metadata as Record<
                              string,
                              unknown
                            >
                          )
                        : {};

                    const resolutionMetadata = {
                      ...existingMetadata,
                      resolution: {
                        code:
                          input.resolutionCode,
                        note:
                          input.resolutionNote,
                        resolvedAt:
                          now.toISOString(),
                        resolvedByUserId:
                          input.actorUserId,
                      },
                    };

                    const updated =
                      await tx.reconciliation.update(
                        {
                          where: {
                            id:
                              current.id,
                          },
                          data: {
                            status:
                              ReconciliationStatus.RESOLVED,
                            metadata:
                              resolutionMetadata as Prisma.InputJsonValue,
                          },
                          select: {
                            id: true,
                            settlementId:
                              true,
                            provider: true,
                            periodStart:
                              true,
                            periodEnd:
                              true,
                            status: true,
                            expectedMinor:
                              true,
                            actualMinor:
                              true,
                            differenceMinor:
                              true,
                            currency: true,
                            reference: true,
                            metadata: true,
                            createdAt:
                              true,
                            updatedAt:
                              true,
                          },
                        }
                      );

                    await tx.auditLog.create({
                      data: {
                        organizationId:
                          input.organizationId,
                        actorUserId:
                          input.actorUserId,
                        actorType:
                          "USER",
                        action:
                          "SETTLEMENT_RECONCILIATION_RESOLVED",
                        entityType:
                          "RECONCILIATION",
                        entityId:
                          current.id,
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
                              current.settlementId,
                            provider:
                              current.provider,
                            expectedMinor:
                              current.expectedMinor.toString(),
                            actualMinor:
                              current.actualMinor.toString(),
                            differenceMinor:
                              current.differenceMinor.toString(),
                            currency:
                              current.currency,
                            resolutionCode:
                              input.resolutionCode,
                            resolutionNote:
                              input.resolutionNote,
                            resolvedAt:
                              now.toISOString(),
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
                )
            );

          return {
            responseStatus: 200,
            responseBody:
              this.toResult(
                reconciliation
              ),
            resourceType:
              "RECONCILIATION",
            resourceId:
              reconciliation.id,
          };
        }
      );

    return result.responseBody as SettlementReconciliationResolutionResult;
  }

  async getById(
    organizationId: string,
    reconciliationId: string
  ): Promise<SettlementReconciliationResolutionResult | null> {
    this.validateOrganizationId(
      organizationId
    );

    if (!reconciliationId.trim()) {
      throw new Error(
        "Reconciliation ID is required."
      );
    }

    const reconciliation =
      await prisma.reconciliation.findFirst(
        {
          where: {
            id: reconciliationId,
            settlement: {
              vendor: {
                organizationId,
              },
            },
          },
          select: {
            id: true,
            settlementId: true,
            provider: true,
            periodStart: true,
            periodEnd: true,
            status: true,
            expectedMinor: true,
            actualMinor: true,
            differenceMinor: true,
            currency: true,
            reference: true,
            metadata: true,
            createdAt: true,
            updatedAt: true,
          },
        }
      );

    return reconciliation
      ? this.toResult(reconciliation)
      : null;
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
      metadata: Prisma.JsonValue | null;
      createdAt: Date;
      updatedAt: Date;
    }
  ): SettlementReconciliationResolutionResult {
    const metadata =
      reconciliation.metadata &&
      typeof reconciliation.metadata ===
        "object" &&
      !Array.isArray(
        reconciliation.metadata
      )
        ? (
            reconciliation.metadata as Record<
              string,
              unknown
            >
          )
        : {};

    const resolution =
      metadata.resolution &&
      typeof metadata.resolution ===
        "object" &&
      !Array.isArray(
        metadata.resolution
      )
        ? (
            metadata.resolution as Record<
              string,
              unknown
            >
          )
        : null;

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
      resolutionCode:
        typeof resolution?.code ===
        "string"
          ? resolution.code
          : null,
      resolutionNote:
        typeof resolution?.note ===
        "string"
          ? resolution.note
          : null,
      resolvedAt:
        typeof resolution?.resolvedAt ===
        "string"
          ? new Date(
              resolution.resolvedAt
            )
          : null,
      resolvedByUserId:
        typeof resolution?.resolvedByUserId ===
        "string"
          ? resolution.resolvedByUserId
          : null,
      createdAt:
        reconciliation.createdAt,
      updatedAt:
        reconciliation.updatedAt,
    };
  }

  private validateInput(
    input: ResolveSettlementReconciliationInput
  ): void {
    this.validateOrganizationId(
      input.organizationId
    );

    if (!input.reconciliationId.trim()) {
      throw new Error(
        "Reconciliation ID is required."
      );
    }

    if (!input.actorUserId.trim()) {
      throw new Error(
        "Actor user ID is required."
      );
    }

    if (!input.resolutionCode.trim()) {
      throw new Error(
        "Resolution code is required."
      );
    }

    if (
      !ALLOWED_RESOLUTION_CODES.has(
        input.resolutionCode
      )
    ) {
      throw new Error(
        "Invalid reconciliation resolution code."
      );
    }

    if (
      !input.resolutionNote.trim()
    ) {
      throw new Error(
        "Resolution note is required."
      );
    }

    if (
      input.resolutionNote.trim()
        .length < 10
    ) {
      throw new Error(
        "Resolution note must contain at least 10 characters."
      );
    }

    if (
      !input.idempotencyKey.trim()
    ) {
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
          error instanceof
            Prisma.PrismaClientKnownRequestError &&
          error.code === "P2034" &&
          attempt < maxRetries
        ) {
          await new Promise<void>(
            (resolve) =>
              setTimeout(
                resolve,
                100 * attempt
              )
          );

          continue;
        }

        throw error;
      }
    }

    throw new Error(
      "Reconciliation resolution failed after retries."
    );
  }
}

export const settlementReconciliationResolutionService =
  new SettlementReconciliationResolutionService();
