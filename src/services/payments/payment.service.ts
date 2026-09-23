import {
  PaymentStatus,
  Prisma,
  TransactionActorType,
} from "@prisma/client";

import { prisma } from "@/database/client/prisma";

import {
  FinancialAuditService,
} from "@/core/audit/financial-audit.service";

import {
  IdempotencyService,
} from "@/core/idempotency/idempotency.service";

import {
  accountService,
} from "@/services/accounts/account.service";

import {
  financialAllocationService,
} from "@/services/finance/allocation/financial-allocation.service";

import {
  transactionService,
} from "@/services/transactions/transaction.service";

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
          userId:
            input.userId,
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
                  order.status ===
                    "CANCELLED" ||
                  order.status ===
                    "REFUNDED"
                ) {
                  throw new Error(
                    "This order cannot receive a payment."
                  );
                }

                const activePayment =
                  await database.payment.findFirst({
                    where: {
                      orderId:
                        order.id,
                      status: {
                        in: [
                          "CREATED",
                          "PENDING",
                          "PROCESSING",
                        ],
                      },
                    },
                    orderBy: {
                      createdAt:
                        "desc",
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

                const paymentData: Prisma.PaymentUncheckedCreateInput =
                  {
                    orderId:
                      order.id,
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
                  };

                const created =
                  await database.payment.create({
                    data:
                      paymentData,
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
      payment.order.userId !==
        input.userId
    ) {
      throw new Error(
        "Payment not found."
      );
    }

    if (
      payment.status ===
      PaymentStatus.COMPLETED
    ) {
      return this.toResult(
        payment
      );
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
      input.provider
        ?.trim()
        .toUpperCase() ??
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
      input.providerPaymentId
        ?.trim() ??
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

    /*
     * The clearing account is the internal recognition
     * point for funds confirmed by an external provider.
     *
     * We provision it before the financial transaction.
     * The account itself remains an internal MARKA account;
     * no customer wallet is fabricated for external money.
     */
    const clearingAccount =
      await accountService.ensureClearingAccount(
        {
          organizationId,
          currency:
            payment.currency,
          actorUserId:
            input.userId,
          correlationId:
            input.correlationId,
          requestId:
            input.requestId,
        }
      );

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
          /*
           * Provider confirmation is deliberately outside
           * the database transaction. External calls must
           * never hold a database transaction open.
           */
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

          let nextStatus:
            PaymentStatus;

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

          /*
           * Non-completed provider states do not create
           * financial funds inside MARKA.
           */
          if (
            nextStatus !==
            PaymentStatus.COMPLETED
          ) {
            const updated =
              await prisma.payment.update({
                where: {
                  id:
                    payment.id,
                },
                data: {
                  provider:
                    provider.name,
                  providerPaymentId:
                    providerResult.providerPaymentId,
                  status:
                    nextStatus,
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
                this.toResult(
                  updated
                ),
              resourceType:
                "PAYMENT",
              resourceId:
                updated.id,
            };
          }

          /*
           * COMPLETED:
           *
           * 1. External provider has confirmed the money.
           * 2. MARKA recognizes it in CLEARING.
           * 3. The captured funds are allocated atomically
           *    into vendor payable and MARKA revenue.
           * 4. Commission is accrued from the same financial
           *    allocation.
           *
           * All internal financial mutations occur inside
           * one serializable database transaction.
           */
          const completed =
            await prisma.$transaction(
              async (database) => {
                const currentPayment =
                  await database.payment.findUnique({
                    where: {
                      id:
                        payment.id,
                    },
                    select: {
                      id: true,
                      orderId: true,
                      transactionId:
                        true,
                      amountMinor:
                        true,
                      currency:
                        true,
                      status:
                        true,
                    },
                  });

                if (!currentPayment) {
                  throw new Error(
                    "Payment not found during financial confirmation."
                  );
                }

                if (
                  currentPayment.transactionId
                ) {
                  const existingTransaction =
                    await database.transaction.findUnique({
                      where: {
                        id:
                          currentPayment.transactionId,
                      },
                    });

                  if (
                    !existingTransaction
                  ) {
                    throw new Error(
                      "Payment references a missing financial transaction."
                    );
                  }

                  /*
                   * Recovery/idempotency path:
                   *
                   * A previous attempt may already have
                   * created the capture transaction. The
                   * allocation service is itself idempotent
                   * and validates the existing financial
                   * state before returning the allocation.
                   */
                  await financialAllocationService.allocatePaymentWithinTransaction(
                    database,
                    {
                      organizationId,
                      paymentId:
                        currentPayment.id,
                      clearingAccountId:
                        clearingAccount.id,
                      actorUserId:
                        input.userId,
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

                  const updatedPayment =
                    await database.payment.update({
                      where: {
                        id:
                          currentPayment.id,
                      },
                      data: {
                        provider:
                          provider.name,
                        providerPaymentId:
                          providerResult.providerPaymentId,
                        status:
                          PaymentStatus.COMPLETED,
                        metadata:
                          nextMetadata,
                      },
                    });

                  return {
                    payment:
                      updatedPayment,
                    transaction:
                      existingTransaction,
                  };
                }

                if (
                  currentPayment.status ===
                    PaymentStatus.REFUNDED ||
                  currentPayment.status ===
                    PaymentStatus.CANCELLED
                ) {
                  throw new Error(
                    "Payment can no longer be completed."
                  );
                }

                const externalTransaction =
                  await transactionService.createExternalCreditWithinTransaction(
                    database,
                    {
                      organizationId,
                      idempotencyKey:
                        `PAYMENT-CAPTURE-${currentPayment.id}`,
                      type:
                        "PAYMENT",
                      amountMinor:
                        currentPayment.amountMinor,
                      currency:
                        currentPayment.currency,
                      destinationAccountId:
                        clearingAccount.id,
                      actorUserId:
                        input.userId,
                      actorType:
                        TransactionActorType.CUSTOMER,
                      reference:
                        `PAYMENT-${currentPayment.id}`,
                      referenceType:
                        "PAYMENT_CAPTURE",
                      orderId:
                        currentPayment.orderId ??
                        undefined,
                      paymentId:
                        currentPayment.id,
                      provider:
                        provider.name,
                      providerPaymentId:
                        providerResult.providerPaymentId,
                      context:
                        "EXTERNAL_PAYMENT_CAPTURE",
                      metadata:
                        input.metadata,
                      ipAddress:
                        input.ipAddress,
                      userAgent:
                        input.userAgent,
                      correlationId:
         
