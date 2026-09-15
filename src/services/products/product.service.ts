import { prisma } from "@/database/client/prisma";

export class ProductService {
  async createProduct(
    ownerId: string,
    storeId: string,
    name: string,
    price: number,
    description?: string
  ) {
    const store = await prisma.store.findUnique({
      where: {
        id: storeId,
      },
      select: {
        id: true,
        vendor: {
          select: {
            ownerId: true,
            organizationId: true,
          },
        },
      },
    });

    if (!store) {
      throw new Error("Store not found.");
    }

    if (store.vendor.ownerId !== ownerId) {
      throw new Error(
        "You do not own this store."
      );
    }

    const sku =
      `MARKA-${crypto
        .randomUUID()
        .split("-")[0]
        .toUpperCase()}`;

    return prisma.product.create({
      data: {
        storeId,
        name: name.trim(),
        price,
        description: description?.trim() || undefined,
        sku,
        stock: 0,
        status: "ACTIVE",
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
