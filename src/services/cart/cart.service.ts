import { prisma } from "@/database/client/prisma";

export class CartService {
  async getCart(userId: string, storeId?: string) {
    // Repair legacy carts that may contain products from several stores.
    // Keep one store in the existing cart and move each other store's items
    // into its own cart, preserving quantities and product rows.
    const legacyCarts = await prisma.cart.findMany({
      where: { userId, status: "ACTIVE" },
      include: { items: { include: { product: { select: { storeId: true } } } } },
    });

    for (const legacyCart of legacyCarts) {
      const groups = new Map<string, string[]>();
      for (const item of legacyCart.items) {
        const key = item.product.storeId ?? "__NO_STORE__";
        const ids = groups.get(key) ?? [];
        ids.push(item.id);
        groups.set(key, ids);
      }

      if (groups.size <= 1) continue;

      let keepExistingCart = true;
      for (const itemIds of groups.values()) {
        if (keepExistingCart) {
          keepExistingCart = false;
          continue;
        }

        await prisma.$transaction(async (database) => {
          const newCart = await database.cart.create({
            data: { userId, currency: legacyCart.currency },
            select: { id: true },
          });
          await database.cartItem.updateMany({
            where: { id: { in: itemIds }, cartId: legacyCart.id },
            data: { cartId: newCart.id },
          });
        });
      }
    }

    const carts = await prisma.cart.findMany({
      where: { userId, status: "ACTIVE" },
      include: {
        items: {
          include: {
            product: { include: { store: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    let cart = storeId
      ? carts.find((candidate) =>
          candidate.items.length > 0 &&
          candidate.items.every((item) => item.product.storeId === storeId)
        )
      : carts.find((candidate) => candidate.items.length > 0);

    if (!cart) cart = carts.find((candidate) => candidate.items.length === 0);

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: {
          items: { include: { product: { include: { store: true } } } },
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

    if (requestedQuantity > product.stock) throw new Error("Insufficient stock.");

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
      include: { product: { select: { id: true, status: true, stock: true } } },
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
