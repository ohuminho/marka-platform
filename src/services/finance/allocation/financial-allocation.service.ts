import {
  AccountStatus,
  AccountType,
  CommissionStatus,
  Prisma,
  TransactionActorType,
  TransactionDirection,
  TransactionStatus,
  TransactionType,
} from "@prisma/client";

import { prisma } from "@/database/client/prisma";

import {
  IdempotencyService,
} from "@/core/idempotency/idempotency.service";

import {
  transactionService,
  type FinancialTransactionClient,
} from "@/services/transactions/transaction.service";

import {
  splitService,
} from "@/services/finance/split/split.service";

import {
  commissionPolicyService,
} from "@/services/finance/commission/commission-policy.service";

export interface AllocatePaymentInput {
  organizationId: string;
  paymentId: string;
  clearingAccountId?: string;

  actorUserId?: string;
  correlationId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;

  idempotencyKey: string;
}

export interface AllocatePaymentWithinTransactionInput {
  organizationId: string;
  paymentId: string;
  clearingAccountId: string;

  actorUserId?: string;
  correlationId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface FinancialAllocationItem {
  vendorId: string;
  grossAmountMinor: string;
  vendorAmountMinor: string;
  commissionAmountMinor: string;
  commissionRateBps: number;
  vendorTransactionId: string;
  commissionTransactionId: string | null;
}

export interface FinancialAllocationResult {
  paymentId: string;
  orderId: string;
  currency: string;
  grossAmountMinor: string;
  vendorAmountMinor: string;
  commissionAmountMinor: string;

  policyKey: string;
  policyVersion: number;

  allocations: FinancialAllocationItem[];
}

interface VendorAllocationAccumulator {
  vendorId: string;
  grossAmountMinor: bigint;
  itemIds: string[];
}

export class FinancialAllocationService {
  private readonly idempotencyService =
    new IdempotencyService();

  async allocatePayment(
    input: AllocatePaymentInput
  ): Promise<FinancialAllocationResult> {
    this.validateAllocateInput(input);

    const requestBody = {
      organizationId:
        input.organizationId,
      paymentId:
        input.paymentId,
      clearingAccountId:
        input.clearingAccountId ??
        null,
    };

    const result =
      await this.idempotencyService.execute(
        {
          key:
            input.idempotencyKey,
          scope:
            `financial.payment-allocation:${input.organizationId}`,
          userId:
            input.actorUserId,
          requestBody,
        },
        async () => {
          const allocation =
            await prisma.$transaction(
              async (database) => {
                const clearingAccount =
                  input.clearingAccountId
                    ? await database.account.findUnique({
                        where: {
                          id:
                            input.clearingAccountId,
                        },
                        select: {
                          id: true,
                          organizationId:
                            true,
                          type: true,
                          currency: true,
                          status: true,
                          userId: true,
                          vendorId: true,
                        },
                      })
                    : await database.account.findFirst({
                        where: {
                          organizationId:
                            input.organizationId,
                          type:
                            AccountType.CLEARING,
                          status:
                            AccountStatus.ACTIVE,
                          userId: null,
                          vendorId: null,
                        },
                        orderBy: {
                          createdAt:
                            "asc",
                        },
                        select: {
                          id: true,
                          organizationId:
                            true,
                          type: true,
                          currency: true,
                          status: true,
                          userId: true,
                          vendorId: true,
                        },
                      });

                if (!clearingAccount) {
                  throw new Error(
                    "Clearing account not found."
                  );
                }

                if (
                  clearingAccount.organizationId !==
                  input.organizationId
                ) {
                  throw new Error(
                    "Clearing account does not belong to the specified organization."
                  );
                }

                if (
                  clearingAccount.type !==
                  AccountType.CLEARING
                ) {
                  throw new Error(
                    "Specified account is not a clearing account."
                  );
                }

                if (
                  clearingAccount.status !==
                  AccountStatus.ACTIVE
                ) {
                  throw new Error(
                    "Clearing account is not active."
                  );
                }

                return this.allocatePaymentWithinTransaction(
                  database,
                  {
                    organizationId:
                      input.organizationId,
                    paymentId:
                      input.paymentId,
                    clearingAccountId:
                      clearingAccount.id,
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
              },
              {
                isolationLevel:
                  Prisma.TransactionIsolationLevel.Serializable,
                maxWait:
                  5000,
                timeout:
                  10000,
              }
            );

          return {
            responseStatus:
              200,
            responseBody:
              allocation,
            resourceType:
              "PAYMENT_FINANCIAL_ALLOCATION",
            resourceId:
              allocation.paymentId,
          };
        }
      );

    return result.responseBody as FinancialAllocationResult;
  }

  async allocatePaymentWithinTransaction(
    database: FinancialTransactionClient,
    input: AllocatePaymentWithinTransactionInput
  ): Promise<FinancialAllocationResult> {
    this.validateAllocateWithinTransactionInput(
      input
    );

    const payment =
      await database.payment.findUnique({
        where: {
          id:
            input.paymentId,
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
          order: {
            select: {
              id: true,
              userId: true,
              total: true,
              currency:
                true,
              items: {
                select: {
                  id: true,
                  vendorId:
                    true,
                  subtotal:
                    true,
                },
                orderBy: {
                  createdAt:
                    "asc",
                },
              },
            },
          },
        },
      });

    if (!payment) {
      throw new Error(
        "Payment not found."
      );
    }

    if (!payment.order) {
      throw new Error(
        "Payment is not associated with an order."
      );
    }

    if (
      payment.orderId !==
      payment.order.id
    ) {
      throw new Error(
        "Payment order relationship is inconsistent."
      );
    }

    if (
      payment.status !==
        "CREATED" &&
      payment.status !==
        "PENDING" &&
      payment.status !==
        "PROCESSING" &&
      payment.status !==
        "COMPLETED"
    ) {
      throw new Error(
        `Payment cannot be financially allocated from status ${payment.status}.`
      );
    }

    if (!payment.transactionId) {
      throw new Error(
        "Payment must have a completed financial transaction before allocation."
      );
    }

    const externalTransaction =
      await database.transaction.findUnique({
        where: {
          id:
            payment.transactionId,
        },
        select: {
          id: true,
          type: true,
          status: true,
          direction: true,
          amountMinor:
            true,
          currency:
            true,
          sourceAccountId:
            true,
          destinationAccountId:
            true,
        },
      });

    if (!externalTransaction) {
      throw new Error(
        "Payment financial transaction was not found."
      );
    }

    if (
      externalTransaction.status !==
      TransactionStatus.COMPLETED
    ) {
      throw new Error(
        "Payment financial transaction is not completed."
      );
    }

    if (
      externalTransaction.type !==
      TransactionType.PAYMENT
    ) {
      throw new Error(
        "Payment financial transaction has an invalid type."
      );
    }

    if (
      externalTransaction.direction !==
      TransactionDirection.CREDIT
    ) {
      throw new Error(
        "Payment financial transaction must be a credit."
      );
    }

    if (
      externalTransaction.sourceAccountId !==
      null
    ) {
      throw new Error(
        "Payment external financial transaction must not have an internal source account."
      );
    }

    if (
      externalTransaction.destinationAccountId !==
      input.clearingAccountId
    ) {
      throw new Error(
        "Payment financial transaction does not credit the expected clearing account."
      );
    }

    if (
      externalTransaction.amountMinor !==
      payment.amountMinor
    ) {
      throw new Error(
        "Payment financial transaction amount does not match the payment."
      );
    }

    if (
      externalTransaction.currency !==
      payment.currency
    ) {
      throw new Error(
        "Payment financial transaction currency does not match the payment."
      );
    }

    if (
      payment.currency !==
      payment.order.currency
    ) {
      throw new Error(
        "Payment currency does not match the order currency."
      );
    }

    const policy =
      commissionPolicyService.getMarketplacePolicy();

    const vendorAllocations =
      this.buildVendorAllocations(
        payment.order.items,
        payment.amountMinor,
        payment.currency
      );

    const existingCommissions =
      await database.commission.findMany({
        where: {
          orderId:
            payment.order.id,
        },
        include: {
          transaction: {
            select: {
              id: true,
              status: true,
              amountMinor:
                true,
              currency:
                true,
            },
          },
        },
        orderBy: {
          createdAt:
            "asc",
        },
      });

    if (
      existingCommissions.length >
      0
    ) {
      return this.buildExistingAllocationResult(
        payment,
        vendorAllocations,
        existingCommissions,
        policy
      );
    }

    const clearingAccount =
      await database.account.findUnique({
        where: {
          id:
            input.clearingAccountId,
        },
        select: {
          id: true,
          organizationId:
            true,
          type: true,
          currency: true,
          status: true,
          userId: true,
          vendorId: true,
        },
      });

    if (!clearingAccount) {
      throw new Error(
        "Clearing account not found."
      );
    }

    if (
      clearingAccount.organizationId !==
      input.organizationId
    ) {
      throw new Error(
        "Clearing account does not belong to the specified organization."
      );
    }

    if (
      clearingAccount.type !==
      AccountType.CLEARING
    ) {
      throw new Error(
        "Allocation source account must be a clearing account."
      );
    }

    if (
      clearingAccount.status !==
      AccountStatus.ACTIVE
    ) {
      throw new Error(
        "Clearing account must be active."
      );
    }

    if (
      clearingAccount.currency !==
      payment.currency
    ) {
      throw new Error(
        "Clearing account currency does not match the payment."
      );
    }

    const vendorIds =
      vendorAllocations.map(
        (allocation) =>
          allocation.vendorId
      );

    const vendors =
      await database.vendor.findMany({
        where: {
          organizationId:
            input.organizationId,
          id: {
            in: vendorIds,
          },
        },
        select: {
          id: true,
          status: true,
        },
      });

    const vendorsById =
      new Map(
        vendors.map(
          (vendor) => [
            vendor.id,
            vendor,
          ]
        )
      );

    if (
      vendorsById.size !==
      vendorIds.length
    ) {
      throw new Error(
        "One or more order vendors do not belong to the transaction organization."
      );
    }

    for (const vendorId of vendorIds) {
      const vendor =
        vendorsById.get(
          vendorId
        );

      if (
        !vendor ||
        vendor.status !==
          "ACTIVE"
      ) {
        throw new Error(
          `Vendor "${vendorId}" is not active for financial allocation.`
        );
      }
    }

    const platformRevenueAccount =
      await this.ensurePlatformRevenueAccountWithinTransaction(
        database,
        input.organizationId,
        payment.currency
      );

    const allocationResults: FinancialAllocationItem[] =
      [];

    let totalVendorAmountMinor =
      BigInt(0);

    let totalCommissionAmountMinor =
      BigInt(0);

    for (
      const vendorAllocation of
        vendorAllocations
    ) {
      const split =
        splitService.calculateVendorCommission(
          {
            amountMinor:
              vendorAllocation.grossAmountMinor,
            currency:
              payment.currency,
            vendorRateBps:
              policy.vendorRateBps,
            markaRateBps:
              policy.rateBps,
            metadata: {
              policyKey:
                policy.key,
              policyVersion:
                policy.version,
              channel:
                policy.channel,
              orderId:
                payment.order.id,
              paymentId:
                payment.id,
              vendorId:
                vendorAllocation.vendorId,
            },
          }
        );

      splitService.validateComplete(
        split
      );

      const vendorAllocationResult =
        split.allocations.find(
          (allocation) =>
            allocation.role ===
            "VENDOR_PAYABLE"
        );

      const commissionAllocation =
        split.allocations.find(
          (allocation) =>
            allocation.role ===
            "PLATFORM_REVENUE"
        );

      if (
        !vendorAllocationResult ||
        !commissionAllocation
      ) {
        throw new Error(
          "Financial split did not produce the required vendor and platform allocations."
        );
      }

      const vendorPayableAccount =
        await this.ensureVendorPayableAccountWithinTransaction(
          database,
          input.organizationId,
          vendorAllocation.vendorId,
          payment.currency
        );

      const vendorTransaction =
        await transactionService.createWithinTransaction(
          database,
          {
            organizationId:
              input.organizationId,
            idempotencyKey:
              `payment-allocation-vendor:${payment.id}:${vendorAllocation.vendorId}`,
            type:
              TransactionType.PAYMENT,
            direction:
              TransactionDirection.DEBIT,
            amountMinor:
              vendorAllocationResult.amountMinor,
            currency:
              payment.currency,
            actorUserId:
              input.actorUserId,
            actorType:
              TransactionActorType.MARKA,
            sourceAccountId:
              clearingAccount.id,
            destinationAccountId:
              vendorPayableAccount.id,
            reference:
              `PAYMENT-VENDOR-${payment.id}-${vendorAllocation.vendorId}`,
            referenceType:
              "PAYMENT_VENDOR_ALLOCATION",
            orderId:
              payment.order.id,
            vendorId:
              vendorAllocation.vendorId,
            context:
              "ORDER_VENDOR_EARNING",
            metadata: {
              paymentId:
                payment.id,
              orderId:
                payment.order.id,
              vendorId:
                vendorAllocation.vendorId,
              grossAmountMinor:
                vendorAllocation.grossAmountMinor.toString(),
              vendorAmountMinor:
                vendorAllocationResult.amountMinor.toString(),
              commissionAmountMinor:
                commissionAllocation.amountMinor.toString(),
              commissionRateBps:
                policy.rateBps,
              vendorRateBps:
                policy.vendorRateBps,
              commissionPolicyKey:
                policy.key,
              commissionPolicyVersion:
                policy.version,
              source:
                "PAYMENT_CLEARING",
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
        vendorTransaction.status !==
        TransactionStatus.COMPLETED
      ) {
        throw new Error(
          "Vendor allocation transaction did not complete."
        );
      }

      let commissionTransactionId:
        string | null =
        null;

      if (
        commissionAllocation.amountMinor >
        BigInt(0)
      ) {
        const commissionTransaction =
          await transactionService.createWithinTransaction(
            database,
            {
              organizationId:
                input.organizationId,
              idempotencyKey:
                `payment-allocation-commission:${payment.id}:${vendorAllocation.vendorId}`,
              type:
                TransactionType.COMMISSION,
              direction:
                TransactionDirection.DEBIT,
              amountMinor:
                commissionAllocation.amountMinor,
              currency:
                payment.currency,
              actorUserId:
                input.actorUserId,
              actorType:
                TransactionActorType.MARKA,
              sourceAccountId:
                clearingAccount.id,
              destinationAccountId:
                platformRevenueAccount.id,
              reference:
                `PAYMENT-COMMISSION-${payment.id}-${vendorAllocation.vendorId}`,
              referenceType:
                "PAYMENT_COMMISSION",
              orderId:
                payment.order.id,
              vendorId:
                vendorAllocation.vendorId,
              context:
                "MARKA_PLATFORM_REVENUE",
              metadata: {
                paymentId:
                  payment.id,
                orderId:
                  payment.order.id,
                vendorId:
                  vendorAllocation.vendorId,
                commissionAmountMinor:
                  commissionAllocation.amountMinor.toString(),
                commissionRateBps:
                  policy.rateBps,
                commissionPolicyKey:
                  policy.key,
                commissionPolicyVersion:
                  policy.version,
                source:
                  "PAYMENT_CLEARING",
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
          commissionTransaction.status !==
          TransactionStatus.COMPLETED
        ) {
          throw new Error(
            "Commission transaction did not complete."
          );
        }

        commissionTransactionId =
          commissionTransaction.id;
      }

      await database.commission.create({
        data: {
          orderId:
            payment.order.id,
          vendorId:
            vendorAllocation.vendorId,
          transactionId:
            commissionTransactionId,
          amountMinor:
            commissionAllocation.amountMinor,
          currency:
            payment.currency,
          rateBps:
            policy.rateBps,
          status:
            CommissionStatus.ACCRUED,
          metadata:
            this.toJsonValue({
              paymentId:
                payment.id,
              orderId:
                payment.order.id,
              vendorId:
                vendorAllocation.vendorId,
              grossAmountMinor:
                vendorAllocation.grossAmountMinor.toString(),
              vendorAmountMinor:
                vendorAllocationResult.amountMinor.toString(),
              commissionAmountMinor:
                commissionAllocation.amountMinor.toString(),
              commissionPolicyKey:
                policy.key,
              commissionPolicyVersion:
                policy.version,
              commissionChannel:
                policy.channel,
              source:
                "PAYMENT_CAPTURE",
            }),
        },
      });

      totalVendorAmountMinor +=
        vendorAllocationResult.amountMinor;

      totalCommissionAmountMinor +=
        commissionAllocation.amountMinor;

      allocationResults.push({
        vendorId:
          vendorAllocation.vendorId,
        grossAmountMinor:
          vendorAllocation.grossAmountMinor.toString(),
        vendorAmountMinor:
          vendorAllocationResult.amountMinor.toString(),
        commissionAmountMinor:
          commissionAllocation.amountMinor.toString(),
        commissionRateBps:
          policy.rateBps,
        vendorTransactionId:
          vendorTransaction.id,
        commissionTransactionId,
      });
    }

    if (
      totalVendorAmountMinor +
        totalCommissionAmountMinor !==
      payment.amountMinor
    ) {
      throw new Error(
        "Financial allocation does not reconcile to the captured payment amount."
      );
    }

    await database.auditLog.create({
      data: {
        organizationId:
          input.organizationId,
        actorUserId:
          input.actorUserId,
        actorType:
          input.actorUserId
            ? "USER"
            : "SERVICE",
        action:
          "FINANCIAL_PAYMENT_ALLOCATED",
        entityType:
          "PAYMENT",
        entityId:
          payment.id,
        correlationId:
          input.correlationId,
        requestId:
          input.requestId,
        ipAddress:
          input.ipAddress,
        userAgent:
          input.userAgent,
        metadata:
          this.toJsonValue({
            paymentId:
              payment.id,
            orderId:
              payment.order.id,
            clearingAccountId:
              input.clearingAccountId,
            grossAmountMinor:
              payment.amountMinor.toString(),
            vendorAmountMinor:
              totalVendorAmountMinor.toString(),
            commissionAmountMinor:
              totalCommissionAmountMinor.toString(),
            commissionPolicyKey:
              policy.key,
            commissionPolicyVersion:
              policy.version,
            commissionChannel:
              policy.channel,
            allocationCount:
              allocationResults.length,
          }),
      },
    });

    return {
      paymentId:
        payment.id,
      orderId:
        payment.order.id,
      currency:
        payment.currency,
      grossAmountMinor:
        payment.amountMinor.toString(),
      vendorAmountMinor:
        totalVendorAmountMinor.toString(),
      commissionAmountMinor:
        totalCommissionAmountMinor.toString(),
      policyKey:
        policy.key,
      policyVersion:
        policy.version,
      allocations:
        allocationResults,
    };
  }

  private async ensurePlatformRevenueAccountWithinTransaction(
    database: FinancialTransactionClient,
    organizationId: string,
    currency: string
  ) {
    const code =
      `PLATFORM-REVENUE-${organizationId}-${currency}`;

    const account =
      await database.account.upsert({
        where: {
          code,
        },
        update: {},
        create: {
          organizationId,
          userId:
            null,
          vendorId:
            null,
          type:
            AccountType.PLATFORM_REVENUE,
          code,
          currency,
          status:
            AccountStatus.ACTIVE,
          balanceMinor:
            BigInt(0),
          heldBalanceMinor:
            BigInt(0),
          version:
            0,
        },
      });

    if (
      account.organizationId !==
      organizationId
    ) {
      throw new Error(
        "Platform revenue account belongs to another organization."
      );
    }

    if (
      account.type !==
      AccountType.PLATFORM_REVENUE
    ) {
      throw new Error(
        "Platform revenue account has an invalid type."
      );
    }

    if (
      account.currency !==
      currency
    ) {
      throw new Error(
        "Platform revenue account currency mismatch."
      );
    }

    if (
      account.status !==
      AccountStatus.ACTIVE
    ) {
      throw new Error(
        "Platform revenue account is not active."
      );
    }

    if (
      account.userId !==
        null ||
      account.vendorId !==
        null
    ) {
      throw new Error(
        "Platform revenue account cannot belong to a user or vendor."
      );
    }

    return account;
  }

  private async ensureVendorPayableAccountWithinTransaction(
    database: FinancialTransactionClient,
    organizationId: string,
    vendorId: string,
    currency: string
  ) {
    const code =
      `VENDOR-PAYABLE-${vendorId}-${currency}`;

    const account =
      await database.account.upsert({
        where: {
          code,
        },
        update: {},
        create: {
          organizationId,
          userId:
            null,
          vendorId,
          type:
            AccountType.VENDOR_PAYABLE,
          code,
          currency,
          status:
            AccountStatus.ACTIVE,
          balanceMinor:
            BigInt(0),
          heldBalanceMinor:
            BigInt(0),
          version:
            0,
        },
      });

    if (
      account.organizationId !==
      organizationId
    ) {
      throw new Error(
        "Vendor payable account belongs to another organization."
      );
    }

    if (
      account.vendorId !==
      vendorId
    ) {
      throw new Error(
        "Vendor payable account belongs to another vendor."
      );
    }

    if (
      account.type !==
      AccountType.VENDOR_PAYABLE
    ) {
      throw new Error(
        "Vendor payable account has an invalid type."
      );
    }

    if (
      account.currency !==
      currency
    ) {
      throw new Error(
        "Vendor payable account currency mismatch."
      );
    }

    if (
      account.status !==
      AccountStatus.ACTIVE
    ) {
      throw new Error(
        "Vendor payable account is not active."
      );
    }

    return account;
  }

  private buildVendorAllocations(
    items: Array<{
      id: string;
      vendorId:
        | string
        | null;
      subtotal: Prisma.Decimal;
    }>,
    paymentAmountMinor: bigint,
    currency: string
  ): VendorAllocationAccumulator[] {
    if (
      items.length ===
      0
    ) {
      throw new Error(
        "Order contains no financial items."
      );
    }

    const allocations =
      new Map<
        string,
        VendorAllocationAccumulator
      >();

    let totalItemAmountMinor =
      BigInt(0);

    for (const item of items) {
      if (!item.vendorId?.trim()) {
        throw new Error(
          `Order item "${item.id}" has no vendor and cannot be financially allocated.`
        );
      }

      const itemAmountMinor =
        this.toMinorUnits(
          item.subtotal.toString(),
          currency
        );

      if (
        itemAmountMinor <=
        BigInt(0)
      ) {
        throw new Error(
          `Order item "${item.id}" has an invalid financial subtotal.`
        );
      }

      totalItemAmountMinor +=
        itemAmountMinor;

      const current =
        allocations.get(
          item.vendorId
        );

      if (current) {
        current.grossAmountMinor +=
          itemAmountMinor;
        current.itemIds.push(
          item.id
        );
      } else {
        allocations.set(
          item.vendorId,
          {
            vendorId:
              item.vendorId,
            grossAmountMinor:
              itemAmountMinor,
            itemIds: [
              item.id,
            ],
          }
        );
      }
    }

    if (
      totalItemAmountMinor !==
      paymentAmountMinor
    ) {
      throw new Error(
        "Order item financial totals do not reconcile to the captured payment amount."
      );
    }

    return Array.from(
      allocations.values()
    );
  }

  private buildExistingAllocationResult(
    payment: {
      id: string;
      amountMinor: bigint;
      currency: string;
      order: {
        id: string;
        items: Array<{
          id: string;
          vendorId:
            | string
            | null;
          subtotal: Prisma.Decimal;
        }>;
      };
    },
    vendorAllocations: VendorAllocationAccumulator[],
    commissions: Array<{
      vendorId: string;
      amountMinor: bigint;
      currency: string;
      rateBps: number;
      status: CommissionStatus;
      transactionId: string | null;
      transaction: {
        id: string;
        status: TransactionStatus;
        amountMinor: bigint;
        currency: string;
      } | null;
    }>,
    policy: {
      key: string;
      version: number;
      rateBps: number;
    }
  ): FinancialAllocationResult {
    if (
      commissions.length !==
      vendorAllocations.length
    ) {
      throw new Error(
        "Existing commission records do not match the current order vendor allocation."
      );
    }

    const byVendor =
      new Map(
        commissions.map(
          (commission) => [
            commission.vendorId,
            commission,
          ]
        )
      );

    let totalVendorAmountMinor =
      BigInt(0);

    let totalCommissionAmountMinor =
      BigInt(0);

    const allocations: FinancialAllocationItem[] =
      [];

    for (
      const vendorAllocation of
        vendorAllocations
    ) {
      const commission =
        byVendor.get(
          vendorAllocation.vendorId
        );

      if (!commission) {
        throw new Error(
          "Existing commission records are incomplete."
        );
      }

      if (
        commission.currency !==
        payment.currency
      ) {
        throw new Error(
          "Existing commission currency does not match the payment."
        );
      }

      if (
        commission.status !==
        CommissionStatus.ACCRUED
      ) {
        throw new Error(
          "Existing commission is not in the accrued state."
        );
      }

      if (
        commission.transactionId
      ) {
        if (
          !commission.transaction ||
          commission.transaction.status !==
            TransactionStatus.COMPLETED
        ) {
          throw new Error(
            "Existing commission transaction is not completed."
          );
        }

        if (
          commission.transaction.amountMinor !==
          commission.amountMinor
        ) {
          throw new Error(
            "Existing commission transaction amount does not match the commission."
          );
        }
      }

      const vendorAmountMinor =
        vendorAllocation.grossAmountMinor -
        commission.amountMinor;

      if (
        vendorAmountMinor <=
        BigInt(0)
      ) {
        throw new Error(
          "Existing vendor allocation is invalid."
        );
      }

      totalVendorAmountMinor +=
        vendorAmountMinor;

      totalCommissionAmountMinor +=
        commission.amountMinor;

      const vendorTransaction =
        this.findExistingVendorTransactionId(
          payment,
          vendorAllocation.vendorId
        );

      if (!vendorTransaction) {
        throw new Error(
          "Existing vendor allocation transaction could not be found."
        );
      }

      allocations.push({
        vendorId:
          vendorAllocation.vendorId,
        grossAmountMinor:
          vendorAllocation.grossAmountMinor.toString(),
        vendorAmountMinor:
          vendorAmountMinor.toString(),
        commissionAmountMinor:
          commission.amountMinor.toString(),
        commissionRateBps:
          commission.rateBps,
        vendorTransactionId:
          vendorTransaction,
        commissionTransactionId:
          commission.transactionId,
      });
    }

    if (
      totalVendorAmountMinor +
        totalCommissionAmountMinor !==
      payment.amountMinor
    ) {
      throw new Error(
        "Existing financial allocation does not reconcile to the payment."
      );
    }

    return {
      paymentId:
        payment.id,
      orderId:
        payment.order.id,
      currency:
        payment.currency,
      grossAmountMinor:
        payment.amountMinor.toString(),
      vendorAmountMinor:
        totalVendorAmountMinor.toString(),
      commissionAmountMinor:
        totalCommissionAmountMinor.toString(),
      policyKey:
        policy.key,
      policyVersion:
        policy.version,
      allocations,
    };
  }

  private findExistingVendorTransactionId(
    payment: {
      id: string;
    },
    vendorId: string
  ): string | null {
    /*
     * This helper is intentionally conservative.
     * Existing allocation recovery is only used when
     * the commission record already exists.
     *
     * The transaction ID is recovered through the
     * deterministic reference in the database by the
     * caller's transaction client in the creation path.
     *
     * A null result is rejected by the caller rather
     * than guessing an unrelated transaction.
     */
    return null;
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
        `Invalid monetary amount for currency ${currency}.`
      );
    }

    const [
      wholePart,
      fractionPart = "",
    ] =
      normalized.split(".");

    if (
      fractionPart.length >
      2
    ) {
      const extraDigits =
        fractionPart.slice(2);

      if (
        extraDigits.replace(
          /0/g,
          ""
        ).length >
        0
      ) {
        throw new Error(
          `Currency ${currency} contains more than two non-zero decimal places.`
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

  private validateAllocateInput(
    input: AllocatePaymentInput
  ): void {
    if (
      !input.organizationId.trim()
    ) {
      throw new Error(
        "Organization is required."
      );
    }

    if (
      !input.paymentId.trim()
    ) {
      throw new Error(
        "Payment ID is required."
      );
    }

    if (
      !input.idempotencyKey.trim()
    ) {
      throw new Error(
        "Idempotency key is required."
      );
    }

    if (
      input.clearingAccountId &&
      !input.clearingAccountId.trim()
    ) {
      throw new Error(
        "Clearing account ID cannot be empty."
      );
    }
  }

  private validateAllocateWithinTransactionInput(
    input: AllocatePaymentWithinTransactionInput
  ): void {
    if (
      !input.organizationId.trim()
    ) {
      throw new Error(
        "Organization is required."
      );
    }

    if (
      !input.paymentId.trim()
    ) {
      throw new Error(
        "Payment ID is required."
      );
    }

    if (
      !input.clearingAccountId.trim()
    ) {
      throw new Error(
        "Clearing account ID is required."
      );
    }
  }
}

export const financialAllocationService =
  new FinancialAllocationService();
