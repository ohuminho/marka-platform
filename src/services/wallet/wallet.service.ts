import { prisma } from "@/database/client/prisma";

export class WalletService {
  async createWallet(userId: string) {
    return prisma.wallet.create({
      data: {
        userId,
      },
    });
  }

  async getWallet(userId: string) {
    return prisma.wallet.findUnique({
      where: {
        userId,
      },
      include: {
        transactions: true,
      },
    });
  }
}
