import { prisma } from "@/database/client/prisma";

export class CartService {
  async getCart(userId: string) {
    let cart = await prisma.cart.findFirst({
      where: {
        userId,
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                store: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          userId,
        },
        include: {
          items: {
            include: {
              product: {
                include: {
                  store: true,
                },
              },
            },
          },
        },
      });
    }

    return cart;
  }

  async addItem(
    userId: string,
    productId: string,
    quantity: number
  ) {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error("Invalid quantity.");
    }

    const product = await prisma.product.findUnique({
      where: {
        id: productId,
      },
      select: {
        id: true,
        status: true,
        stock: true,
      },
    });

    if (!product) {
      throw new Error("Product not found.");
    }

    if (product.status !== "ACTIVE") {
      throw new Error("Product unavailable.");
    }

    const cart = await this.getCart(userId);

    const existingItem =
      await prisma.cartItem.findFirst({
        where: {
          cartId: cart.id,
          productId,
        },
      });

    const requestedQuantity =
      existingItem
        ? existingItem.quantity + quantity
        : quantity;

    if (requestedQuantity > product.stock) {
      throw new Error("Insufficient stock.");
    }

    if (existingItem) {
      return prisma.cartItem.update({
        where: {
          id: existingItem.id,
        },
        data: {
          quantity: requestedQuantity,
        },
      });
    }

    return prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId,
        quantity,
      },
    });
  }

  async updateItem(
    userId: string,
    itemId: string,
    quantity: number
  ) {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error("Invalid quantity.");
    }

    const item =
      await prisma.cartItem.findFirst({
        where: {
          id: itemId,
          cart: {
            userId,
          },
        },
        include: {
          product: {
            select: {
              id: true,
              status: true,
              stock: true,
            },
          },
        },
      });

    if (!item) {
      throw new Error("Cart item not found.");
    }

    if (item.product.status !== "ACTIVE") {
      throw new Error("Product unavailable.");
    }

    if (quantity > item.product.stock) {
      throw new Error("Insufficient stock.");
    }

    return prisma.cartItem.update({
      where: {
        id: item.id,
      },
      data: {
        quantity,
      },
    });
  }

  async removeItem(
    userId: string,
    itemId: string
  ) {
    const item =
      await prisma.cartItem.findFirst({
        where: {
          id: itemId,
          cart: {
            userId,
          },
        },
        select: {
          id: true,
        },
      });

    if (!item) {
      throw new Error("Cart item not found.");
    }

    return prisma.cartItem.delete({
      where: {
        id: item.id,
      },
    });
  }
}
