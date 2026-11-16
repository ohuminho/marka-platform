import { prisma } from "@/database/client/prisma";

export class ProductService {
  async createProduct(
    ownerId: string,
    storeId: string,
    name: string,
    price: number,
    description?: string,
    stock = 0,
    currency = "AOA",
    image?: string,
  ) {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        status: true,
        vendor: {
          select: {
            ownerId: true,
            status: true,
          },
        },
      },
    });

    if (!store) {
      throw new Error("Store not found.");
    }

    if (store.vendor.ownerId !== ownerId) {
      throw new Error("You do not own this store.");
    }

    if (!Number.isInteger(stock) || stock < 0 || stock > 1_000_000) {
      throw new Error("Product stock must be a non-negative integer.");
    }

    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new Error("Product currency must be a valid ISO 4217 code.");
    }

    const sku = `MARKA-${crypto
      .randomUUID()
      .split("-")[0]
      .toUpperCase()}`;

    const publishable =
      store.status === "ACTIVE" &&
      store.vendor.status === "ACTIVE" &&
      stock > 0;

    return prisma.product.create({
      data: {
        storeId,
        name: name.trim(),
        price: price.toFixed(4),
        description: description?.trim() || undefined,
        image: image?.trim() || undefined,
        currency,
        sku,
        stock,
        status: publishable ? "ACTIVE" : "DRAFT",
        inventory: {
          create: {
            quantityOnHand: stock,
            reserved: 0,
            reorderLevel: 0,
          },
        },
      },
    });
  }

  async getProductsByStore(
    storeId: string
  ) {
    return prisma.product.findMany({
      where: {
        storeId,
      },
      include: {
        category: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async getProduct(
    productId: string
  ) {
    return prisma.product.findUnique({
      where: {
        id: productId,
      },
      include: {
        category: true,
        store: true,
      },
    });
  }

  async updateProduct(
    productId: string,
    data: {
      name?: string;
      description?: string;
      price?: number;
      image?: string;
    }
  ) {
    return prisma.product.update({
      where: {
        id: productId,
      },
      data,
    });
  }

  async updateStock(
    productId: string,
    quantity: number
  ) {
    return prisma.product.update({
      where: {
        id: productId,
      },
      data: {
        stock: {
          increment: quantity,
        },
      },
    });
  }

  async disableProduct(
    productId: string
  ) {
    return prisma.product.update({
      where: {
        id: productId,
      },
      data: {
        status: "DISABLED",
      },
    });
  }
}
