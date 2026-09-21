import {
  PaymentStatus,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/database/client/prisma";
import {
  FinancialAuditService,
} from "@/core/audit/financial-audit.service";
import {
  IdempotencyService,
} from "@/core/idempotency/idempotency.service";

import {
  paymentProviderRegistry,
} from "./providers/payment-provider.registry";

export interface CreatePaymentInput {
  userId: string;
  orderId: string;
  idempotencyKey: string;
  provider?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
  requestId?: string;
}

export interface ConfirmPaymentInput {
  userId: string;
  paymentId: string;
  idempotencyKey: string;
  providerPaymentId?: string;
  provider?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
  requestId?: string;
}

export interface PaymentResult {
  id: string;
  orderId: string | null;
  transactionId: string | null;
  amountMinor: string;
  currency: string;
  status: PaymentStatus;
  provider: string | null;
  providerPaymentId: string | null;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
}

export class PaymentService {
  private readonly idempotencyService =
    new IdempotencyService();

  private readonly financialAuditService =
    new FinancialAuditService();

  async createPayment(
    input: CreatePaymentInput
  ): Promise<PaymentResult> {
    this.validateCreateInput(input);

    const membership =
      await prisma.organizationMembership.findFirst({
        where: {
          userId: input.userId,
          status: "ACTIVE",
          organization: {
            status: "ACTIVE",
          },
        },
        select: {
          organizationId: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

    if (!membership) {
      throw new Error(
        "Active organization membership not found."
      );
    }

    const organizationId =
      membership.organizationId;

    const normalizedProvider =
      input.provider?.trim().toUpperCase();

    const requestBody = {
      userId: input.userId,
      orderId: input.orderId,
      provider:
        normalizedProvider ?? null,
      metadata:
        input.metadata ?? null,
    };

    const result =
      await this.idempotencyService.execute(
        {
          key: input.idempotencyKey,
          scope:
            `payment.intent.create:${organizationId}:${input.userId}`,
          userId: input.userId,
          requestBody,
        },
        async () => {
          const payment =
            await prisma.$transaction(
              async (database) => {
                const order =
                  await database.order.findFirst({
                    where: {
                      id: input.orderId,
                      userId: input.userId,
                    },
                    select: {
                      id: true,
                      userId: true,
                      total: true,
                      currency: true,
                      status: true,
                    },
                  });

                if (!order) {
                  throw new Error(
                    "Order not found."
                  );
                }

                if (
                  order.status === "CANCELLED" ||
                  order.status === "REFUNDED"
                ) {
                  throw new Error(
                    "This order cannot receive a payment."
                  );
                }

                const activePayment =
                  await database.payment.findFirst({
                    where: {
                      orderId: order.id,
                      status: {
                        in: [
                          "CREATED",
                          "PENDING",
                          "PROCESSING",
                        ],
                      },
                    },
                    orderBy: {
                      createdAt: "desc",
                    },
                  });

                if (activePayment) {
                  throw new Error(
                    "An active payment already exists for this order."
                  );
                }

                const amountMinor =
                  this.toMinorUnits(
                    order.total.toString(),
                    order.currency
                  );

                const created =
                  await database.payment.create({
                    data: {
                      orderId: order.id,
                      amountMinor,
                      currency:
                        order.currency,
                      status:
                        PaymentStatus.CREATED,
                      provider:
                        normalizedProvider,
                      idempotencyKey:
                        input.idempotencyKey,
                      metadata:
                        input.metadata
                          ? this.toJsonValue(
                              input.metadata
                            )
                          : undefined,
                    },
                  });

                return created;
              }
            );

          await this.financialAuditService.recordPayment(
            {
              organizationId,
              actorUserId:
                input.userId,
              paymentId:
                payment.id,
              action:
                "PAYMENT_INTENT_CREATED",
              correlationId:
                input.correlationId,
              requestId:
                input.requestId,
              ipAddress:
                input.ipAddress,
              userAgent:
                input.userAgent,
              metadata: {
                paymentId:
                  payment.id,
                orderId:
                  payment.orderId,
                amountMinor:
                  payment.amountMinor.toString(),
                currency:
                  payment.currency,
                provider:
                  payment.provider,
              },
            }
          );

          return {
            responseStatus: 201,
            responseBody:
              this.toResult(payment),
            resourceType:
              "PAYMENT",
            resourceId:
              payment.id,
          };
        }
      );

    return result.responseBody as PaymentResult;
  }

  async confirmPayment(
    input: ConfirmPaymentInput
  ): Promise<PaymentResult> {
    this.validateConfirmInput(input);

    const payment =
      await prisma.payment.findUnique({
        where: {
          id: input.paymentId,
        },
        include: {
          order: {
            select: {
              id: true,
              userId: true,
            },
          },
        },
      });

    if (!payment) {
      throw new Error(
        "Payment not found."
      );
    }

    if (
      !payment.order ||
      payment.order.userId !== input.userId
    ) {
      throw new Error(
        "Payment not found."
      );
    }

    if (
      payment.status ===
      PaymentStatus.COMPLETED
    ) {
      return this.toResult(payment);
    }

    if (
      payment.status ===
        PaymentStatus.CANCELLED ||
      payment.status ===
        PaymentStatus.REFUNDED ||
      payment.status ===
        PaymentStatus.FAILED
    ) {
      throw new Error(
        "This payment can no longer be confirmed."
      );
    }

    const providerName =
      input.provider?.trim().toUpperCase() ??
      payment.provider;

    if (!providerName) {
      throw new Error(
        "Payment provider is required."
      );
    }

    const provider =
      paymentProviderRegistry.get(
        providerName
      );

    const providerPaymentId =
      input.providerPaymentId?.trim() ??
      payment.providerPaymentId;

    if (!providerPaymentId) {
      throw new Error(
        "Provider payment id is required."
      );
    }

    const membership =
      await prisma.organizationMembership.findFirst({
        where: {
          userId: input.userId,
          status: "ACTIVE",
          organization: {
            status: "ACTIVE",
          },
        },
        select: {
          organizationId: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

    if (!membership) {
      throw new Error(
        "Active organization membership not found."
      );
    }

    const organizationId =
      membership.organizationId;

    const requestBody = {
      paymentId:
        input.paymentId,
      provider:
        provider.name,
      providerPaymentId,
    };

    const result =
      await this.idempotencyService.execute(
        {
          key: input.idempotencyKey,
          scope:
            `payment.confirm:${organizationId}:${input.userId}`,
          userId:
            input.userId,
          requestBody,
        },
        async () => {
          const providerResult =
            await provider.confirm({
              paymentId:
                payment.id,
              providerPaymentId,
              amountMinor:
                payment.amountMinor,
              currency:
                payment.currency,
              orderId:
                payment.orderId!,
              customerId:
                input.userId,
              metadata:
                input.metadata,
            });

          let nextStatus: PaymentStatus;

          switch (
            providerResult.status
          ) {
            case "COMPLETED":
              nextStatus =
                PaymentStatus.COMPLETED;
              break;

            case "PROCESSING":
              nextStatus =
                PaymentStatus.PROCESSING;
              break;

            case "PENDING":
              nextStatus =
                PaymentStatus.PENDING;
              break;

            case "CANCELLED":
              nextStatus =
                PaymentStatus.CANCELLED;
              break;

            case "FAILED":
              nextStatus =
                PaymentStatus.FAILED;
              break;

            default:
              throw new Error(
                "Unsupported provider payment status."
              );
          }

          const nextMetadata =
            providerResult.rawResponse
              ? this.mergeJsonMetadata(
                  payment.metadata,
                  {
                    providerResponse:
                      providerResult.rawResponse,
                  }
                )
              : undefined;

          const updated =
            await prisma.payment.update({
              where: {
                id: payment.id,
              },
              data: {
                provider:
                  provider.name,
                providerPaymentId:
                  providerResult.providerPaymentId,
                status: nextStatus,
                metadata:
                  nextMetadata,
              },
            });

          await this.financialAuditService.recordPayment(
            {
              organizationId,
              actorUserId:
                input.userId,
              paymentId:
                payment.id,
              action:
                `PAYMENT_PROVIDER_${nextStatus}`,
              correlationId:
                input.correlationId,
              requestId:
                input.requestId,
              ipAddress:
                input.ipAddress,
              userAgent:
                input.userAgent,
              metadata: {
                provider:
                  provider.name,
                providerPaymentId:
                  providerResult.providerPaymentId,
                paymentStatus:
                  nextStatus,
              },
            }
          );

          return {
            responseStatus: 200,
            responseBody:
              this.toResult(updated),
            resourceType:
              "PAYMENT",
            resourceId:
              updated.id,
          };
        }
      );

    return result.responseBody as PaymentResult;
  }

  async getPayment(
    userId: string,
    paymentId: string
  ): Promise<PaymentResult | null> {
    if (!userId.trim()) {
      throw new Error(
        "User is required."
      );
    }

    if (!paymentId.trim()) {
      throw new Error(
        "Payment id is required."
      );
    }

    const payment =
      await prisma.payment.findFirst({
        where: {
          id: paymentId,
          order: {
            userId,
          },
        },
      });

    if (!payment) {
      return null;
    }

    return this.toResult(payment);
  }

  private validateCreateInput(
    input: CreatePaymentInput
  ): void {
    if (!input.userId.trim()) {
      throw new Error(
        "User is required."
      );
    }

    if (!input.orderId.trim()) {
      throw new Error(
        "Order id is required."
      );
    }

    if (!input.idempotencyKey.trim()) {
      throw new Error(
        "Idempotency key is required."
      );
    }
  }

  private validateConfirmInput(
    input: ConfirmPaymentInput
  ): void {
    if (!input.userId.trim()) {
      throw new Error(
        "User is required."
      );
    }

    if (!input.paymentId.trim()) {
      throw new Error(
        "Payment id is required."
      );
    }

    if (!input.idempotencyKey.trim()) {
      throw new Error(
        "Idempotency key is required."
      );
    }
  }

  private toMinorUnits(
    amount: string,
    currency: string
  ): bigint {
    const normalized =
      amount.trim();

    if (
      !/^\d+(\.\d+)?$/.test(
        normalized
      )
    ) {
      throw new Error(
        "Invalid monetary amount."
      );
    }

    const [
      wholePart,
      fractionPart = "",
    ] = normalized.split(".");

    if (fractionPart.length > 2) {
      const extraDigits =
        fractionPart.slice(2);

      if (
        extraDigits.replace(
          /0/g,
          ""
        ).length > 0
      ) {
        throw new Error(
          `Currency ${currency} does not support more than two decimal places for payment capture.`
        );
      }
    }

    const fraction =
      fractionPart.padEnd(
        2,
        "0"
      );

    return BigInt(
      `${wholePart}${fraction.slice(
        0,
        2
      )}`
    );
  }

  private toJsonValue(
    value: unknown
  ): Prisma.InputJsonValue {
    return JSON.parse(
      JSON.stringify(value)
    ) as Prisma.InputJsonValue;
  }

  private mergeJsonMetadata(
    current: Prisma.JsonValue | null,
    additional: Record<
      string,
      unknown
    >
  ): Prisma.InputJsonValue {
    const base =
      current !== null &&
      typeof current === "object" &&
      !Array.isArray(current)
        ? current
        : {};

    return this.toJsonValue({
      ...base,
      ...additional,
    });
  }

  private toResult(
    payment: {
      id: string;
      orderId: string | null;
      transactionId: string | null;
      amountMinor: bigint;
      currency: string;
      status: PaymentStatus;
      provider: string | null;
      providerPaymentId:
        | string
        | null;
      idempotencyKey: string;
      createdAt: Date;
      updatedAt: Date;
    }
  ): PaymentResult {
    return {
      id: payment.id,
      orderId:
        payment.orderId,
      transactionId:
        payment.transactionId,
      amountMinor:
        payment.amountMinor.toString(),
      currency:
        payment.currency,
      status:
        payment.status,
      provider:
        payment.provider,
      providerPaymentId:
        payment.providerPaymentId,
      idempotencyKey:
        payment.idempotencyKey,
      createdAt:
        payment.createdAt,
      updatedAt:
        payment.updatedAt,
    };
  }
}

export const paymentService =
  new PaymentService();
