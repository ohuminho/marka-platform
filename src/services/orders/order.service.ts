import { prisma } from "@/database/client/prisma";

export class OrderService {
  async createOrder(
    userId: string,
    items: {
      productId: string;
      quantity: number;
    }[]
  ) {
    return prisma.order.create({
      data: {
        userId,
        items: {
          create: items,
        },
      },
      include: {
        items: true,
      },
    });
  }
}
