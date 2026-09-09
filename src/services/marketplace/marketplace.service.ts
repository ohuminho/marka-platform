import { prisma } from "@/database/client/prisma";

export class MarketplaceService {
  async getProducts() {
    return prisma.product.findMany({
      include: {
        store: true,
        category: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }
}
