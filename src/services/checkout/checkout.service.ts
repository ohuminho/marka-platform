import { prisma } from "@/database/client/prisma";

export interface CheckoutResult {
  orderId: string;
  userId: string;
  currency: string;
  subtotal: number;
  total: number;
  status: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
}

export class CheckoutService {
  async checkout(
    userId: string,
    cartId: string,
  ): Promise<CheckoutResult> {
    if (!userId.trim()) {
      throw new Error("User is required.");
    }

    if (!cartId.trim()) {
      throw new Error("Cart is required.");
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
        throw new Error("Cart contains an invalid quantity.");
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

    const order = await prisma.$transaction(async (database) => {
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
    });

    return {
      orderId: order.id,
      userId,
      currency: cart.currency,
      subtotal,
      total: Number(order.total),
      status: order.status,
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
