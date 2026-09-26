import { prisma } from "@/database/client/prisma";

import {
  PaymentService,
  type PaymentResult,
} from "@/services/payments/payment.service";

export interface CheckoutResult {
  orderId: string;
  userId: string;
  currency: string;
  subtotal: number;
  total: number;
  status: string;
  payment: PaymentResult;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
}

export interface CheckoutInput {
  userId: string;
  cartId: string;
  paymentIdempotencyKey: string;
  provider?: string;
  metadata?: Record<string, unknown>;
  correlationId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class CheckoutService {
  private readonly paymentService = new PaymentService();

  async checkout(
    input: CheckoutInput,
  ): Promise<CheckoutResult> {
    const userId = input.userId.trim();
    const cartId = input.cartId.trim();
    const paymentIdempotencyKey =
      input.paymentIdempotencyKey.trim();

    if (!userId) {
      throw new Error("User is required.");
    }

    if (!cartId) {
      throw new Error("Cart is required.");
    }

    if (!paymentIdempotencyKey) {
      throw new Error(
        "Payment idempotency key is required.",
      );
    }

    const cart = await prisma.cart.findFirst({
      where: {
        id: cartId,
        userId,
        status: "ACTIVE",
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                store: {
                  include: {
                    vendor: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      throw new Error("Active cart not found.");
    }

    if (cart.items.length === 0) {
      throw new Error("Cart is empty.");
    }

    const preparedItems = cart.items.map((item) => {
      if (item.quantity <= 0) {
        throw new Error(
          "Cart contains an invalid quantity.",
        );
      }

      if (item.product.status !== "ACTIVE") {
        throw new Error(
          `Product "${item.product.name}" is not available.`,
        );
      }

      if (item.product.stock < item.quantity) {
        throw new Error(
          `Insufficient stock for product "${item.product.name}".`,
        );
      }

      const unitPrice = Number(item.product.price);

      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new Error(
          `Product "${item.product.name}" has an invalid price.`,
        );
      }

      const subtotal = unitPrice * item.quantity;

      return {
        productId: item.productId,
        storeId: item.product.storeId,
        vendorId: item.product.store.vendorId,
        quantity: item.quantity,
        unitPrice,
        subtotal,
      };
    });

    const subtotal = preparedItems.reduce(
      (sum, item) => sum + item.subtotal,
      0,
    );

    const order = await prisma.$transaction(
      async (database) => {
        const createdOrder = await database.order.create({
          data: {
            userId,
            status: "PENDING",
            total: subtotal,
            currency: cart.currency,
            items: {
              create: preparedItems.map((item) => ({
                productId: item.productId,
                storeId: item.storeId,
                vendorId: item.vendorId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                subtotal: item.subtotal,
              })),
            },
          },
          include: {
            items: true,
          },
        });

        for (const item of preparedItems) {
          const updated = await database.product.updateMany({
            where: {
              id: item.productId,
              status: "ACTIVE",
              stock: {
                gte: item.quantity,
              },
            },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });

          if (updated.count !== 1) {
            throw new Error(
              `Stock changed while checking out product "${item.productId}".`,
            );
          }
        }

        await database.cart.update({
          where: {
            id: cartId,
          },
          data: {
            status: "CHECKED_OUT",
          },
        });

        return createdOrder;
      },
    );

    /*
     * Checkout creates the commercial order first.
     *
     * PaymentService then creates the payment intent
     * using the existing Financial Core payment model.
     *
     * No financial transaction is recognized here.
     * Funds enter the Financial Core only when the payment
     * provider is successfully confirmed.
     */
    let payment: PaymentResult;

    try {
      payment = await this.paymentService.createPayment({
        userId,
        orderId: order.id,
        idempotencyKey: paymentIdempotencyKey,
        provider: input.provider,
        metadata: {
          ...(input.metadata ?? {}),
          checkout: {
            cartId,
            orderId: order.id,
          },
        },
        correlationId: input.correlationId,
        requestId: input.requestId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      });
    } catch (error) {
      /*
       * The order intentionally remains PENDING.
       *
       * This is recoverable through the existing payment
       * API and avoids inventing a second financial engine.
       */
      console.error(
        "[CHECKOUT_PAYMENT_INTENT_ERROR]",
        {
          orderId: order.id,
          userId,
          error,
        },
      );

      throw new Error(
        `Order ${order.id} was created, but the payment intent could not be created.`,
      );
    }

    return {
      orderId: order.id,
      userId,
      currency: cart.currency,
      subtotal,
      total: Number(order.total),
      status: order.status,
      payment,
      items: order.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        subtotal: Number(item.subtotal),
      })),
    };
  }
}

export const checkoutService = new CheckoutService();
