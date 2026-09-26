import {
  PaymentStatus,
} from "@prisma/client";

import { prisma } from "@/database/client/prisma";

export interface PaymentListItem {
  id: string;
  orderId: string | null;
  transactionId: string | null;
  amountMinor: string;
  currency: string;
  status: PaymentStatus;
  provider: string | null;
  providerPaymentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentListResult {
  items: PaymentListItem[];
  total: number;
  limit: number;
  offset: number;
}

export class PaymentQueryService {
  async listForUser(input: {
    userId: string;
    status?: PaymentStatus;
    limit?: number;
    offset?: number;
  }): Promise<PaymentListResult> {
    const limit = Math.min(
      Math.max(input.limit ?? 20, 1),
      100
    );

    const offset = Math.max(
      input.offset ?? 0,
      0
    );

    const where = {
      order: {
        userId: input.userId,
      },
      ...(input.status
        ? {
            status: input.status,
          }
        : {}),
    };

    const [
      payments,
      total,
    ] = await prisma.$transaction([
      prisma.payment.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip: offset,
        take: limit,
      }),
      prisma.payment.count({
        where,
      }),
    ]);

    return {
      items: payments.map(
        (payment) => ({
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
          createdAt:
            payment.createdAt,
          updatedAt:
            payment.updatedAt,
        })
      ),
      total,
      limit,
      offset,
    };
  }

  async getForUser(input: {
    userId: string;
    paymentId: string;
  }): Promise<PaymentListItem | null> {
    const payment =
      await prisma.payment.findFirst({
        where: {
          id: input.paymentId,
          order: {
            userId: input.userId,
          },
        },
      });

    if (!payment) {
      return null;
    }

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
      createdAt:
        payment.createdAt,
      updatedAt:
        payment.updatedAt,
    };
  }
}

export const paymentQueryService =
  new PaymentQueryService();
