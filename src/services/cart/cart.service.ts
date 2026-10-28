import { prisma } from "@/database/client/prisma";

export class CartService {
  async getCart(userId: string, storeId?: string) {
    const carts = await prisma.cart.findMany({
      where: { userId, status: "ACTIVE" },
      include: {
        items: {
          include: {
            product: {
              include: { store: true },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // A store-specific cart is selected by its products, so no schema
    // migration is required and existing financial/cart relations remain intact.
    let cart = storeId
      ? carts.find((candidate) =>
          candidate.items.length > 0 &&
          candidate.items.every((item) => item.product.storeId === storeId)
        )
      : carts.find((candidate) => candidate.items.length > 0);

    if (!cart && storeId) {
      cart = carts.find((candidate) => candidate.items.length === 0);
    }

    if (!cart && !storeId) {
      cart = carts.find((candidate) => candidate.items.length === 0);
    }

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              product: {
                include: { store: true },
              },
            },
          },
        },
      });
    }

    return cart;
  }

  async addItem(userId: string, productId: string, quantity: number) {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error("Invalid quantity.");
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, status: true, stock: true, storeId: true },
    });

    if (!product) throw new Error("Product not found.");
    if (product.status !== "ACTIVE") throw new Error("Product unavailable.");

    const cart = await this.getCart(userId, product.storeId);
    const existingItem = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId },
    });
    const requestedQuantity = existingItem
      ? existingItem.quantity + quantity
      : quantity;

    if (requestedQuantity > product.stock) {
      throw new Error("Insufficient stock.");
    }

    if (existingItem) {
      return prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: requestedQuantity },
      });
    }

    return prisma.cartItem.create({
      data: { cartId: cart.id, productId, quantity },
    });
  }

  async updateItem(userId: string, itemId: string, quantity: number) {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error("Invalid quantity.");
    }

    const item = await prisma.cartItem.findFirst({
      where: { id: itemId, cart: { userId, status: "ACTIVE" } },
      include: {
        product: { select: { id: true, status: true, stock: true } },
      },
    });

    if (!item) throw new Error("Cart item not found.");
    if (item.product.status !== "ACTIVE") throw new Error("Product unavailable.");
    if (quantity > item.product.stock) throw new Error("Insufficient stock.");

    return prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity },
    });
  }

  async removeItem(userId: string, itemId: string) {
    const item = await prisma.cartItem.findFirst({
      where: { id: itemId, cart: { userId, status: "ACTIVE" } },
      select: { id: true },
    });

    if (!item) throw new Error("Cart item not found.");

    return prisma.cartItem.delete({ where: { id: item.id } });
  }
}
