import { prisma } from "@/database/client/prisma";
import { getPaymentProviderConfig } from "@/config/payment-provider.config";
import { ensurePaymentProvidersRegistered } from "@/services/payments/providers/payment-provider.bootstrap";
import { paymentProviderRegistry } from "@/services/payments/providers/payment-provider.registry";
import { notificationService } from "@/automation/notifications/notification.service";

import { inventoryService } from "@/services/inventory/inventory.service";

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
  delivery?: {
    address: string;
    latitude: number;
    longitude: number;
    instructions?: string;
  };
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

    const delivery = input.delivery;

    if (!delivery) {
      throw new Error("Delivery destination is required.");
    }

    if (!delivery.address.trim()) {
      throw new Error("Delivery address is required.");
    }

    if (
      !Number.isFinite(delivery.latitude) ||
      delivery.latitude < -90 ||
      delivery.latitude > 90
    ) {
      throw new Error("Delivery latitude is invalid.");
    }

    if (
      !Number.isFinite(delivery.longitude) ||
      delivery.longitude < -180 ||
      delivery.longitude > 180
    ) {
      throw new Error("Delivery longitude is invalid.");
    }

    // A checkout retry must resolve to the original order/payment before
    // looking up the now-checked-out cart. Otherwise a network retry could
    // create a second commercial order for the same payment idempotency key.
    const existingPayment = await prisma.payment.findUnique({
      where: { idempotencyKey: paymentIdempotencyKey },
      include: {
        order: {
          include: { items: true },
        },
      },
    });

    if (existingPayment) {
      const existingOrder = existingPayment.order;
      const paymentMetadata = existingPayment.metadata as
        | { checkout?: { cartId?: unknown } }
        | null;
      const sameCheckout =
        existingOrder?.userId === userId &&
        paymentMetadata?.checkout?.cartId === cartId &&
        existingOrder.deliveryAddress === delivery.address.trim() &&
        Number(existingOrder.deliveryLatitude) === delivery.latitude &&
        Number(existingOrder.deliveryLongitude) === delivery.longitude &&
        (existingOrder.deliveryInstructions ?? "") === (delivery.instructions?.trim() || "");

      if (!existingOrder || !sameCheckout) {
        throw new Error(
          "Idempotency key is already associated with another checkout or different delivery details.",
        );
      }

      // A completed payment consumes the reservation and clears this flag.
      // Permit retries of that same successful checkout, but never replay a
      // failed/cancelled checkout whose stock reservation has been released.
      if (
        !existingOrder.inventoryReserved &&
        (
          existingPayment.status !== "COMPLETED" ||
          existingOrder.status === "CANCELLED" ||
          existingOrder.status === "REFUNDED"
        )
      ) {
        throw new Error(
          "Idempotency key identifies a checkout requiring payment and inventory reconciliation. Do not create a replacement order.",
        );
      }

      return {
        orderId: existingOrder.id,
        userId,
        currency: existingOrder.currency,
        subtotal: Number(existingOrder.total),
        total: Number(existingOrder.total),
        status: existingOrder.status,
        payment: {
          id: existingPayment.id,
          orderId: existingPayment.orderId,
          transactionId: existingPayment.transactionId,
          amountMinor: existingPayment.amountMinor.toString(),
          currency: existingPayment.currency,
          status: existingPayment.status,
          provider: existingPayment.provider,
          providerPaymentId: existingPayment.providerPaymentId,
          idempotencyKey: existingPayment.idempotencyKey,
          createdAt: existingPayment.createdAt,
          updatedAt: existingPayment.updatedAt,
        },
        items: existingOrder.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          subtotal: Number(item.subtotal),
        })),
      };
    }

    // Never reserve inventory or create an order that cannot be paid.
    // Provider selection is server-owned; a client cannot switch the gateway.
    const paymentProviderConfig = getPaymentProviderConfig();
    if (!paymentProviderConfig.enabled || !paymentProviderConfig.name) {
      throw new Error(
        "Marketplace payment provider is not configured. Checkout is temporarily unavailable.",
      );
    }

    ensurePaymentProvidersRegistered();
    paymentProviderRegistry.get(paymentProviderConfig.name);

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

    const storeIds = new Set(
      cart.items.map((item) => item.product.storeId),
    );

    if (storeIds.size > 1) {
      throw new Error(
        "Cart contains products from multiple stores. Multi-store checkout is not yet supported.",
      );
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
        // Serialize checkout attempts against the same cart. A second request
        // may have read ACTIVE before waiting, so re-check after taking the row lock.
        await database.$queryRaw<Array<{ id: string }>>`
          SELECT "id"
          FROM "Cart"
          WHERE "id" = ${cartId} AND "userId" = ${userId}
          FOR UPDATE
        `;

        const lockedCart = await database.cart.findFirst({
          where: { id: cartId, userId, status: "ACTIVE" },
          select: { id: true },
        });
        if (!lockedCart) {
          throw new Error("Active cart not found.");
        }

        const createdOrder = await database.order.create({
          data: {
            userId,
            status: "PENDING",
            total: subtotal,
            currency: cart.currency,
            deliveryAddress: delivery.address.trim(),
            deliveryLatitude: delivery.latitude,
            deliveryLongitude: delivery.longitude,
            deliveryInstructions: delivery.instructions?.trim() || null,
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

        await inventoryService.reserveWithinTransaction(
          database,
          preparedItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        );

        await database.order.update({
          where: { id: createdOrder.id },
          data: { inventoryReserved: true },
        });

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
        provider: paymentProviderConfig.name,
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

      // A provider may return a terminal failure as a normal response rather
      // than throwing. Route it through the same compensation path.
      if (payment.status === "FAILED" || payment.status === "CANCELLED") {
        throw new Error(
          `Payment provider returned terminal status ${payment.status}.`,
        );
      }
    } catch (error) {
      // A provider timeout can mean that the provider created the payment
      // intent but MARKA did not receive its response. Keep the order and
      // inventory reserved while that outcome is unresolved; releasing stock
      // here could sell the same item twice after a successful external charge.
      const paymentAfterFailure = await prisma.payment.findUnique({
        where: { idempotencyKey: paymentIdempotencyKey },
        select: {
          id: true,
          status: true,
          order: {
            select: {
              status: true,
              inventoryReserved: true,
            },
          },
        },
      });

      const paymentOutcomeUnresolved =
        paymentAfterFailure !== null &&
        ["CREATED", "PENDING", "PROCESSING"].includes(
          paymentAfterFailure.status,
        );

      if (paymentAfterFailure?.status === "COMPLETED") {
        console.error(
          "[CHECKOUT_PAYMENT_COMPLETED_RECONCILIATION_REQUIRED]",
          {
            orderId: order.id,
            paymentId: paymentAfterFailure.id,
            orderStatus: paymentAfterFailure.order?.status ?? null,
            inventoryReserved:
              paymentAfterFailure.order?.inventoryReserved ?? null,
          },
        );

        throw new Error(
          `Payment for order ${order.id} was completed. The order is preserved and requires fulfillment reconciliation. Do not submit a replacement checkout.`,
        );
      }

      if (paymentOutcomeUnresolved) {
        console.error(
          "[CHECKOUT_PAYMENT_OUTCOME_UNRESOLVED]",
          {
            orderId: order.id,
            paymentId: paymentAfterFailure.id,
            paymentStatus: paymentAfterFailure.status,
          },
        );

        throw new Error(
          `Order ${order.id} is preserved with inventory reserved because payment confirmation requires reconciliation. Do not submit a replacement checkout.`,
        );
      }

      try {
        await prisma.$transaction(async (database) => {
          const reservation = await database.order.updateMany({
            where: {
              id: order.id,
              status: "PENDING",
              inventoryReserved: true,
            },
            data: {
              inventoryReserved: false,
              status: "CANCELLED",
            },
          });

          if (reservation.count === 1) {
            await inventoryService.releaseWithinTransaction(
              database,
              preparedItems.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
              })),
            );

            await database.cart.updateMany({
              where: {
                id: cartId,
                status: "CHECKED_OUT",
              },
              data: {
                status: "ACTIVE",
              },
            });
          }
        });
      } catch (rollbackError) {
        console.error(
          "[CHECKOUT_INVENTORY_ROLLBACK_ERROR]",
          {
            orderId: order.id,
            userId,
            error,
            rollbackError,
          },
        );

        throw new Error(
          `Order ${order.id} was created, but payment creation and inventory rollback both failed.`,
        );
      }

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

    let finalOrderStatus = order.status;
    try {
      const persistedOrder = await prisma.order.findUnique({
        where: { id: order.id },
        select: { status: true },
      });
      if (persistedOrder) finalOrderStatus = persistedOrder.status;
    } catch (statusReadError) {
      console.error(
        "[CHECKOUT_FINAL_ORDER_STATUS_READ_ERROR]",
        { orderId: order.id, error: statusReadError },
      );
    }

    // Notifications are best-effort and never change checkout/payment outcome.
    try {
      await notificationService.send({
        userId,
        type: "ORDER_CREATED",
        title: "Pedido registado",
        message: `O teu pedido ${order.id.slice(0, 8).toUpperCase()} foi registado. Podes acompanhar o estado na tua conta MARKA.`,
        data: { orderId: order.id, status: order.status },
      });
    } catch (notificationError) {
      console.error("[CHECKOUT_NOTIFICATION_ERROR]", { orderId: order.id, userId, error: notificationError });
    }
    return {
      orderId: order.id,
      userId,
      currency: cart.currency,
      subtotal,
      total: Number(order.total),
      status: finalOrderStatus,
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
