import type { Prisma } from "@prisma/client";

export interface InventoryReservationItem {
  productId: string;
  quantity: number;
}

export class InventoryService {
  async reserveWithinTransaction(
    database: Prisma.TransactionClient,
    items: InventoryReservationItem[],
  ): Promise<void> {
    for (const item of items) {
      if (!item.productId.trim()) {
        throw new Error("Inventory product id is required.");
      }

      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new Error("Inventory reservation quantity is invalid.");
      }

      const product = await database.product.findUnique({
        where: { id: item.productId },
        select: {
          id: true,
          stock: true,
          status: true,
        },
      });

      if (!product || product.status !== "ACTIVE") {
        throw new Error(
          `Product "${item.productId}" is not available for inventory reservation.`,
        );
      }

      if (product.stock < item.quantity) {
        throw new Error(
          `Insufficient stock for product "${item.productId}".`,
        );
      }

      const inventory = await database.inventory.upsert({
        where: {
          productId: item.productId,
        },
        create: {
          productId: item.productId,
          quantityOnHand: product.stock,
          reserved: 0,
        },
        update: {},
        select: {
          id: true,
        },
      });

      const updatedProduct = await database.product.updateMany({
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

      if (updatedProduct.count !== 1) {
        throw new Error(
          `Stock changed while reserving product "${item.productId}".`,
        );
      }

      await database.inventory.update({
        where: {
          id: inventory.id,
        },
        data: {
          reserved: {
            increment: item.quantity,
          },
          version: {
            increment: 1,
          },
        },
      });
    }
  }

  async releaseWithinTransaction(
    database: Prisma.TransactionClient,
    items: InventoryReservationItem[],
  ): Promise<void> {
    for (const item of items) {
      if (!item.productId.trim()) {
        throw new Error("Inventory product id is required.");
      }

      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new Error("Inventory release quantity is invalid.");
      }

      const inventory = await database.inventory.findUnique({
        where: {
          productId: item.productId,
        },
        select: {
          id: true,
        },
      });

      if (!inventory) {
        throw new Error(
          `Inventory record not found for product "${item.productId}".`,
        );
      }

      const updatedInventory = await database.inventory.updateMany({
        where: {
          id: inventory.id,
          reserved: {
            gte: item.quantity,
          },
        },
        data: {
          reserved: {
            decrement: item.quantity,
          },
          version: {
            increment: 1,
          },
        },
      });

      if (updatedInventory.count !== 1) {
        throw new Error(
          `Inventory reservation could not be released for product "${item.productId}".`,
        );
      }

      await database.product.update({
        where: {
          id: item.productId,
        },
        data: {
          stock: {
            increment: item.quantity,
          },
        },
      });
    }
  }
}

export const inventoryService = new InventoryService();
