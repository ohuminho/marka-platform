import {
  AccountStatus,
  AccountType,
  Prisma,
  TransactionActorType,
  TransactionDirection,
  TransactionStatus,
  TransactionType,
} from "@prisma/client";

import { prisma } from "@/database/client/prisma";

import {
  transactionService,
  type FinancialTransactionClient,
} from "@/services/transactions/transaction.service";

export interface SettleDigitalMobilityRideInput {
  organizationId: string;
  settlementId: string;
  paymentId: string;
  rideId: string;
  driverId: string;
  currency: string;

  grossFareMinor: bigint;
  availableDigitalProceedsMinor: bigint;
  currentCommissionMinor: bigint;
  priorCashObligationsSettledMinor: bigint;
  driverNetMinor: bigint;

  sourceReference: string;

  actorUserId?: string;
  correlationId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface MobilityFinancialCoreBridgeResult {
  financialTransactionId: string;
  vendorPayableTransactionId: string | null;
  commissionTransactionId: string | null;
  cashObligationSettlementTransactionId: string | null;
}

interface MobilitySettlementFinancialLinks {
  id: string;
  organizationId: string;
  paymentId: string;
  rideId: string;
  driverId: string | null;
  currency: string;
  paymentMethod: string;
  financialTransactionId: string | null;
  vendorPayableTransactionId: string | null;
  commissionTransactionId: string | null;
  cashObligationSettlementTransactionId: string | null;
}

export class MobilityFinancialCoreBridgeService {
  async settleDigitalRide(
    input: SettleDigitalMobilityRideInput,
  ): Promise<MobilityFinancialCoreBridgeResult> {
    this.validateInput(input);

    return prisma.$transaction(
      async (database) =>
        this.settleDigitalRideWithinTransaction(
          database,
          input,
        ),
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      },
    );
  }

  private async settleDigitalRideWithinTransaction(
    database: FinancialTransactionClient,
    input: SettleDigitalMobilityRideInput,
  ): Promise<MobilityFinancialCoreBridgeResult> {
    const settlement =
      await this.findSettlement(
        database,
        input.settlementId,
      );

    if (!settlement) {
      throw new Error(
        "Mobility settlement was not found for Financial Core integration.",
      );
    }

    this.assertSettlement(
      input,
      settlement,
    );

    const existing =
      this.getExistingLinks(
        settlement,
      );

    if (existing) {
      return existing;
    }

    const driver =
      await database.mobilityDriver.findUnique({
        where: {
          id:
            input.driverId,
        },

        select: {
          id: true,
          userId: true,
          organizationId: true,
          status: true,
        },
      });

    if (!driver) {
      throw new Error(
        "Mobility driver was not found.",
      );
    }

    if (
      driver.organizationId !==
      input.organizationId
    ) {
      throw new Error(
        "Mobility driver does not belong to the settlement organization.",
      );
    }

    if (
      driver.status !==
      "ACTIVE"
    ) {
      throw new Error(
        "Mobility driver must be active for Financial Core settlement.",
      );
    }

    const allocatedAmount =
      input.driverNetMinor +
      input.currentCommissionMinor +
      input.priorCashObligationsSettledMinor;

    if (
      allocatedAmount !==
      input.availableDigitalProceedsMinor
    ) {
      throw new Error(
        "Mobility Financial Core allocations do not reconcile to digital proceeds.",
      );
    }

    const clearingAccount =
      await this.ensureClearingAccount(
        database,
        input.organizationId,
        input.currency,
      );

    const platformRevenueAccount =
      await this.ensurePlatformRevenueAccount(
        database,
        input.organizationId,
        input.currency,
      );

    const driverPayableAccount =
      await this.ensureDriverPayableAccount(
        database,
        input.organizationId,
        input.driverId,
        driver.userId,
        input.currency,
      );

    /*
     * The MobilityPayment id is intentionally NOT passed
     * as transactionService.paymentId.
     *
     * MobilityRidePayment is a separate SQL-level mobility
     * payment entity and is not the Financial Core Payment
     * entity. Passing its id as paymentId would make the
     * Financial Core incorrectly search for a Payment row.
     */
    const financialTransaction =
      await transactionService.createExternalCreditWithinTransaction(
        database,
        {
          organizationId:
            input.organizationId,

          idempotencyKey:
            `mobility-digital-capture:${input.settlementId}`,

          type:
            TransactionType.PAYMENT,

          amountMinor:
            input.availableDigitalProceedsMinor,

          currency:
            input.currency,

          destinationAccountId:
            clearingAccount.id,

          actorUserId:
            input.actorUserId,

          actorType:
            TransactionActorType.MARKA,

          reference:
            `MOBILITY-DIGITAL-CAPTURE-${input.settlementId}`,

          referenceType:
            "MOBILITY_DIGITAL_PAYMENT",

          context:
            "MOBILITY_DIGITAL_PAYMENT_CAPTURE",

          provider:
            "MARKA_MOBILITY",

          providerPaymentId:
            input.paymentId,

          metadata: {
            settlementId:
              input.settlementId,

            mobilityPaymentId:
              input.paymentId,

            rideId:
              input.rideId,

            driverId:
              input.driverId,

            grossFareMinor:
              input.grossFareMinor.toString(),

            availableDigitalProceedsMinor:
              input.availableDigitalProceedsMinor.toString(),

            sourceReference:
              input.sourceReference,

            source:
              "MOBILITY_FINANCIAL_CORE_BRIDGE",
          },

          correlationId:
            input.correlationId,

          requestId:
            input.requestId,

          ipAddress:
            input.ipAddress,

          userAgent:
            input.userAgent,
        },
      );

    this.assertCompleted(
      financialTransaction.status,
      "Mobility digital payment capture",
    );

    let commissionTransactionId:
      string | null = null;

    if (
      input.currentCommissionMinor >
      BigInt(0)
    ) {
      const transaction =
        await transactionService.createWithinTransaction(
          database,
          {
            organizationId:
              input.organizationId,

            idempotencyKey:
              `mobility-commission:${input.settlementId}`,

            type:
              TransactionType.COMMISSION,

            direction:
              TransactionDirection.DEBIT,

            amountMinor:
              input.currentCommissionMinor,

            currency:
              input.currency,

            actorUserId:
              input.actorUserId,

            actorType:
              TransactionActorType.MARKA,

            sourceAccountId:
              clearingAccount.id,

            destinationAccountId:
              platformRevenueAccount.id,

            reference:
              `MOBILITY-COMMISSION-${input.settlementId}`,

            referenceType:
              "MOBILITY_COMMISSION",

            context:
              "MOBILITY_CURRENT_COMMISSION",

            metadata: {
              settlementId:
                input.settlementId,

              paymentId:
                input.paymentId,

              rideId:
                input.rideId,

              driverId:
                input.driverId,

              commissionAmountMinor:
                input.currentCommissionMinor.toString(),

              source:
                "MOBILITY_FINANCIAL_CORE_BRIDGE",
            },

            correlationId:
              input.correlationId,

            requestId:
              input.requestId,

            ipAddress:
              input.ipAddress,

            userAgent:
              input.userAgent,
          },
        );

      this.assertCompleted(
        transaction.status,
        "Mobility commission transaction",
      );

      commissionTransactionId =
        transaction.id;
    }

    let cashObligationSettlementTransactionId:
      string | null = null;

    if (
      input.priorCashObligationsSettledMinor >
      BigInt(0)
    ) {
      const transaction =
        await transactionService.createWithinTransaction(
          database,
          {
            organizationId:
              input.organizationId,

            idempotencyKey:
              `mobility-cash-obligation-settlement:${input.settlementId}`,

            type:
              TransactionType.COMMISSION,

            direction:
              TransactionDirection.DEBIT,

            amountMinor:
              input.priorCashObligationsSettledMinor,

            currency:
              input.currency,

            actorUserId:
              input.actorUserId,

            actorType:
              TransactionActorType.MARKA,

            sourceAccountId:
              clearingAccount.id,

            destinationAccountId:
              platformRevenueAccount.id,

            reference:
              `MOBILITY-CASH-OBLIGATION-SETTLEMENT-${input.settlementId}`,

            referenceType:
              "MOBILITY_CASH_OBLIGATION_SETTLEMENT",

            context:
              "MOBILITY_PRIOR_CASH_OBLIGATION_SETTLEMENT",

            metadata: {
              settlementId:
                input.settlementId,

              paymentId:
                input.paymentId,

              rideId:
                input.rideId,

              driverId:
                input.driverId,

              amountMinor:
                input.priorCashObligationsSettledMinor.toString(),

              source:
                "MOBILITY_FINANCIAL_CORE_BRIDGE",
            },

            correlationId:
              input.correlationId,

            requestId:
              input.requestId,

            ipAddress:
              input.ipAddress,

            userAgent:
              input.userAgent,
          },
        );

      this.assertCompleted(
        transaction.status,
        "Mobility cash obligation settlement transaction",
      );

      cashObligationSettlementTransactionId =
        transaction.id;
    }

    let vendorPayableTransactionId:
      string | null = null;

    if (
      input.driverNetMinor >
      BigInt(0)
    ) {
      const transaction =
        await transactionService.createWithinTransaction(
          database,
          {
            organizationId:
              input.organizationId,

            idempotencyKey:
              `mobility-driver-payable:${input.settlementId}`,

            type:
              TransactionType.PAYMENT,

            direction:
              TransactionDirection.DEBIT,

            amountMinor:
              input.driverNetMinor,

            currency:
              input.currency,

            actorUserId:
              input.actorUserId,

            actorType:
              TransactionActorType.MARKA,

            sourceAccountId:
              clearingAccount.id,

            destinationAccountId:
              driverPayableAccount.id,

            reference:
              `MOBILITY-DRIVER-PAYABLE-${input.settlementId}`,

            referenceType:
              "MOBILITY_DRIVER_PAYABLE",

            context:
              "MOBILITY_DRIVER_EARNING",

            metadata: {
              settlementId:
                input.settlementId,

              paymentId:
                input.paymentId,

              rideId:
                input.rideId,

              driverId:
                input.driverId,

              driverNetMinor:
                input.driverNetMinor.toString(),

              source:
                "MOBILITY_FINANCIAL_CORE_BRIDGE",
            },

            correlationId:
              input.correlationId,

            requestId:
              input.requestId,

            ipAddress:
              input.ipAddress,

            userAgent:
              input.userAgent,
          },
        );

      this.assertCompleted(
        transaction.status,
        "Mobility driver payable transaction",
      );

      vendorPayableTransactionId =
        transaction.id;
    }

    return {
      financialTransactionId:
        financialTransaction.id,

      vendorPayableTransactionId,

      commissionTransactionId,

      cashObligationSettlementTransactionId,
    };
  }

  private async findSettlement(
    database: FinancialTransactionClient,
    settlementId: string,
  ): Promise<MobilitySettlementFinancialLinks | null> {
    const rows =
      await database.$queryRaw<
        MobilitySettlementFinancialLinks[]
      >`
        SELECT
          "id",
          "organizationId",
          "paymentId",
          "rideId",
          "driverId",
          "currency",
          "paymentMethod",
          "financialTransactionId",
          "vendorPayableTransactionId",
          "commissionTransactionId",
          "cashObligationSettlementTransactionId"
        FROM "MobilitySettlement"
        WHERE
          "id" =
            ${settlementId}
        LIMIT 1
      `;

    return rows[0] ??
      null;
  }

  private getExistingLinks(
    settlement: MobilitySettlementFinancialLinks,
  ): MobilityFinancialCoreBridgeResult | null {
    if (
      settlement.financialTransactionId &&
      (
        settlement.vendorPayableTransactionId ||
        settlement.commissionTransactionId ||
        settlement.cashObligationSettlementTransactionId
      )
    ) {
      return {
        financialTransactionId:
          settlement.financialTransactionId,

        vendorPayableTransactionId:
          settlement.vendorPayableTransactionId,

        commissionTransactionId:
          settlement.commissionTransactionId,

        cashObligationSettlementTransactionId:
          settlement.cashObligationSettlementTransactionId,
      };
    }

    return null;
  }

  private assertSettlement(
    input: SettleDigitalMobilityRideInput,
    settlement: MobilitySettlementFinancialLinks,
  ): void {
    if (
      settlement.organizationId !==
      input.organizationId
    ) {
      throw new Error(
        "Mobility settlement organization does not match Financial Core integration.",
      );
    }

    if (
      settlement.paymentId !==
      input.paymentId
    ) {
      throw new Error(
        "Mobility settlement payment does not match Financial Core integration.",
      );
    }

    if (
      settlement.rideId !==
      input.rideId
    ) {
      throw new Error(
        "Mobility settlement ride does not match Financial Core integration.",
      );
    }

    if (
      settlement.driverId !==
      input.driverId
    ) {
      throw new Error(
        "Mobility settlement driver does not match Financial Core integration.",
      );
    }

    if (
      settlement.currency !==
      input.currency
    ) {
      throw new Error(
        "Mobility settlement currency does not match Financial Core integration.",
      );
    }

    if (
      settlement.paymentMethod !==
      "DIGITAL"
    ) {
      throw new Error(
        "Financial Core bridge only supports DIGITAL Mobility settlement.",
      );
    }
  }

  private async ensureClearingAccount(
    database: FinancialTransactionClient,
    organizationId: string,
    currency: string,
  ) {
    const code =
      `CLEARING-${organizationId}-${currency}`;

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
            AccountType.CLEARING,
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

    this.assertAccount(
      account,
      organizationId,
      currency,
      AccountType.CLEARING,
    );

    return account;
  }

  private async ensurePlatformRevenueAccount(
    database: FinancialTransactionClient,
    organizationId: string,
    currency: string,
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

    this.assertAccount(
      account,
      organizationId,
      currency,
      AccountType.PLATFORM_REVENUE,
    );

    return account;
  }

  private async ensureDriverPayableAccount(
    database: FinancialTransactionClient,
    organizationId: string,
    driverId: string,
    userId: string,
    currency: string,
  ) {
    const code =
      `MOBILITY-DRIVER-PAYABLE-${driverId}-${currency}`;

    const account =
      await database.account.upsert({
        where: {
          code,
        },

        update: {},

        create: {
          organizationId,
          userId,
          vendorId:
            null,
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
        "Mobility driver payable account belongs to another organization.",
      );
    }

    if (
      account.userId !==
      userId
    ) {
      throw new Error(
        "Mobility driver payable account belongs to another user.",
      );
    }

    if (
      account.vendorId !==
      null
    ) {
      throw new Error(
        "Mobility driver payable account cannot belong to a vendor.",
      );
    }

    this.assertAccount(
      account,
      organizationId,
      currency,
      AccountType.VENDOR_PAYABLE,
    );

    return account;
  }

  private assertAccount(
    account: {
      organizationId: string;
      currency: string;
      type: AccountType;
      status: AccountStatus;
    },
    organizationId: string,
    currency: string,
    type: AccountType,
  ): void {
    if (
      account.organizationId !==
      organizationId
    ) {
      throw new Error(
        "Financial Core account belongs to another organization.",
      );
    }

    if (
      account.currency !==
      currency
    ) {
      throw new Error(
        "Financial Core account currency mismatch.",
      );
    }

    if (
      account.type !==
      type
    ) {
      throw new Error(
        "Financial Core account type mismatch.",
      );
    }

    if (
      account.status !==
      AccountStatus.ACTIVE
    ) {
      throw new Error(
        "Financial Core account is not active.",
      );
    }
  }

  private assertCompleted(
    status: TransactionStatus,
    label: string,
  ): void {
    if (
      status !==
      TransactionStatus.COMPLETED
    ) {
      throw new Error(
        `${label} did not complete in Financial Core.`,
      );
    }
  }

  private validateInput(
    input: SettleDigitalMobilityRideInput,
  ): void {
    const requiredStrings = [
      [
        "organizationId",
        input.organizationId,
      ],
      [
        "settlementId",
        input.settlementId,
      ],
      [
        "paymentId",
        input.paymentId,
      ],
      [
        "rideId",
        input.rideId,
      ],
      [
        "driverId",
        input.driverId,
      ],
      [
        "currency",
        input.currency,
      ],
      [
        "sourceReference",
        input.sourceReference,
      ],
    ] as const;

    for (
      const [name, value] of
      requiredStrings
    ) {
      if (!value.trim()) {
        throw new Error(
          `Mobility ${name} is required.`,
        );
      }
    }

    const amounts = [
      [
        "grossFareMinor",
        input.grossFareMinor,
      ],
      [
        "availableDigitalProceedsMinor",
        input.availableDigitalProceedsMinor,
      ],
      [
        "currentCommissionMinor",
        input.currentCommissionMinor,
      ],
      [
        "priorCashObligationsSettledMinor",
        input.priorCashObligationsSettledMinor,
      ],
      [
        "driverNetMinor",
        input.driverNetMinor,
      ],
    ] as const;

    for (
      const [name, value] of
      amounts
    ) {
      if (
        value <
        BigInt(0)
      ) {
        throw new Error(
          `Mobility ${name} cannot be negative.`,
        );
      }
    }

    if (
      input.currency.length !==
      3
    ) {
      throw new Error(
        "Mobility currency must contain exactly three characters.",
      );
    }
  }
}

export const mobilityFinancialCoreBridgeService =
  new MobilityFinancialCoreBridgeService();
