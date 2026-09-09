import { prisma } from "@/database/client/prisma";

export class ProductService {
  async createProduct(
    storeId: string,
    name: string,
    price: number,
    description?: string
  ) {
    return prisma.product.create({
      data: {
        storeId,
        name,
        price,
        description,
      },
    });
  }
}
